"use client";
import type { A2UISurface } from "@/types/a2ui";
import { MaintenanceTable } from "@/components/a2ui/MaintenanceTable";
import { WarrantyCard } from "@/components/a2ui/WarrantyCard";
import { SafetyAlert } from "@/components/a2ui/SafetyAlert";
import { EmergencySteps } from "@/components/a2ui/EmergencySteps";
import { MalfunctionCard } from "@/components/a2ui/MalfunctionCard";
import { GenericTable } from "@/components/a2ui/GenericTable";
import { MarkdownText } from "@/components/MarkdownText";

/**
 * A2UI React Renderer — Maps A2UI surface components to native React components.
 * This follows the A2UI "custom catalog" pattern: each component type in the
 * surface is dispatched to a pre-registered React component.
 */
export function A2UIRenderer({ surface }: { surface: A2UISurface }) {
  return (
    <div className="space-y-4">
      {surface.components.map((comp) => {
        switch (comp.type) {
          case "text":
            return (
              <MarkdownText key={comp.id} text={comp.data as string} />
            );
          case "maintenance_table":
            return <MaintenanceTable key={comp.id} data={comp.data as never} />;
          case "warranty_card":
            return <WarrantyCard key={comp.id} data={comp.data as never} />;
          case "safety_alert":
            return <SafetyAlert key={comp.id} data={comp.data as never} />;
          case "emergency_steps":
            return <EmergencySteps key={comp.id} data={comp.data as never} />;
          case "malfunction_card":
            return <MalfunctionCard key={comp.id} data={comp.data as never} />;
          case "generic_table":
            return <GenericTable key={comp.id} data={comp.data as never} />;
          default:
            return (
              <div key={comp.id} className="text-zinc-500 text-sm">
                Unknown component type: {comp.type}
              </div>
            );
        }
      })}
    </div>
  );
}
