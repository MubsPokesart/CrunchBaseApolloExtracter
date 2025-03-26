/**
 * Main JavaScript for Crunchbase Data Extractor
 */

// Initialize tooltips and other Bootstrap components
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
    
    // Handle form submission for settings
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', function(event) {
            event.preventDefault();
            updateSettings();
        });
    }
    
    // Handle form submission for file upload
    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', function(event) {
            event.preventDefault();
            processFile();
        });
    }
    
    // Set up download link
    const downloadLink = document.getElementById('download-link');
    if (downloadLink) {
        downloadLink.addEventListener('click', function(event) {
            event.preventDefault();
            window.location.href = '/api/download-results';
        });
    }
});

/**
 * Update settings via API
 */
function updateSettings() {
    // Show loading spinner
    toggleLoading(true);
    
    // Hide any previous errors
    if (document.getElementById('error-alert')) {
        document.getElementById('error-alert').classList.add('d-none');
    }
    
    // Get form data
    const formData = {
        industry_vertical: document.getElementById('industry_vertical').value,
        industry: document.getElementById('industry').value,
        sourcing_analyst: document.getElementById('sourcing_analyst').value,
        investment_cycle: document.getElementById('investment_cycle').value
    };
    
    // Get the button and store original content
    const submitButton = document.querySelector('#settings-form button[type="submit"]');
    const originalButtonHtml = submitButton.innerHTML;
    
    // Update button to show loading state
    submitButton.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Loading...`;
    submitButton.disabled = true;
    
    // Send API request
    fetch('/api/update-settings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            // Show success message
            showToast('Settings updated successfully!', 'success');
        } else {
            // Show error message
            showError(data.message || 'Failed to update settings.');
        }
    })
    .catch(error => {
        console.error('Error updating settings:', error);
        showError('An error occurred: ' + error.message);
    })
    .finally(() => {
        // Restore button state
        submitButton.innerHTML = originalButtonHtml;
        submitButton.disabled = false;
        
        // Hide loading spinner
        toggleLoading(false);
    });
}

/**
 * Process file via API
 */
function processFile() {
    // Show loading spinner
    toggleLoading(true);
    
    // Hide any previous errors and results
    if (document.getElementById('error-alert')) {
        document.getElementById('error-alert').classList.add('d-none');
    }
    if (document.getElementById('results-section')) {
        document.getElementById('results-section').classList.add('d-none');
    }
    
    // Get file
    const fileInput = document.getElementById('file');
    const file = fileInput.files[0];
    
    if (!file) {
        showError('Please select a file to upload.');
        toggleLoading(false);
        return;
    }
    
    // Get the button and store original content
    const submitButton = document.querySelector('#upload-form button[type="submit"]');
    const originalButtonHtml = submitButton.innerHTML;
    
    // Update button to show loading state
    submitButton.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Processing...`;
    submitButton.disabled = true;
    
    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    
    // Send API request
    fetch('/api/process', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            // Display results
            displayResults(data.preview);
            
            // Update download link
            if (document.getElementById('download-link')) {
                document.getElementById('download-link').href = data.download_url;
            }
            
            // Show results section
            if (document.getElementById('results-section')) {
                document.getElementById('results-section').classList.remove('d-none');
                document.getElementById('results-section').scrollIntoView({ behavior: 'smooth' });
            }
        } else {
            // Show error message
            showError(data.message || 'Failed to process file.');
        }
    })
    .catch(error => {
        console.error('Error processing file:', error);
        showError('An error occurred: ' + error.message);
    })
    .finally(() => {
        // Restore button state
        submitButton.innerHTML = originalButtonHtml;
        submitButton.disabled = false;
        
        // Hide loading spinner
        toggleLoading(false);
    });
}

/**
 * Display results in the UI
 */
function displayResults(preview) {
    // Display contacts
    if (document.getElementById('contacts-preview')) {
        displayTable(
            'contacts-preview', 
            preview.contacts, 
            ['Contact Name', 'First Name', 'Last Name', 'Email', 'Company Name', 'Industry']
        );
    }
    
    // Display companies
    if (document.getElementById('companies-preview')) {
        displayTable(
            'companies-preview', 
            preview.companies, 
            ['Company Name', 'Website']
        );
    }
    
    // Display pipelines
    if (document.getElementById('pipelines-preview')) {
        displayTable(
            'pipelines-preview', 
            preview.pipelines, 
            ['Deal Name', 'Company Name', 'Contact Name', 'Sub-Pipeline', 'Stage', 'Industry Vertical']
        );
    }
    
    // Display email templates
    const emailsPreview = document.getElementById('emails-preview');
    if (emailsPreview) {
        emailsPreview.innerHTML = '';
        
        if (preview.email_templates && preview.email_templates.length > 0) {
            preview.email_templates.forEach(template => {
                const card = document.createElement('div');
                card.className = 'card mb-3';
                
                const cardBody = document.createElement('div');
                cardBody.className = 'card-body';
                
                const pre = document.createElement('pre');
                pre.className = 'mb-0';
                pre.textContent = template;
                
                cardBody.appendChild(pre);
                card.appendChild(cardBody);
                emailsPreview.appendChild(card);
            });
        } else {
            emailsPreview.innerHTML = '<div class="alert alert-info">No email templates generated.</div>';
        }
    }
}

/**
 * Create a table to display data
 */
function displayTable(elementId, data, columns) {
    const container = document.getElementById(elementId);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (data && data.length > 0) {
        const table = document.createElement('table');
        table.className = 'table table-striped table-hover';
        
        // Create header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        columns.forEach(column => {
            const th = document.createElement('th');
            th.textContent = column;
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create body
        const tbody = document.createElement('tbody');
        
        data.forEach(item => {
            const row = document.createElement('tr');
            
            columns.forEach(column => {
                const td = document.createElement('td');
                td.textContent = item[column] || '';
                row.appendChild(td);
            });
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        container.appendChild(table);
    } else {
        container.innerHTML = '<div class="alert alert-info">No data available.</div>';
    }
}

/**
 * Show error message
 */
function showError(message) {
    const errorAlert = document.getElementById('error-alert');
    const errorMessage = document.getElementById('error-message');
    
    if (errorAlert && errorMessage) {
        errorMessage.textContent = message;
        errorAlert.classList.remove('d-none');
        errorAlert.scrollIntoView({ behavior: 'smooth' });
    } else {
        // Fallback to alert if elements don't exist
        alert(message);
    }
}

/**
 * Toggle loading spinner
 */
function toggleLoading(show) {
    const loadingSpinner = document.getElementById('loading-spinner');
    if (loadingSpinner) {
        if (show) {
            loadingSpinner.classList.remove('d-none');
        } else {
            loadingSpinner.classList.add('d-none');
        }
    }
}

/**
 * Display toast notification
 */
function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '1050';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast
    const toastId = 'toast-' + Date.now();
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    // Create toast content
    const toastContent = document.createElement('div');
    toastContent.className = 'd-flex';
    
    const toastBody = document.createElement('div');
    toastBody.className = 'toast-body';
    toastBody.textContent = message;
    
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'btn-close btn-close-white me-2 m-auto';
    closeButton.setAttribute('data-bs-dismiss', 'toast');
    closeButton.setAttribute('aria-label', 'Close');
    
    toastContent.appendChild(toastBody);
    toastContent.appendChild(closeButton);
    toast.appendChild(toastContent);
    
    // Add toast to container
    toastContainer.appendChild(toast);
    
    // Initialize toast manually if Bootstrap is available
    if (typeof bootstrap !== 'undefined') {
        const bsToast = new bootstrap.Toast(toast, {
            autohide: true,
            delay: 3000
        });
        
        // Show toast
        bsToast.show();
    } else {
        // Manual implementation if Bootstrap is not available
        toast.style.display = 'block';
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
    
    // Remove toast after it's hidden
    toast.addEventListener('hidden.bs.toast', function() {
        toast.remove();
    });
}

/**
 * Format JSON data as a readable string
 */
function formatJson(data) {
    return JSON.stringify(data, null, 2)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Copy text to clipboard
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