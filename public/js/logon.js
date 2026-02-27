// Tab switching and form elements
const loginTab = document.getElementById('login-tab');
const createAccountTab = document.getElementById('create-account-tab');
const logonForm = document.getElementById('logon-form');
const createAccountForm = document.getElementById('create-account-form');
const resetPasswordForm = document.getElementById('reset-password-form');
const messageEl = document.getElementById('message');

// Password reset elements
const forgotPasswordBtn = document.getElementById('forgot-password-btn');
const backToLoginBtn = document.getElementById('back-to-login-btn');

// Tab switching functions
function showLoginForm() {
    logonForm.classList.add('active-form');
    createAccountForm.classList.remove('active-form');
    resetPasswordForm.style.display = 'none';
    loginTab.classList.add('active');
    createAccountTab.classList.remove('active');
    clearMessage();
}

function showSignupForm() {
    createAccountForm.classList.add('active-form');
    logonForm.classList.remove('active-form');
    resetPasswordForm.style.display = 'none';
    createAccountTab.classList.add('active');
    loginTab.classList.remove('active');
    clearMessage();
}

function showResetForm() {
    resetPasswordForm.style.display = 'block';
    logonForm.classList.remove('active-form');
    createAccountForm.classList.remove('active-form');
    loginTab.classList.remove('active');
    createAccountTab.classList.remove('active');
    clearMessage();
}

function clearMessage() {
    messageEl.textContent = '';
    messageEl.className = 'message';
}

// Event listeners for tab switching
loginTab.addEventListener('click', showLoginForm);
createAccountTab.addEventListener('click', showSignupForm);
forgotPasswordBtn.addEventListener('click', showResetForm);
backToLoginBtn.addEventListener('click', showLoginForm);

// Login form submission with attempt tracking
logonForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const result = await response.json();
        
        if (response.ok) {
            localStorage.setItem('jwtToken', result.token);
            messageEl.textContent = 'Login successful! Redirecting...';
            messageEl.className = 'message success';
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);
        } else {
            let errorMessage = result.message;
            
            // Handle specific error cases
            if (response.status === 423) { // Account locked
                errorMessage = result.message;
                if (result.lockTimeLeft) {
                    errorMessage += ` Please try again in ${result.lockTimeLeft} minutes.`;
                }
            } else if (result.attemptsRemaining) {
                errorMessage = `${result.message} You have ${result.attemptsRemaining} attempts remaining before your account is locked.`;
            }
            
            messageEl.textContent = errorMessage;
            messageEl.className = 'message error';
        }
    } catch (error) {
        console.error('Error:', error);
        messageEl.textContent = 'An error occurred. Please try again later.';
        messageEl.className = 'message error';
    }
});

// Enhanced account creation with profile data
createAccountForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const formData = {
        email: document.getElementById('create-email').value,
        password: document.getElementById('create-password').value,
        age: document.getElementById('age').value,
        gender: document.getElementById('gender').value,
        hairColor: document.getElementById('hair-color').value,
        skinTone: document.getElementById('skin-tone').value,
        location: document.getElementById('location').value
    };

    try {
        const response = await fetch('/api/create-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });

        const result = await response.json();
        
        if (response.ok) {
            messageEl.textContent = 'Account created successfully! You can now log in.';
            messageEl.className = 'message success';
            
            // Pre-fill login form and switch to it
            document.getElementById('login-email').value = formData.email;
            document.getElementById('login-password').value = formData.password;
            
            setTimeout(() => {
                showLoginForm();
            }, 2000);
        } else {
            messageEl.textContent = result.message;
            messageEl.className = 'message error';
        }
    } catch (error) {
        console.error('Error:', error);
        messageEl.textContent = 'An error occurred. Please try again later.';
        messageEl.className = 'message error';
    }
});

// Password reset form submission
resetPasswordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('reset-email').value;

    try {
        const response = await fetch('/api/reset-password-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });

        const result = await response.json();
        
        if (response.ok) {
            messageEl.textContent = result.message;
            messageEl.className = 'message success';
            
            // In development, show the token (remove in production)
            if (result.developmentToken) {
                messageEl.textContent += ` Development reset token: ${result.developmentToken}`;
            }
            
            // Clear form and return to login after delay
            setTimeout(() => {
                document.getElementById('reset-email').value = '';
                showLoginForm();
            }, 5000);
        } else {
            messageEl.textContent = result.message;
            messageEl.className = 'message error';
        }
    } catch (error) {
        console.error('Error:', error);
        messageEl.textContent = 'An error occurred. Please try again later.';
        messageEl.className = 'message error';
    }
});