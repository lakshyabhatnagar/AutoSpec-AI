/* ── A2UI v1.0 message types for the automotive RAG system ── */

/** Maintenance table row — matches tables-data normalized_data shape */
export interface MaintenanceTableItem {
  maintenance_item: string;
  interval_km?: number | string | null;
  interval_months?: number | string | null;
  action_code?: string | null;
  action_display?: string | null;
  variant?: string | null;
  condition?: string | null;
}

export interface MaintenanceTableData {
  items: MaintenanceTableItem[];
}

export interface WarrantyCardData {
  duration?: string;
  covered_parts: string[];
  exclusions: string[];
  conditions: string[];
  summary?: string;
}

export interface SafetyAlertData {
  risk_level: "critical" | "high" | "medium" | "low";
  warnings: string[];
  prohibited_actions: string[];
  precautions: string[];
}

export interface EmergencyStepsData {
  title?: string;
  steps: {
    step_number: number;
    action: string;
    caution?: string;
  }[];
}

export interface MalfunctionCardData {
  component?: string;
  symptoms: string[];
  possible_causes: string[];
  severity: "critical" | "high" | "medium" | "low";
  recommended_actions: string[];
}

export interface GenericTableData {
  headers: string[];
  rows: string[][];
}

/** The union type for all custom A2UI components */
export type A2UIComponentType =
  | "text"
  | "maintenance_table"
  | "warranty_card"
  | "safety_alert"
  | "emergency_steps"
  | "malfunction_card"
  | "generic_table";

export interface A2UIComponent {
  id: string;
  type: A2UIComponentType;
  data:
  | string
  | MaintenanceTableData
  | WarrantyCardData
  | SafetyAlertData
  | EmergencyStepsData
  | MalfunctionCardData
  | GenericTableData;
}

/** Converted A2UI surface for the frontend renderer */
export interface A2UISurface {
  surfaceId: string;
  components: A2UIComponent[];
  category: string | null;
}
