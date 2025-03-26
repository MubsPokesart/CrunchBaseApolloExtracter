/**
 * Main JavaScript for Crunchbase Data Extractor
 */

// Initialize tooltips
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    const tooltipList = tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Initialize popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    const popoverList = popoverTriggerList.map(function(popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
    
    // Add file name display
    const fileInput = document.getElementById('file');
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            const fileName = this.files[0]?.name || 'No file chosen';
            const fileLabel = document.querySelector('.form-label[for="file"]');
            
            // Create or update file name display
            let fileNameDisplay = document.getElementById('file-name-display');
            if (!fileNameDisplay) {
                fileNameDisplay = document.createElement('div');
                fileNameDisplay.id = 'file-name-display';
                fileNameDisplay.className = 'form-text mt-1';
                this.parentNode.appendChild(fileNameDisplay);
            }
            
            fileNameDisplay.textContent = `Selected file: ${fileName}`;
        });
    }
    
    // Add loading indicator to buttons on click
    const buttons = document.querySelectorAll('button[type="submit"]');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            const originalHtml = this.innerHTML;
            
            // Don't add if form is invalid
            const form = this.closest('form');
            if (form && !form.checkValidity()) {
                return;
            }
            
            this.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Loading...`;
            this.disabled = true;
            
            // Reset button after 10 seconds (fallback)
            setTimeout(() => {
                this.innerHTML = originalHtml;
                this.disabled = false;
            }, 10000);
        });
    });
});

/**
 * Format JSON data as a readable string
 * @param {Object} data - JSON object to format
 * @returns {string} - Formatted JSON string
 */
function formatJson(data) {
    return JSON.stringify(data, null, 2)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<void>}
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Failed to copy text: ', err);
        return false;
    }
}