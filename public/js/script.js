// Client-side JavaScript for enhanced functionality
document.addEventListener('DOMContentLoaded', function() {
    // Image preview for file inputs
    const imageInputs = document.querySelectorAll('input[type="file"][accept="image/*"]');
    
    imageInputs.forEach(input => {
        input.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    // Remove existing preview if any
                    const existingPreview = input.parentNode.querySelector('.image-preview');
                    if (existingPreview) {
                        existingPreview.remove();
                    }
                    
                    // Create new preview
                    const preview = document.createElement('div');
                    preview.className = 'image-preview';
                    preview.innerHTML = `
                        <p>Image Preview:</p>
                        <img src="${e.target.result}" alt="Preview" style="max-width: 200px; border-radius: 8px; margin-top: 0.5rem;">
                    `;
                    input.parentNode.appendChild(preview);
                };
                reader.readAsDataURL(file);
            }
        });
    });
    
    // Auto-resize textareas
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
        
        // Trigger initial resize
        textarea.dispatchEvent(new Event('input'));
    });
    
    // Smooth scrolling for post content
    const postContent = document.querySelector('.post-content');
    if (postContent) {
        // Add scroll indicators
        const style = document.createElement('style');
        style.textContent = `
            .post-content {
                position: relative;
            }
            .post-content::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 20px;
                background: linear-gradient(to bottom, rgba(45,45,45,1), rgba(45,45,45,0));
                pointer-events: none;
                z-index: 1;
            }
            .post-content::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 20px;
                background: linear-gradient(to top, rgba(45,45,45,1), rgba(45,45,45,0));
                pointer-events: none;
                z-index: 1;
            }
        `;
        document.head.appendChild(style);
    }
});