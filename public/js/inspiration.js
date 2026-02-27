// INSPIRATION.JS - Style Inspiration and Mood Boards

document.addEventListener('DOMContentLoaded', function() {
    console.log('Style Inspiration page loaded');
    
    // Set up style filter buttons
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            filterBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');
            
            const filter = btn.dataset.filter;
            console.log(`Filtering inspiration by: ${filter}`);
            
            // Show/hide inspiration cards based on filter
            const cards = document.querySelectorAll('.inspiration-card');
            cards.forEach(card => {
                if (filter === 'all' || card.dataset.style === filter) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
    
    // Set up inspiration card click handlers
    const inspirationCards = document.querySelectorAll('.inspiration-card');
    inspirationCards.forEach(card => {
        card.addEventListener('click', () => {
            console.log(`Viewing inspiration: ${card.dataset.style}`);
            // Future: Open inspiration details or save to mood board
        });
    });
});