require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the "public" folder
app.use(express.static('public'));

//////////////////////////////////////
//ROUTES TO SERVE HTML FILES
//////////////////////////////////////
// Default route to serve logon.html
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/logon.html');
});

// Route to serve dashboard.html
app.get('/dashboard', (req, res) => {
    res.sendFile(__dirname + '/public/dashboard.html');
});
//////////////////////////////////////
//END ROUTES TO SERVE HTML FILES
//////////////////////////////////////


/////////////////////////////////////////////////
//HELPER FUNCTIONS AND AUTHENTICATION MIDDLEWARE
/////////////////////////////////////////////////
// Helper function to create a SQL Server connection pool
const config = {
    server: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    options: {
        encrypt: true, // Required for Azure SQL
        trustServerCertificate: false
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let poolPromise = null;
let connectionError = null;

async function initializeDatabase() {
    try {
        const pool = await new sql.ConnectionPool(config).connect();
        console.log('Connected to Azure SQL Database');
        poolPromise = pool;
        return pool;
    } catch (err) {
        console.log('Database Connection Failed!', err.message);
        connectionError = err;
        poolPromise = null;
        throw err;
    }
}

// Initialize database connection
initializeDatabase().catch(err => {
    console.error('Failed to initialize database connection on startup');
});

async function getConnection() {
    if (poolPromise) {
        return poolPromise;
    }
    if (connectionError) {
        throw new Error('Database connection not available: ' + connectionError.message);
    }
    // Try to reconnect
    return await initializeDatabase();
}

// Email configuration
function createEmailTransporter() {
    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.log('Email credentials not configured. Emails will not be sent.');
        return null;
    }
    
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });
}

// Helper function to send email
async function sendEmail(to, subject, htmlContent) {
    const transporter = createEmailTransporter();
    
    if (!transporter) {
        console.log('Email not sent - no transporter configured');
        return false;
    }
    
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: to,
            subject: subject,
            html: htmlContent
        };
        
        await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${to}`);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
}

// **Authorization Middleware: Verify JWT Token and Check User in Database**
async function authenticateToken(req, res, next) {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token.' });
        }

        try {
            const pool = await getConnection();

            // Query the database to verify that the email is associated with an active account
            const result = await pool.request()
                .input('email', sql.NVarChar, decoded.email)
                .query('SELECT email FROM [user] WHERE email = @email');

            if (result.recordset.length === 0) {
                return res.status(403).json({ message: 'Account not found or deactivated.' });
            }

            req.user = decoded;  // Save the decoded email for use in the route
            next();  // Proceed to the next middleware or route handler
        } catch (dbError) {
            console.error(dbError);
            res.status(500).json({ message: 'Database error during authentication.' });
        }
    });
}
/////////////////////////////////////////////////
//END HELPER FUNCTIONS AND AUTHENTICATION MIDDLEWARE
/////////////////////////////////////////////////


//////////////////////////////////////
//ROUTES TO HANDLE API REQUESTS
//////////////////////////////////////
// Route: Create Account with Profile Information
app.post('/api/create-account', async (req, res) => {
    const { email, password, age, gender, hairColor, skinTone, location } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        const pool = await getConnection();
        const hashedPassword = await bcrypt.hash(password, 10);  // Hash password

        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .input('password', sql.NVarChar, hashedPassword)
            .input('age', sql.NVarChar, age || null)
            .input('gender', sql.NVarChar, gender || null)
            .input('hair_color', sql.NVarChar, hairColor || null)
            .input('skin_tone', sql.NVarChar, skinTone || null)
            .input('location', sql.NVarChar, location || null)
            .query(`INSERT INTO [user] (email, password, age, gender, hair_color, skin_tone, location) 
                    VALUES (@email, @password, @age, @gender, @hair_color, @skin_tone, @location)`);

        res.status(201).json({ message: 'Account created successfully!' });
    } catch (error) {
        console.error('Create account error details:', {
            message: error.message,
            number: error.number,
            code: error.code,
            state: error.state,
            class: error.class,
            lineNumber: error.lineNumber,
            serverName: error.serverName,
            procName: error.procName,
            originalError: error.originalError
        });
        
        if (error.number === 2627) { // SQL Server duplicate key error
            res.status(409).json({ message: 'An account with this email already exists.' });
        } else {
            console.error(error);
            res.status(500).json({ message: 'Error creating account.' });
        }
    }
});

// Route: Login with Account Locking
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        const pool = await getConnection();

        // Check if account exists and get user info
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query(`SELECT email, password, failed_login_attempts, account_locked, locked_until 
                    FROM [user] WHERE email = @email`);

        if (result.recordset.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const user = result.recordset[0];

        // Check if account is locked
        if (user.account_locked) {
            const now = new Date();
            const lockedUntil = new Date(user.locked_until);
            
            if (now < lockedUntil) {
                const timeLeft = Math.ceil((lockedUntil - now) / (1000 * 60)); // minutes
                return res.status(423).json({ 
                    message: `Account is locked. Try again in ${timeLeft} minutes.`,
                    lockTimeLeft: timeLeft
                });
            } else {
                // Unlock account if lock period has expired
                await pool.request()
                    .input('email', sql.NVarChar, email)
                    .query(`UPDATE [user] SET account_locked = 0, failed_login_attempts = 0, locked_until = NULL 
                            WHERE email = @email`);
            }
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            // Increment failed attempts
            const newFailedAttempts = (user.failed_login_attempts || 0) + 1;
            
            if (newFailedAttempts >= 3) {
                // Lock account for 30 minutes
                const lockUntil = new Date(Date.now() + 30 * 60 * 1000);
                await pool.request()
                    .input('email', sql.NVarChar, email)
                    .input('lockUntil', sql.DateTime2, lockUntil)
                    .query(`UPDATE [user] SET failed_login_attempts = 3, account_locked = 1, locked_until = @lockUntil 
                            WHERE email = @email`);
                
                return res.status(423).json({ 
                    message: 'Account locked due to too many failed attempts. Try again in 30 minutes.',
                    lockTimeLeft: 30
                });
            } else {
                // Just increment failed attempts
                await pool.request()
                    .input('email', sql.NVarChar, email)
                    .input('attempts', sql.Int, newFailedAttempts)
                    .query(`UPDATE [user] SET failed_login_attempts = @attempts WHERE email = @email`);
                
                const remainingAttempts = 3 - newFailedAttempts;
                return res.status(401).json({ 
                    message: `Invalid email or password. ${remainingAttempts} attempts remaining.`,
                    attemptsRemaining: remainingAttempts
                });
            }
        }

        // Successful login - reset failed attempts and update last login
        await pool.request()
            .input('email', sql.NVarChar, email)
            .input('now', sql.DateTime2, new Date())
            .query(`UPDATE [user] SET failed_login_attempts = 0, last_login = @now WHERE email = @email`);

        const token = jwt.sign(
            { email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error logging in.' });
    }
});

// Route: Password Reset Request
app.post('/api/reset-password-request', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required.' });
    }

    try {
        const pool = await getConnection();

        // Check if user exists
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT email FROM [user] WHERE email = @email');

        if (result.recordset.length === 0) {
            // For security, don't reveal if email exists
            return res.status(200).json({ message: 'If the email exists, a reset link will be sent.' });
        }

        // Generate reset token (in production, use crypto.randomBytes)
        const resetToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
        const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Store reset token
        await pool.request()
            .input('email', sql.NVarChar, email)
            .input('token', sql.NVarChar, resetToken)
            .input('expires', sql.DateTime2, resetExpires)
            .query(`UPDATE [user] SET reset_token = @token, reset_token_expires = @expires 
                    WHERE email = @email`);

        // Send password reset email
        const resetLink = `http://localhost:${port}/reset-password.html?token=${resetToken}`;
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Password Reset Request</h2>
                <p>You requested to reset your password for your Fashionistas account.</p>
                <p>Click the button below to reset your password. This link will expire in 15 minutes.</p>
                <div style="margin: 30px 0;">
                    <a href="${resetLink}" 
                       style="background-color: #ff69b4; color: white; padding: 12px 30px; 
                              text-decoration: none; border-radius: 5px; display: inline-block;">
                        Reset Password
                    </a>
                </div>
                <p style="color: #666; font-size: 14px;">
                    If you didn't request this, you can safely ignore this email.
                </p>
                <p style="color: #666; font-size: 14px;">
                    Or copy and paste this link: <br>
                    <a href="${resetLink}">${resetLink}</a>
                </p>
            </div>
        `;
        
        // Try to send email
        const emailSent = await sendEmail(email, 'Password Reset - Fashionitas', emailHtml);
        
        // Log for development
        console.log(`Password reset token for ${email}: ${resetToken}`);
        
        // Build response
        const response = { 
            message: 'If the email exists, a reset link will be sent.'
        };
        
        // In development, include token if email wasn't sent
        if (!emailSent) {
            response.developmentToken = resetToken;
            response.developmentLink = resetLink;
        }
        
        res.status(200).json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error processing password reset request.' });
    }
});

// Route: Reset Password with Token
app.post('/api/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token and new password are required.' });
    }

    try {
        const pool = await getConnection();

        // Find user with valid reset token
        const result = await pool.request()
            .input('token', sql.NVarChar, token)
            .input('now', sql.DateTime2, new Date())
            .query(`SELECT email FROM [user] 
                    WHERE reset_token = @token AND reset_token_expires > @now`);

        if (result.recordset.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired reset token.' });
        }

        const user = result.recordset[0];
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password and clear reset token
        await pool.request()
            .input('email', sql.NVarChar, user.email)
            .input('password', sql.NVarChar, hashedPassword)
            .query(`UPDATE [user] 
                    SET password = @password, reset_token = NULL, reset_token_expires = NULL,
                        failed_login_attempts = 0, account_locked = 0, locked_until = NULL
                    WHERE email = @email`);

        res.status(200).json({ message: 'Password reset successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error resetting password.' });
    }
});

// Route: Get Current User's Profile
app.get('/api/user-profile', authenticateToken, async (req, res) => {
    try {
        const pool = await getConnection();

        const result = await pool.request()
            .input('email', sql.NVarChar, req.user.email)
            .query(`SELECT age, gender, hair_color, skin_tone, location, created_date, last_login 
                    FROM [user] WHERE email = @email`);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'User profile not found.' });
        }

        const profile = result.recordset[0];
        res.status(200).json({ profile });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error retrieving user profile.' });
    }
});

// Route: Get All Email Addresses
app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        const pool = await getConnection();

        const result = await pool.request()
            .query('SELECT email FROM [user]');

        const emailList = result.recordset.map((row) => row.email);
        res.status(200).json({ emails: emailList });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error retrieving email addresses.' });
    }
});
//////////////////////////////////////
//END ROUTES TO HANDLE API REQUESTS
//////////////////////////////////////


// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});