-- Azure SQL Database DDL for Fashion App User Management
CREATE TABLE [user] (
    email NVARCHAR(255) PRIMARY KEY,
    password NVARCHAR(255) NOT NULL,
    age INT,
    gender NVARCHAR(50),
    hair_color NVARCHAR(50),
    skin_tone NVARCHAR(50),
    location NVARCHAR(100),
    failed_login_attempts INT DEFAULT 0,
    account_locked BIT DEFAULT 0,
    locked_until DATETIME2,
    reset_token NVARCHAR(255),
    reset_token_expires DATETIME2,
    created_date DATETIME2 DEFAULT GETDATE(),
    last_login DATETIME2
);