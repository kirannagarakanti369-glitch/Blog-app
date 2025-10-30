// Dropdown functionality
document.addEventListener('DOMContentLoaded', function() {
    const userMenu = document.querySelector('.user-menu');
    if (userMenu) {
        const userToggle = userMenu.querySelector('.user-toggle');
        const dropdown = userMenu.querySelector('.user-dropdown');
        
        userToggle.addEventListener('click', function(e) {
            e.preventDefault();
            const isVisible = dropdown.style.display === 'block';
            dropdown.style.display = isVisible ? 'none' : 'block';
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!userMenu.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });

        // Close dropdown on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                dropdown.style.display = 'none';
            }
        });
    }
});