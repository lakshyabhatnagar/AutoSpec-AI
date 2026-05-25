import os
import re

def extract_metadata(file_path):
    # Example file_path: Manuals/Toyota/Fortuner_2023.pdf
    norm_path = os.path.normpath(file_path)
    parts = norm_path.split(os.sep)
    
    brand = parts[-2]
    filename = parts[-1]
    
    # Extract MODELNAME_YEAR
    match = re.match(r"(.+)_(\d{4})\.pdf$", filename)
    if not match:
        raise ValueError(f"Filename does not match MODELNAME_YEAR.pdf format: {filename}")
        
    car_model = match.group(1)
    car_year = int(match.group(2))
    
    return {
        "brand": brand,
        "car_model": car_model,
        "car_year_start": car_year - 1,
        "car_year_end": car_year + 1,
        "supported_years": [car_year - 1, car_year, car_year + 1],
        "source_file": filename
    }
