from flask import Flask
import os

def create_app(test_config=None):
    """Create and configure the Flask application"""
    # Create and configure the app
    app = Flask(__name__, instance_relative_config=True)
    
    # Load the default configuration
    from app.config import Config
    app.config.from_object(Config)
    
    # Ensure the upload folder exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Register blueprints
    from app.routes import main
    app.register_blueprint(main)
    
    return app