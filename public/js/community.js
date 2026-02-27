// COMMUNITY.JS - Fashion Community and Social Features

document.addEventListener('DOMContentLoaded', function() {
    console.log('Fashion Community page loaded');
    
    // Set up reaction button handlers
    const reactionBtns = document.querySelectorAll('.reaction-btn');
    reactionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            console.log(`Reaction clicked: ${btn.textContent}`);
            // Future: Handle reactions (like, comment, save)
        });
    });
    
    // Set up follow button handlers
    const followBtns = document.querySelectorAll('.follow-btn');
    followBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const isFollowing = btn.textContent === 'Following';
            btn.textContent = isFollowing ? 'Follow' : 'Following';
            btn.classList.toggle('following', !isFollowing);
            console.log(`${isFollowing ? 'Unfollowed' : 'Followed'} user`);
            // Future: Handle follow/unfollow API calls
        });
    });
    
    // Set up challenge participation
    const challengeItems = document.querySelectorAll('.challenge-item');
    challengeItems.forEach(item => {
        item.addEventListener('click', () => {
            console.log(`Clicked challenge: ${item.querySelector('h3').textContent}`);
            // Future: Open challenge details
        });
    });
});