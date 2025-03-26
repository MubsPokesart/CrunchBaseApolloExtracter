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
    
    // Undo last result button
    const removeLastBtn = document.getElementById('remove-last-btn');
    if (removeLastBtn) {
        removeLastBtn.addEventListener('click', function() {
            // Show loading spinner
            toggleLoading(true);
            
            fetch('/api/remove-last-result', {
                method: 'POST'
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    
                    // Show success toast
                    showToast('Last processed result removed successfully!', 'success');
                    
                    // Reload the page to update results
                    location.reload();
                } else {
                    // Show error
                    showError(data.message || 'Failed to remove last result.');
                }
            })
            .catch(error => {
                showError('An error occurred: ' + error);
            })
            .finally(() => {
                // Hide loading spinner
                toggleLoading(false);
            });
        });
    }
    
    // Reset all results button
    const resetResultsBtn = document.getElementById('reset-results-btn');
    if (resetResultsBtn) {
        resetResultsBtn.addEventListener('click', function() {
            // Show confirmation dialog
            if (confirm('Are you sure you want to clear all processed results? This cannot be undone.')) {
                // Show loading spinner
                toggleLoading(true);
                
                fetch('/api/reset-results', {
                    method: 'POST'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        // Show success toast
                        showToast('All processed results have been cleared!', 'success');
                        
                        // Reload the page to update results
                        location.reload();
                    } else {
                        // Show error
                        showError(data.message || 'Failed to clear results.');
                    }
                })
                .catch(error => {
                    showError('An error occurred: ' + error);
                })
                .finally(() => {
                    // Hide loading spinner
                    toggleLoading(false);
                });
            }
        });
    }
});

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
 * Hide error message
 */
function hideError() {
    const errorAlert = document.getElementById('error-alert');
    if (errorAlert) {
        errorAlert.classList.add('d-none');
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
 * Update settings via API
 */
function updateSettings() {
    // Show loading spinner
    toggleLoading(true);
    
    // Hide any previous errors
    hideError();
    
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
    .then(response => response.json())
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
    
    // Hide any previous errors
    hideError();
    
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
    .then(response => response.json())
    .then(data => {
        // Restore button state BEFORE showing modal or handling response
        submitButton.innerHTML = originalButtonHtml;
        submitButton.disabled = false;
        
        // Hide loading spinner
        toggleLoading(false);
        
        if (data.status === 'success') {
            // Display results
            showProcessedDataPreview(data);
        } else {
            // Show error message
            showError(data.message || 'Failed to process file.');
        }
    })
    .catch(error => {
        console.error('Error processing file:', error);
        showError('An error occurred: ' + error);
        
        // Restore button state
        submitButton.innerHTML = originalButtonHtml;
        submitButton.disabled = false;
        
        // Hide loading spinner
        toggleLoading(false);
    });
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
 * Enhanced data rendering functions
 */
function renderTableFromData(data) {
    if (!data || data.length === 0) {
        return '<div class="alert alert-info">No data to display</div>';
    }

    // Get column headers
    const headers = Object.keys(data[0]);

    // Create table
    let tableHtml = `
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead>
                    <tr>
                        ${headers.map(header => `<th>${header}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${data.map(row => `
                        <tr>
                            ${headers.map(header => `
                                <td>${row[header] || ''}</td>
                            `).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    return tableHtml;
}

function renderEmailTemplates(templates) {
    if (!templates || templates.length === 0) {
        return '<div class="alert alert-info">No email templates to display</div>';
    }

    return templates.map((template, index) => `
        <div class="card mb-3">
            <div class="card-header">Email Template #${index + 1}</div>
            <div class="card-body">
                <pre class="bg-light p-3 rounded">${template}</pre>
            </div>
        </div>
    `).join('');
}

/**
 * Show data preview with editing capabilities
 */
function showProcessedDataPreview(data) {
    // Create a deep copy of the data to work with
    const workingData = JSON.parse(JSON.stringify(data.new_data));
    
    // Create modal with proper data visualization
    const modalHtml = `
    <div class="modal fade" id="processedDataPreviewModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-xl">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">New Data Preview</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="alert alert-info mb-3">
                        <strong>Note:</strong> You can edit any field below before confirming. Changes will be applied before saving.
                    </div>
                    
                    <!-- Summary cards -->
                    <div class="row mb-4">
                        <div class="col-md-3">
                            <div class="card">
                                <div class="card-body text-center">
                                    <h5 class="card-title">Contacts</h5>
                                    <p class="card-text h3">${workingData.contacts.length}</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card">
                                <div class="card-body text-center">
                                    <h5 class="card-title">Companies</h5>
                                    <p class="card-text h3">${workingData.companies.length}</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card">
                                <div class="card-body text-center">
                                    <h5 class="card-title">Pipelines</h5>
                                    <p class="card-text h3">${workingData.pipelines.length}</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card">
                                <div class="card-body text-center">
                                    <h5 class="card-title">Email Templates</h5>
                                    <p class="card-text h3">${workingData.email_templates.length}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Actual preview data -->
                    <div class="preview-content">
                        ${displayDataPreview(workingData)}
                    </div>
                </div>
                <div class="modal-footer">
                    <span class="me-auto">
                        Total Existing Results: Contacts (${data.total_existing_results.contacts}), 
                        Companies (${data.total_existing_results.companies}), 
                        Pipelines (${data.total_existing_results.pipelines}), 
                        Email Templates (${data.total_existing_results.email_templates})
                    </span>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="confirm-add-data">Confirm and Add</button>
                </div>
            </div>
        </div>
    </div>`;

    // Remove any existing modals first
    const existingModal = document.getElementById('processedDataPreviewModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);

    // Get modal element
    const modalElement = document.getElementById('processedDataPreviewModal');

    // Initialize modal
    const previewModal = new bootstrap.Modal(modalElement);
    
    // Add proper event handlers
    modalElement.addEventListener('hidden.bs.modal', function () {
        // Just remove the modal element without any navigation
        modalContainer.remove();
    });

    // Add event listeners for editable fields after modal is shown
    modalElement.addEventListener('shown.bs.modal', function () {
        // Add change event listeners to all editable fields
        document.querySelectorAll('.editable-field').forEach(field => {
            field.addEventListener('change', function() {
                const type = this.dataset.type;
                const index = parseInt(this.dataset.index);
                const fieldName = this.dataset.field;
                
                // Update the working data based on field type
                if (type === 'email_templates') {
                    workingData[type][index] = this.value;
                } else {
                    workingData[type][index][fieldName] = this.value;
                    
                    // Special handling for related fields
                    if (type === 'contacts') {
                        // Update Company Name in pipelines if contact is updated
                        if (fieldName === 'Company Name') {
                            // Find matching pipelines and update company name
                            workingData.pipelines.forEach(pipeline => {
                                if (pipeline['Contact Name'] === workingData.contacts[index]['Contact Name']) {
                                    pipeline['Company Name'] = this.value;
                                }
                            });
                        }
                        
                        // Update Contact Name in pipelines if contact name is updated
                        if (fieldName === 'Contact Name') {
                            const oldName = data.new_data.contacts[index]['Contact Name'];
                            // Find matching pipelines and update contact name
                            workingData.pipelines.forEach(pipeline => {
                                if (pipeline['Contact Name'] === oldName) {
                                    pipeline['Contact Name'] = this.value;
                                }
                            });
                        }
                        
                        // Update Email in pipelines if email is updated
                        if (fieldName === 'Email') {
                            // Find matching pipelines and update contact email
                            workingData.pipelines.forEach(pipeline => {
                                if (pipeline['Contact Name'] === workingData.contacts[index]['Contact Name']) {
                                    pipeline['Contact Email'] = this.value;
                                }
                            });
                        }
                    }
                }
            });
        });
    });

    // Show the modal
    previewModal.show();

    // Confirm button click handler
    document.getElementById('confirm-add-data').addEventListener('click', function() {
        // Disable the confirm button to prevent double clicks
        this.disabled = true;
        this.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...`;
        
        // Send request with the updated working data
        fetch('/api/confirm-process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(workingData)
        })
        .then(response => response.json())
        .then(result => {
            if (result.status === 'success') {
                // Close modal first
                previewModal.hide();
                
                // Show success toast
                showToast('Data added successfully!', 'success');
                
                // Reload page to update results
                window.location.reload();
            } else {
                // Re-enable button
                document.getElementById('confirm-add-data').disabled = false;
                document.getElementById('confirm-add-data').innerHTML = 'Confirm and Add';
                
                // Show error
                showError(result.message || 'Failed to add data');
            }
        })
        .catch(error => {
            // Re-enable button
            document.getElementById('confirm-add-data').disabled = false;
            document.getElementById('confirm-add-data').innerHTML = 'Confirm and Add';
            
            showError('An error occurred: ' + error);
        });
    });
}

// Helper function to generate preview tables with editable fields
function displayDataPreview(data) {
    let previewHtml = '';
    
    // Add Contacts table
    if (data.contacts && data.contacts.length > 0) {
        previewHtml += '<h5 class="mt-3">Contacts</h5>';
        previewHtml += '<div class="table-responsive">';
        previewHtml += '<table class="table table-striped table-sm" id="contacts-preview-table">';
        
        // Headers
        previewHtml += '<thead><tr>';
        const contactHeaders = ['Contact Name', 'First Name', 'Last Name', 'Email', 'Company Name', 'Industry'];
        contactHeaders.forEach(header => {
            previewHtml += `<th>${header}</th>`;
        });
        previewHtml += '</tr></thead>';
        
        // Rows
        previewHtml += '<tbody>';
        data.contacts.forEach((contact, index) => {
            previewHtml += '<tr>';
            contactHeaders.forEach(header => {
                previewHtml += `<td><input type="text" class="form-control form-control-sm editable-field" 
                                data-type="contacts" data-index="${index}" data-field="${header}" 
                                value="${contact[header] || ''}"></td>`;
            });
            previewHtml += '</tr>';
        });
        previewHtml += '</tbody></table></div>';
    }
    
    // Add Companies table
    if (data.companies && data.companies.length > 0) {
        previewHtml += '<h5 class="mt-3">Companies</h5>';
        previewHtml += '<div class="table-responsive">';
        previewHtml += '<table class="table table-striped table-sm" id="companies-preview-table">';
        
        // Headers
        previewHtml += '<thead><tr>';
        const companyHeaders = ['Company Name', 'Website'];
        companyHeaders.forEach(header => {
            previewHtml += `<th>${header}</th>`;
        });
        previewHtml += '</tr></thead>';
        
        // Rows
        previewHtml += '<tbody>';
        data.companies.forEach((company, index) => {
            previewHtml += '<tr>';
            companyHeaders.forEach(header => {
                previewHtml += `<td><input type="text" class="form-control form-control-sm editable-field" 
                                data-type="companies" data-index="${index}" data-field="${header}" 
                                value="${company[header] || ''}"></td>`;
            });
            previewHtml += '</tr>';
        });
        previewHtml += '</tbody></table></div>';
    }
    
    // Add Pipelines table
    if (data.pipelines && data.pipelines.length > 0) {
        previewHtml += '<h5 class="mt-3">Pipelines</h5>';
        previewHtml += '<div class="table-responsive">';
        previewHtml += '<table class="table table-striped table-sm" id="pipelines-preview-table">';
        
        // Headers
        previewHtml += '<thead><tr>';
        const pipelineHeaders = ['Deal Name', 'Company Name', 'Contact Name', 'Contact Email', 'Description'];
        pipelineHeaders.forEach(header => {
            previewHtml += `<th>${header}</th>`;
        });
        previewHtml += '</tr></thead>';
        
        // Rows
        previewHtml += '<tbody>';
        data.pipelines.forEach((pipeline, index) => {
            previewHtml += '<tr>';
            pipelineHeaders.forEach(header => {
                const isDescription = header === 'Description';
                if (isDescription) {
                    previewHtml += `<td><textarea class="form-control form-control-sm editable-field" 
                                    data-type="pipelines" data-index="${index}" data-field="${header}" 
                                    rows="2">${pipeline[header] || ''}</textarea></td>`;
                } else {
                    previewHtml += `<td><input type="text" class="form-control form-control-sm editable-field" 
                                    data-type="pipelines" data-index="${index}" data-field="${header}" 
                                    value="${pipeline[header] || ''}"></td>`;
                }
            });
            previewHtml += '</tr>';
        });
        previewHtml += '</tbody></table></div>';
    }
    
    // Add preview of email templates
    if (data.email_templates && data.email_templates.length > 0) {
        previewHtml += '<h5 class="mt-3">Email Templates</h5>';
        data.email_templates.forEach((template, index) => {
            previewHtml += `
            <div class="card mb-3">
                <div class="card-header">Template #${index + 1}</div>
                <div class="card-body">
                    <textarea class="form-control editable-field" data-type="email_templates" 
                            data-index="${index}" rows="6">${template}</textarea>
                </div>
            </div>`;
        });
    }
    
    return previewHtml || '<p class="text-center">No data to preview</p>';
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