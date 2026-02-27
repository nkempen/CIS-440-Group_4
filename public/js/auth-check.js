// AUTH-CHECK.JS - JWT Token Validation for All Internal Pages
// This script is included in all protected pages to ensure user authentication

(function() {
    'use strict';

    // Check for JWT token when any internal page loads
    function checkAuthentication() {
        const token = localStorage.getItem('jwtToken');
        
        if (!token) {
            // No token found - redirect to login
            console.log('No JWT token found, redirecting to login...');
            window.location.href = '/logon.html';
            return false;
        }
        
        // Validate token format (basic check)
        if (!isValidTokenFormat(token)) {
            console.log('Invalid token format, clearing and redirecting...');
            localStorage.removeItem('jwtToken');
            window.location.href = '/logon.html';
            return false;
        }
        
        // Check if token is expired
        if (isTokenExpired(token)) {
            console.log('Token expired, clearing and redirecting...');
            localStorage.removeItem('jwtToken');
            window.location.href = '/logon.html';
            return false;
        }
        
        // Token is valid
        console.log('JWT token validated successfully');
        return true;
    }
    
    function isValidTokenFormat(token) {
        // JWT tokens have 3 parts separated by dots
        const parts = token.split('.');
        return parts.length === 3;
    }
    
    function isTokenExpired(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Date.now() / 1000; // Convert to seconds
            
            // Check if token has expiration and if it's expired
            if (payload.exp && payload.exp < currentTime) {
                return true; // Token is expired
            }
            
            return false; // Token is still valid
        } catch (error) {
            console.error('Error parsing token:', error);
            return true; // Treat parsing errors as expired
        }
    }
    
    function setupLogoutButton() {
        const logoutBtn = document.getElementById('logoutButton');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                // Clear the token and redirect to login
                localStorage.removeItem('jwtToken');
                window.location.href = '/logon.html';
            });
        }
    }
    
    function makeAuthenticatedRequest(url, options = {}) {
        const token = localStorage.getItem('jwtToken');
        
        if (!token) {
            return Promise.reject('No authentication token available');
        }
        
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': token,
            ...options.headers
        };
        
        return fetch(url, {
            ...options,
            headers
        }).then(response => {
            // Check if the request failed due to authentication
            if (response.status === 401 || response.status === 403) {
                console.log('Authentication failed, clearing token and redirecting...');
                localStorage.removeItem('jwtToken');
                window.location.href = '/logon.html';
                throw new Error('Authentication failed');
            }
            
            return response;
        });
    }
    
    // Expose the authenticated request function globally
    window.makeAuthenticatedRequest = makeAuthenticatedRequest;
    
    // Run authentication check when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        if (checkAuthentication()) {
            setupLogoutButton();
            
            // Set up periodic token validation (every 5 minutes)
            setInterval(function() {
                checkAuthentication();
            }, 5 * 60 * 1000); // 5 minutes
        }
    });
    
    // Also check authentication immediately when script loads
    if (document.readyState === 'loading') {
        // DOM is still loading
        document.addEventListener('DOMContentLoaded', checkAuthentication);
    } else {
        // DOM already loaded
        checkAuthentication();
    }
    
})();