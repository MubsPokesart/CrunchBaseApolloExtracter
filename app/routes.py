from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, send_file
from app.config import Config
from app.services.extractor import process_html_file
from app.services.csv_generator import save_to_csv
from app.services.email_generator import generate_email_templates
import io
from zipfile import ZipFile
import json
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

main = Blueprint('main', __name__)

# In-memory storage for settings and results
current_settings = Config.DEFAULT_SETTINGS.copy()
processed_results = {
    'contacts': [],
    'companies': [],
    'pipelines': [],
    'email_templates': [],
    'zip_files': []
}

@main.route('/')
def index():
    """Render the main page"""
    return render_template('index.html', 
                           settings=current_settings, 
                           processed_results=processed_results)

@main.route('/results')
def results():
    """Render the results page"""
    # Ensure there are results to display
    if not processed_results['contacts']:
        return redirect(url_for('main.index'))
    
    return render_template('results.html', 
                           settings=current_settings,
                           contacts=processed_results['contacts'],
                           companies=processed_results['companies'],
                           pipelines=processed_results['pipelines'],
                           email_templates=processed_results['email_templates'],
                           download_url=url_for('main.download_results'))

@main.route('/api/update-settings', methods=['POST'])
def update_settings():
    """API endpoint to update settings"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'status': 'error', 'message': 'No data provided'}), 400
        
        # Log received data
        logger.info(f"Received settings update: {data}")
        
        # Update settings
        current_settings['industry_vertical'] = data.get('industry_vertical', current_settings['industry_vertical'])
        current_settings['industry'] = data.get('industry', current_settings['industry'])
        current_settings['sourcing_analyst'] = data.get('sourcing_analyst', current_settings['sourcing_analyst'])
        current_settings['investment_cycle'] = data.get('investment_cycle', current_settings['investment_cycle'])
        
        logger.info(f"Updated settings: {current_settings}")
        
        return jsonify({'status': 'success', 'settings': current_settings})
    except Exception as e:
        logger.error(f"Error updating settings: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

def is_duplicate_entry(new_entry, existing_entries, keys_to_check):
    """
    Check if an entry is a duplicate based on specified keys
    
    Args:
        new_entry (dict): The new entry to check
        existing_entries (list): List of existing entries
        keys_to_check (list): Keys to compare for determining duplicates
    
    Returns:
        bool: True if duplicate, False otherwise
    """
    for existing_entry in existing_entries:
        # Check if all specified keys match
        if all(new_entry.get(key) == existing_entry.get(key) for key in keys_to_check):
            return True
    return False

@main.route('/api/process', methods=['POST'])
def process_files():
    """API endpoint to process HTML files"""
    try:
        if 'file' not in request.files:
            return jsonify({'status': 'error', 'message': 'No file part in the request'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'status': 'error', 'message': 'No file selected'}), 400
        
        if file and file.filename.endswith(('.html', '.htm')):
            # Read the file
            try:
                file_content = file.read().decode('utf-8')
            except UnicodeDecodeError:
                # Try with different encoding if UTF-8 fails
                file.seek(0)
                file_content = file.read().decode('latin-1')
            
            logger.info(f"Processing file: {file.filename}")
            
            # Process the file
            extracted_data = process_html_file(file_content, current_settings)
            
            # Deduplication logic
            deduped_contacts = []
            for contact in extracted_data['contacts']:
                if not is_duplicate_entry(contact, processed_results['contacts'], 
                                          ['Contact Name', 'Email', 'Company Name']):
                    deduped_contacts.append(contact)
            
            deduped_companies = []
            for company in extracted_data['companies']:
                if not is_duplicate_entry(company, processed_results['companies'], 
                                          ['Company Name', 'Website']):
                    deduped_companies.append(company)
            
            deduped_pipelines = []
            for pipeline in extracted_data['pipelines']:
                if not is_duplicate_entry(pipeline, processed_results['pipelines'], 
                                          ['Deal Name', 'Company Name', 'Contact Name', 'Contact Email']):
                    deduped_pipelines.append(pipeline)
            
            # Generate email templates only for new contacts
            email_templates = generate_email_templates(
                {'contacts': deduped_contacts}, 
                current_settings
            )
            
            logger.info("File processed successfully")
            
            return jsonify({
                'status': 'success',
                'message': 'File processed successfully',
                'new_data': {
                    'contacts': deduped_contacts,
                    'companies': deduped_companies,
                    'pipelines': deduped_pipelines,
                    'email_templates': email_templates
                },
                'total_existing_results': {
                    'contacts': len(processed_results['contacts']),
                    'companies': len(processed_results['companies']),
                    'pipelines': len(processed_results['pipelines']),
                    'email_templates': len(processed_results['email_templates'])
                }
            })
        else:
            return jsonify({'status': 'error', 'message': 'Invalid file format. Please upload an HTML file.'}), 400
            
    except Exception as e:
        logger.error(f"Error processing file: {str(e)}")
        return jsonify({'status': 'error', 'message': f"Error processing file: {str(e)}"}), 500
    
@main.route('/api/confirm-process', methods=['POST'])
def confirm_process():
    """API endpoint to confirm and add processed data"""
    try:
        # Get the data from the request
        data = request.get_json()
        
        if not data:
            return jsonify({'status': 'error', 'message': 'No data provided'}), 400
        
        # Deduplication logic (to double-check)
        deduped_contacts = []
        for contact in data.get('contacts', []):
            if not is_duplicate_entry(contact, processed_results['contacts'], 
                                      ['Contact Name', 'Email', 'Company Name']):
                deduped_contacts.append(contact)
        
        deduped_companies = []
        for company in data.get('companies', []):
            if not is_duplicate_entry(company, processed_results['companies'], 
                                      ['Company Name', 'Website']):
                deduped_companies.append(company)
        
        deduped_pipelines = []
        for pipeline in data.get('pipelines', []):
            if not is_duplicate_entry(pipeline, processed_results['pipelines'], 
                                      ['Deal Name', 'Company Name', 'Contact Name']):
                deduped_pipelines.append(pipeline)

        # Extend processed results with deduped data
        processed_results['contacts'].extend(deduped_contacts)
        processed_results['companies'].extend(deduped_companies)
        processed_results['pipelines'].extend(deduped_pipelines)
        # Check if email templates already exist before adding
        new_email_templates = []
        for template in data.get('email_templates', []):
            if template not in processed_results['email_templates']:
                new_email_templates.append(template)
                
        processed_results['email_templates'].extend(new_email_templates)

        
        logger.info(f"Confirmed processing: {len(deduped_contacts)} contacts, {len(deduped_companies)} companies, {len(deduped_pipelines)} pipelines")
        
        return jsonify({
            'status': 'success',
            'message': 'Data added successfully',
            'total_results': {
                'contacts': len(processed_results['contacts']),
                'companies': len(processed_results['companies']),
                'pipelines': len(processed_results['pipelines']),
                'email_templates': len(processed_results['email_templates'])
            }
        })
    except Exception as e:
        logger.error(f"Error confirming process: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500
                                                  
@main.route('/api/download-results', methods=['GET'])
def download_results():
    """API endpoint to download all processed results"""
    try:
        if processed_results['contacts']:
            # Merge all data into single CSV files
            contacts_csv = save_to_csv(
                processed_results['contacts'], 
                ['Contact Name', 'First Name', 'Last Name', 'Prospect Quality Level', 'Company Name', 'Industry', 'Email']
            )
            
            companies_csv = save_to_csv(
                processed_results['companies'], 
                ['Company Name', 'Website']
            )
            
            pipelines_csv = save_to_csv(
                processed_results['pipelines'], 
                ['Deal Name', 'Company Name', 'Contact Name', 'Contact Email', 'Sub-Pipeline', 
                 'Description', 'Stage', 'Industry Vertical', 'Investment Cycle', 'Contact', 
                 'Sourcing Analyst']
            )
            
            # Combine email templates into a single text file
            email_templates_text = "\n\n" + "-"*50 + "\n\n".join(processed_results['email_templates'])
            
            # Create a zip file containing all CSVs and email templates
            memory_file = io.BytesIO()
            with ZipFile(memory_file, 'w') as zf:
                zf.writestr('contacts.csv', contacts_csv)
                zf.writestr('companies.csv', companies_csv)
                zf.writestr('pipelines.csv', pipelines_csv)
                zf.writestr('email_templates.txt', email_templates_text)
            
            memory_file.seek(0)
            
            return send_file(
                memory_file,
                download_name='crunchbase_data.zip',
                as_attachment=True,
                mimetype='application/zip'
            )
        else:
            return jsonify({'status': 'error', 'message': 'No data available for download'}), 404
    except Exception as e:
        logger.error(f"Error downloading results: {str(e)}")
        return jsonify({'status': 'error', 'message': f"Error downloading results: {str(e)}"}), 500

@main.route('/api/reset-results', methods=['POST'])
def reset_results():
    """API endpoint to reset processed results"""
    try:
        # Clear all processed results
        processed_results['contacts'].clear()
        processed_results['companies'].clear()
        processed_results['pipelines'].clear()
        processed_results['email_templates'].clear()
        processed_results['zip_files'].clear()
        
        return jsonify({
            'status': 'success', 
            'message': 'All processed results have been cleared.'
        })
    except Exception as e:
        logger.error(f"Error resetting results: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@main.route('/api/remove-last-result', methods=['POST'])
def remove_last_result():
    """API endpoint to remove the last processed result"""
    try:
        # Remove the last entries from each list and zip file
        if processed_results['contacts']:
            processed_results['contacts'].pop()
        if processed_results['companies']:
            processed_results['companies'].pop()
        if processed_results['pipelines']:
            processed_results['pipelines'].pop()
        if processed_results['email_templates']:
            processed_results['email_templates'].pop()
        if processed_results['zip_files']:
            processed_results['zip_files'].pop()
        
        return jsonify({
            'status': 'success', 
            'message': 'Last processed result has been removed.',
            'total_results': {
                'contacts': len(processed_results['contacts']),
                'companies': len(processed_results['companies']),
                'pipelines': len(processed_results['pipelines']),
                'email_templates': len(processed_results['email_templates'])
            }
        })
    except Exception as e:
        logger.error(f"Error removing last result: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500