import csv
from io import StringIO
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def save_to_csv(data, fieldnames):
    """
    Save data to a CSV file in memory.
    
    Args:
        data: List of dictionaries containing the data
        fieldnames: List of field names for the CSV header
        
    Returns:
        String containing the CSV data
    """
    try:
        # Ensure data is a list of dictionaries
        if not isinstance(data, list):
            logger.error(f"Invalid data type: {type(data)}")
            return ""
        
        # If data is empty, return an empty CSV with headers
        if not data:
            output = StringIO()
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            return output.getvalue()
        
        # Create StringIO object to write CSV in memory
        output = StringIO()
        
        # Create CSV writer
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        
        # Write headers
        writer.writeheader()
        
        # Write data rows
        for row in data:
            # Ensure the row contains only specified fieldnames
            filtered_row = {field: row.get(field, '') for field in fieldnames}
            writer.writerow(filtered_row)
        
        # Return CSV as a string
        return output.getvalue()
    
    except Exception as e:
        logger.error(f"Error saving to CSV: {str(e)}")
        return ""

def read_csv(csv_content, fieldnames=None):
    """
    Read CSV content and return a list of dictionaries.
    
    Args:
        csv_content: String containing CSV data
        fieldnames: Optional list of field names. If None, first row is used as headers.
        
    Returns:
        List of dictionaries containing CSV data
    """
    try:
        # Create StringIO object from CSV content
        csv_file = StringIO(csv_content)
        
        # Create CSV reader
        if fieldnames:
            reader = csv.DictReader(csv_file, fieldnames=fieldnames)
        else:
            reader = csv.DictReader(csv_file)
        
        # Convert reader to list, skipping the header if not provided
        data = list(reader)
        
        return data
    
    except Exception as e:
        logger.error(f"Error reading CSV: {str(e)}")
        return []