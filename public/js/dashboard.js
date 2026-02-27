////////////////////////////////////////////////////////////////
//DASHBOARD.JS - FASHIONISTAS FASHION APP
//THIS IS YOUR "CONTROLLER", IT ACTS AS THE MIDDLEMAN
// BETWEEN THE MODEL (datamodel.js) AND THE VIEW (dashboard.html)
////////////////////////////////////////////////////////////////

//ADD ALL EVENT LISTENERS INSIDE DOMCONTENTLOADED
document.addEventListener('DOMContentLoaded', () => {
    
    //////////////////////////////////////////
    //ELEMENTS TO ATTACH EVENT LISTENERS
    //////////////////////////////////////////
    const logoutButton = document.getElementById('logoutButton');
    const refreshButton = document.getElementById('refreshButton');
    //////////////////////////////////////////
    //END ELEMENTS TO ATTACH EVENT LISTENERS
    //////////////////////////////////////////


    //////////////////////////////////////////
    //EVENT LISTENERS
    //////////////////////////////////////////
    // Log out and redirect to login
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('jwtToken');
        window.location.href = '/';
    });

    // Refresh data when the button is clicked
    refreshButton.addEventListener('click', async () => {
        await loadDashboardData();
    });
    //////////////////////////////////////////
    //END EVENT LISTENERS
    //////////////////////////////////////////


    //////////////////////////////////////////////////////
    //CODE THAT NEEDS TO RUN IMMEDIATELY AFTER PAGE LOADS
    //////////////////////////////////////////////////////
    // Initial check for the token and load data
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        window.location.href = '/';
    } else {
        DataModel.setToken(token);
        loadDashboardData();
        
        // Extract user email from JWT token for welcome message
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const userEmail = payload.email;
            const userName = userEmail.split('@')[0]; // Use part before @ as name
            document.getElementById('userWelcome').textContent = `Welcome, ${userName}!`;
        } catch (error) {
            console.error('Error parsing JWT token:', error);
        }
    }
    //////////////////////////////////////////
    //END CODE THAT NEEDS TO RUN IMMEDIATELY AFTER PAGE LOADS
    //////////////////////////////////////////
});
//END OF DOMCONTENTLOADED


//////////////////////////////////////////
//FUNCTIONS TO MANIPULATE THE DOM
//////////////////////////////////////////

// Load all dashboard data
async function loadDashboardData() {
    await Promise.all([
        renderUserProfile(),
        renderUserList()
    ]);
}

// Render user profile information
async function renderUserProfile() {
    const profileElement = document.getElementById('userProfile');
    profileElement.innerHTML = '<div class="loading-message">Loading your profile...</div>';
    
    try {
        const userProfile = await DataModel.getUserProfile();
        
        if (userProfile && Object.keys(userProfile).length > 0) {
            let profileHTML = '';
            
            if (userProfile.age) {
                profileHTML += `<div class="profile-item"><span class="profile-label">Age:</span><span class="profile-value">${userProfile.age}</span></div>`;
            }
            if (userProfile.gender) {
                profileHTML += `<div class="profile-item"><span class="profile-label">Gender:</span><span class="profile-value">${userProfile.gender}</span></div>`;
            }
            if (userProfile.hair_color) {
                profileHTML += `<div class="profile-item"><span class="profile-label">Hair Color:</span><span class="profile-value">${userProfile.hair_color}</span></div>`;
            }
            if (userProfile.skin_tone) {
                profileHTML += `<div class="profile-item"><span class="profile-label">Skin Tone:</span><span class="profile-value">${userProfile.skin_tone}</span></div>`;
            }
            if (userProfile.location) {
                profileHTML += `<div class="profile-item"><span class="profile-label">Location:</span><span class="profile-value">${userProfile.location}</span></div>`;
            }
            
            if (!profileHTML) {
                profileHTML = '<p>Complete your profile to get personalized style recommendations!</p>';
            }
            
            profileElement.innerHTML = profileHTML;
        } else {
            profileElement.innerHTML = '<p>Complete your profile to get personalized style recommendations!</p>';
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
        profileElement.innerHTML = '<p class="error">Error loading profile. Please try again.</p>';
    }
}

// Enhanced user list rendering for community
async function renderUserList() {
    const userListElement = document.getElementById('userList');
    userListElement.innerHTML = '<div class="loading-message">Loading community members...</div>';
    
    try {
        const users = await DataModel.getUsers();
        
        if (users && users.length > 0) {
            userListElement.innerHTML = '';
            
            users.forEach(userEmail => {
                const userItem = document.createElement('div');
                userItem.classList.add('user-item');
                
                // Create user avatar with first letter of email
                const avatar = document.createElement('div');
                avatar.classList.add('user-avatar');
                avatar.textContent = userEmail.charAt(0).toUpperCase();
                
                // Create user info
                const userInfo = document.createElement('div');
                const userName = userEmail.split('@')[0]; // Use part before @ as display name
                userInfo.textContent = userName;
                
                userItem.appendChild(avatar);
                userItem.appendChild(userInfo);
                userListElement.appendChild(userItem);
            });
        } else {
            userListElement.innerHTML = '<p>No community members found. Be the first to join!</p>';
        }
    } catch (error) {
        console.error('Error loading community list:', error);
        userListElement.innerHTML = '<p class="error">Error loading community. Please try again.</p>';
    }
}
//////////////////////////////////////////
//END FUNCTIONS TO MANIPULATE THE DOM
//////////////////////////////////////////