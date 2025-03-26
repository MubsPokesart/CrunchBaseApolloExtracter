import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def generate_email_templates(extracted_data, settings):
    """
    Generate email templates for each contact.
    
    Args:
        extracted_data: Dictionary containing extracted data
        settings: Dictionary containing settings
        
    Returns:
        List of email templates as strings
    """
    try:
        email_templates = []
        
        for contact in extracted_data['contacts']:
            template = f"""Email: {contact['Email']}
Subject Line: {contact['Company Name']} Investment Opportunity - Hillside Ventures Inquiry
Content:

Hi {contact['First Name']}!

I'm {settings['sourcing_analyst']}, an analyst at a student-run venture firm at the University of Connecticut. Our check sizes range from $25,000 to $50,000. In our research, {contact['Company Name']} stood out due to your impactful value proposition. 

We'd love to learn more about traction and if you're currently fundraising. Would you be open to a quick call in the next few weeks?

Looking forward to connecting!

Best, 
{settings['sourcing_analyst']}
"""
            email_templates.append(template)
        
        return email_templates
    except Exception as e:
        logger.error(f"Error generating email templates: {str(e)}")
        return []