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
        output = StringIO()
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        for row in data:
            writer.writerow(row)
        return output.getvalue()
    except Exception as e:
        logger.error(f"Error saving to CSV: {str(e)}")
        return ""