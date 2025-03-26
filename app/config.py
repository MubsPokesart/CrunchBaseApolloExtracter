import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'hillsideventures2025'
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max upload size
    APOLLO_API_KEY = os.environ.get('APOLLO_API_KEY') or "YOUR_APOLLO_API_KEY"
    
    # Default settings
    DEFAULT_SETTINGS = {
        'prospect_quality_level': 'Prospect',
        'sub_pipeline': 'HV STEM',
        'stage': '1. Source',
        'industry_vertical': '',
        'industry': '',
        'sourcing_analyst': '',
        'investment_cycle': ''
    }