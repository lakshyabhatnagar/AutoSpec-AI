"""
Pydantic schemas for structured tabular operational data ingestion.
These are exclusively used by the new Mistral OCR pipeline.
"""
from typing import Optional, List, Any
from enum import Enum
from pydantic import BaseModel, Field

class TableType(str, Enum):
    maintenance_schedule = "maintenance_schedule"
    inspection_schedule = "inspection_schedule"
    warranty_table = "warranty_table"
    service_schedule = "service_schedule"
    specification_table = "specification_table"
    fault_table = "fault_table"
    unknown = "unknown"

class MaintenanceActionCode(str, Enum):
    R = "R" # Replace
    I = "I" # Inspect
    C = "C" # Clean
    L = "L" # Lubricate
    T = "T" # Tighten
    CHECK = "CHECK" # generic check
    ADJUST = "ADJUST" # Adjust

class ScheduleItem(BaseModel):
    interval_km: Optional[int] = Field(None, description="Kilometer interval for this action")
    interval_months: Optional[int] = Field(None, description="Month interval for this action")
    action_code: Optional[MaintenanceActionCode] = Field(None, description="Standardized action code")
    action_display: Optional[str] = Field(None, description="Display text for the action (e.g. 'Replace', 'Inspect')")

class NormalizedTableData(BaseModel):
    maintenance_item: Optional[str] = Field(None, description="The component or part being maintained/inspected")
    vehicle_variant: Optional[str] = Field(None, description="Variant or condition specific to this item (e.g., 'ISG Model', 'Diesel')")
    condition: Optional[str] = Field(None, description="Special conditions (e.g., 'Severe driving condition')")
    schedule: Optional[List[ScheduleItem]] = Field(default_factory=list, description="List of maintenance intervals and actions")
    
    # Optional fields for warranty or other tables
    duration: Optional[str] = Field(None, description="Warranty duration or specification")
    covered_parts: Optional[List[str]] = Field(None, description="Parts covered under warranty")
    specifications: Optional[dict] = Field(None, description="Key-value pairs for generic specs")

class TableDocument(BaseModel):
    brand: str
    car_model: str
    source_file: str
    page_number: int
    table_type: TableType
    raw_ocr: str = Field(description="The raw markdown or text output from OCR")
    normalized_data: NormalizedTableData
