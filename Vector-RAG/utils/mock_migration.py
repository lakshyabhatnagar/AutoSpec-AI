import os
from dotenv import load_dotenv
from app.db.mongodb import feature_collection_v2

load_dotenv()

mock_record = {
    "semantic_text": "The engine oil should be replaced every 10000 km or 12 months for all variants.",
    "brand": "Hyundai",
    "car_model": "Creta",
    "category": "Maintenance Schedules",
    "maintenance_item": "Engine Oil and Filter",
    "action_code": "R",
    "action_display": "Replace",
    "interval_km": 10000,
    "interval_months": 12,
    "severity": None,
    "source_file": "creta_manual.pdf",
    "section_heading": "Maintenance",
    "chunk_id": "mock_chunk_1"
}

feature_collection_v2.delete_many({"chunk_id": "mock_chunk_1"})
feature_collection_v2.insert_one(mock_record)
print("Mock record inserted into feature_collection_v2.")
