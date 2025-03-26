from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, send_file
from app.config import Config
from app.services.extractor import process_html_file
from app.services.csv_generator import save_to_csv
from app.services.email_generator import generate_email_templates
import io
from zipfile import ZipFile
import json
import os

main = Blueprint('main', __name__)

# In-memory storage for settings
current_settings = Config.DEFAULT_SETTINGS.copy()

@main.route('/')
def index():
    return render_template('index.html', settings=current_settings)

@main.route('/api/update-settings', methods=['POST'])
def update_settings():
    """API endpoint to update settings"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'status': 'error', 'message': 'No data provided'}), 400
        
        # Update settings
        current_settings['industry_vertical'] = data.get('industry_vertical', current_settings['industry_vertical'])
        current_settings['industry'] = data.get('industry', current_settings['industry'])
        current_settings['sourcing_analyst'] = data.get('sourcing_analyst', current_settings['sourcing_analyst'])
        current_settings['investment_cycle'] = data.get('investment_cycle', current_settings['investment_cycle'])
        
        return jsonify({'status': 'success', 'settings': current_settings})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@main.route('/api/get-settings', methods=['GET'])
def get_settings():
    """API endpoint to get current settings"""
    return jsonify({'settings': current_settings})

@main.route('/api/process', methods=['POST'])
def process_files():
    """API endpoint to process HTML files"""
    if 'file' not in request.files:
        return jsonify({'status': 'error', 'message': 'No file part'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'status': 'error', 'message': 'No file selected'}), 400
    
    if file and file.filename.endswith(('.html', '.htm')):
        try:
            # Read the file
            file_content = file.read().decode('utf-8')
            
            # Process the file
            extracted_data = process_html_file(file_content, current_settings)
            
            # Generate email templates
            email_templates = generate_email_templates(extracted_data, current_settings)
            
            # Create CSV files in memory
            contacts_csv = save_to_csv(
                extracted_data['contacts'], 
                ['Contact Name', 'First Name', 'Last Name', 'Prospect Quality Level', 'Company Name', 'Industry', 'Email']
            )
            
            companies_csv = save_to_csv(
                extracted_data['companies'], 
                ['Company Name', 'Website']
            )
            
            pipelines_csv = save_to_csv(
                extracted_data['pipelines'], 
                ['Deal Name', 'Company Name', 'Contact Name', 'Sub-Pipeline', 'Description', 'Stage', 
                 'Industry Vertical', 'Investment Cycle', 'Contact', 'Sourcing Analyst']
            )
            
            # Create a combined text file for email templates
            email_templates_text = "\n\n" + "-"*50 + "\n\n".join(email_templates)
            
            # Create a zip file containing all CSVs and email templates
            memory_file = io.BytesIO()
            with ZipFile(memory_file, 'w') as zf:
                zf.writestr('contacts.csv', contacts_csv)
                zf.writestr('companies.csv', companies_csv)
                zf.writestr('pipelines.csv', pipelines_csv)
                zf.writestr('email_templates.txt', email_templates_text)
            
            memory_file.seek(0)
            
            # Prepare the data for the frontend
            preview_data = {
                'contacts': extracted_data['contacts'][:3] if extracted_data['contacts'] else [],
                'companies': extracted_data['companies'][:3] if extracted_data['companies'] else [],
                'pipelines': extracted_data['pipelines'][:3] if extracted_data['pipelines'] else [],
                'email_templates': email_templates[:3] if email_templates else []
            }
            
            return jsonify({
                'status': 'success',
                'message': 'File processed successfully',
                'preview': preview_data,
                'download_url': url_for('main.download_results')
            })
            
        except Exception as e:
            return jsonify({'status': 'error', 'message': str(e)}), 500
    
    return jsonify({'status': 'error', 'message': 'Invalid file format'}), 400

# Store the last processed zip file in memory
last_processed_zip = None

@main.route('/api/download-results', methods=['GET'])
def download_results():
    """API endpoint to download the results"""
    global last_processed_zip
    if last_processed_zip:
        return send_file(
            last_processed_zip,
            download_name='crunchbase_data.zip',
            as_attachment=True,
            mimetype='application/zip'
        )
    else:
        return jsonify({'status': 'error', 'message': 'No data available for download'}), 404