from bs4 import BeautifulSoup
import re
import requests
import logging
from app.config import Config

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def extract_company_name(soup):
    """Extract the company name from the HTML."""
    try:
        # Try various selectors to find the company name
        selectors = [
            ".entity-name",  # Common class for entity name
            "span.entity-name",  # With tag specification
            ".profile-v3-header .entity-name",  # More specific path
            ".top-row .entity-name"  # Alternative location
        ]
        
        for selector in selectors:
            company_element = soup.select_one(selector)
            if company_element and company_element.text.strip():
                return company_element.text.strip()
        
        # If selectors fail, try searching for profile header content
        header = soup.find('profile-v3-header')
        if header:
            entity_name = header.find(class_='entity-name')
            if entity_name:
                return entity_name.text.strip()
                
        logger.warning("Could not find company name using standard selectors")
        return "Unknown Company"
    except Exception as e:
        logger.error(f"Error extracting company name: {str(e)}")
        return "Unknown Company"

def extract_website(soup):
    """Extract the website from the HTML."""
    try:
        # Try various selectors to find the website
        selectors = [
            "a[href^='http'][title*='.com']",  # Links with titles containing .com
            "link-formatter a[target='_blank']",  # External links
            "field-formatter a[href^='http']"  # Formatted fields with external links
        ]
        
        for selector in selectors:
            website_elements = soup.select(selector)
            for element in website_elements:
                # Look for elements that look like websites (contain domain extensions)
                if any(ext in element.text.strip() for ext in ['.com', '.org', '.net', '.io']):
                    return element.text.strip()
        
        # Look for href attributes that might contain the website
        for a_tag in soup.find_all('a', href=True):
            if any(ext in a_tag['href'] for ext in ['.com', '.org', '.net', '.io']) and not 'crunchbase.com' in a_tag['href']:
                return a_tag['href']
                
        logger.warning("Could not find website using standard selectors")
        return ""
    except Exception as e:
        logger.error(f"Error extracting website: {str(e)}")
        return ""

def extract_description(soup):
    """Extract the company description from the HTML."""
    try:
        # Try various selectors to find company description
        selectors = [
            ".expanded-only-content:not(.chips-container)",  # Common location for description
            "profile-v3-header span.expanded-only-content",  # More specific path
            "tile-description span.description",  # Description in tile format
            ".overview-row span:not([class])"  # General description in overview section
        ]
        
        for selector in selectors:
            description_element = soup.select_one(selector)
            if description_element and description_element.text.strip():
                return description_element.text.strip()
        
        # If standard selectors fail, look for any substantial paragraph text
        for p in soup.find_all('p'):
            if len(p.text.strip()) > 50:  # Assume descriptions are reasonably long
                return p.text.strip()
                
        logger.warning("Could not find description using standard selectors")
        return ""
    except Exception as e:
        logger.error(f"Error extracting description: {str(e)}")
        return ""

def extract_founders(soup):
    """Extract the founders from the HTML."""
    try:
        # Look for sections labeled as 'Founders' or containing founder information
        founder_indicators = ['Founders', 'Founded by', 'Founder']
        
        # Find elements with text containing any of the indicators
        for indicator in founder_indicators:
            # First find labels containing indicator text
            labels = soup.find_all(string=lambda text: indicator in text if text else False)
            
            for label in labels:
                # Look for parent or nearby elements that might contain the founder names
                parent = label.parent
                
                # Check if it's a label-with-info element (common in Crunchbase)
                if parent and parent.name == 'span':
                    # Look for adjacent field-formatter
                    field_formatter = parent.find_next('field-formatter')
                    if field_formatter:
                        # Try to find links inside which are likely founder profiles
                        founder_links = field_formatter.find_all('a')
                        if founder_links:
                            return [link.text.strip() for link in founder_links if link.text.strip()]
        
        # If nothing found with labels, look for common structures
        founder_sections = soup.select("tile-field span:contains('Founders'), tile-field span:contains('Founded by')")
        for section in founder_sections:
            field = section.find_parent('tile-field')
            if field:
                links = field.select('a')
                if links:
                    return [link.text.strip() for link in links if link.text.strip()]
        
        # Another approach - look for identifier-multi-formatter which often contains founder lists
        formatters = soup.select('identifier-multi-formatter')
        for formatter in formatters:
            # Check if this formatter is for founders
            parent_tile = formatter.find_parent('tile-field')
            if parent_tile and any(ind in parent_tile.text for ind in founder_indicators):
                links = formatter.select('a')
                if links:
                    return [link.text.strip() for link in links if link.text.strip()]
        
        logger.warning("Could not find founders using standard selectors")
        return []
    except Exception as e:
        logger.error(f"Error extracting founders: {str(e)}")
        return []

def get_email_from_apollo(first_name, last_name, company_domain):
    """
    Get email from Apollo.io API.
    In a real implementation, this would call the actual API.
    """
    try:
        if not Config.APOLLO_API_KEY or Config.APOLLO_API_KEY == "YOUR_APOLLO_API_KEY":
            print("No Apollo API key provided. Using placeholder email.")
            # Return a placeholder email for demonstration
            return f"{first_name.lower()}.{last_name.lower()}@{company_domain}"
        
        # This would be the actual API call in production
        url = "https://api.apollo.io/v1/people/search"
        headers = {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache"
        }
        payload = {
            "api_key": Config.APOLLO_API_KEY,
            "q_person_first_name": first_name,
            "q_person_last_name": last_name,
            "q_organization_domains": company_domain
        }
        
        response = requests.post(url, headers=headers, json=payload)
        data = response.json()
        
        # Extract email from response
        if data.get("people") and len(data["people"]) > 0:
            email = data["people"][0].get("email", "")
            if email:
                return email
            
        print("No email found in Apollo")
        # If no email found or API call fails
        return f"{first_name.lower()}.{last_name.lower()}@{company_domain}"
    except Exception as e:
        logger.error(f"Error getting email from Apollo: {str(e)}")
        return f"{first_name.lower()}.{last_name.lower()}@{company_domain}"

def parse_domain(website):
    """Extract domain from website URL."""
    if not website:
        return "unknown.com"
    
    # Remove http://, https://, www.
    domain = website.lower()
    domain = re.sub(r'^https?://', '', domain)
    domain = re.sub(r'^www\.', '', domain)
    
    # Get the base domain
    domain = domain.split('/')[0]
    
    return domain

def split_name(full_name):
    """Split a full name into first and last name."""
    parts = full_name.strip().split()
    if len(parts) == 1:
        return parts[0], ""
    elif len(parts) == 2:
        return parts[0], parts[1]
    else:
        # For names with more than two parts, assume first name and everything else as last name
        return parts[0], " ".join(parts[1:])

def process_html_file(file_content, settings):
    """Process the HTML file and extract information."""
    soup = BeautifulSoup(file_content, 'html.parser')
    
    # Extract company information
    company_name = extract_company_name(soup)
    website = extract_website(soup)
    description = extract_description(soup)
    founders = extract_founders(soup)
    
    # Prepare domain for email generation
    domain = parse_domain(website)
    
    # Generate data for CSVs
    contacts_data = []
    companies_data = []
    pipelines_data = []
    
    # Only process the first founder as a contact
    if founders and len(founders) > 0:
        # Only use the first founder
        founder = founders[0]  # Get only the first founder
        first_name, last_name = split_name(founder)
        email = get_email_from_apollo(first_name, last_name, domain)
        
        # Add to contacts data
        contacts_data.append({
            'Contact Name': founder,
            'First Name': first_name,
            'Last Name': last_name,
            'Prospect Quality Level': settings['prospect_quality_level'],
            'Company Name': company_name,
            'Industry': settings['industry'],
            'Email': email
        })
        
        # Add to pipelines data
        pipelines_data.append({
            'Deal Name': company_name,
            'Company Name': company_name,
            'Contact Name': founder,  # Keep original Contact Name
            'Contact Email': email,   # Add Contact Email
            'Sub-Pipeline': settings['sub_pipeline'],
            'Description': description,
            'Stage': settings['stage'],
            'Industry Vertical': settings['industry_vertical'],
            'Investment Cycle': settings['investment_cycle'],
            'Contact': founder,  # Keep original Contact
            'Sourcing Analyst': settings['sourcing_analyst']
        })
    else:
        # If no founders were found, create entries with unknown contact
        unknown_contact = "Unknown Contact"
        first_name = "Unknown"
        last_name = "Contact"
        email = f"contact@{domain}"
        
        # Add to contacts data
        contacts_data.append({
            'Contact Name': unknown_contact,
            'First Name': first_name,
            'Last Name': last_name,
            'Prospect Quality Level': settings['prospect_quality_level'],
            'Company Name': company_name,
            'Industry': settings['industry'],
            'Email': email
        })
        
        # Add to pipelines data
        pipelines_data.append({
            'Deal Name': company_name,
            'Company Name': company_name,
            'Contact Name': unknown_contact,  # Keep original Contact Name
            'Contact Email': email,           # Add Contact Email
            'Sub-Pipeline': settings['sub_pipeline'],
            'Description': description,
            'Stage': settings['stage'],
            'Industry Vertical': settings['industry_vertical'],
            'Investment Cycle': settings['investment_cycle'],
            'Contact': unknown_contact,  # Keep original Contact
            'Sourcing Analyst': settings['sourcing_analyst']
        })
    
    # Add to companies data
    companies_data.append({
        'Company Name': company_name,
        'Website': website
    })
    
    return {
        'contacts': contacts_data,
        'companies': companies_data,
        'pipelines': pipelines_data
    }