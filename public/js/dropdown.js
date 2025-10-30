console.log('✅ dropdown.js is loading!');

function setupDropdown() {
    console.log('🔧 Setting up dropdown...');
    
    const userMenu = document.querySelector('.user-menu');
    console.log('User menu found:', userMenu);
    
    if (userMenu) {
        const userToggle = userMenu.querySelector('.user-toggle');
        const dropdown = userMenu.querySelector('.user-dropdown');
        
        console.log('Toggle found:', userToggle);
        console.log('Dropdown found:', dropdown);

        // Make sure dropdown is hidden initially
        dropdown.style.display = 'none';

        // Toggle dropdown on click
        userToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🎯 Toggle clicked! Current display:', dropdown.style.display);
            
            const isVisible = dropdown.style.display === 'block';
            dropdown.style.display = isVisible ? 'none' : 'block';
            console.log('🔄 New display:', dropdown.style.display);
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!userMenu.contains(e.target)) {
                console.log('🚫 Clicked outside, closing dropdown');
                dropdown.style.display = 'none';
            }
        });

        // Close on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                console.log('⌨️ Escape pressed, closing dropdown');
                dropdown.style.display = 'none';
            }
        });

        // Keep dropdown open when clicking inside it
        dropdown.addEventListener('click', function(e) {
            e.stopPropagation();
            console.log('📦 Clicked inside dropdown, keeping open');
        });

        console.log('✅ Dropdown event listeners attached successfully!');
    } else {
        console.log('❌ User menu not found - user might not be logged in');
    }
}

// Wait for DOM to be fully ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupDropdown);
} else {
    // DOM is already ready
    setTimeout(setupDropdown, 100); // Small delay to ensure everything is loaded
}