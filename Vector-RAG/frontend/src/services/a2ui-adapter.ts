/* ── A2UI Adapter v3: Generative UI Edition ── */
import type { CriticalQueryResponse, QueryResponse } from "@/types/api";
import type {
  A2UIComponent,
  A2UISurface,
} from "@/types/a2ui";

function extractMarkdownTables(text: string) {
  const lines = text.split(/\r?\n/);
  const tables: string[][] = [];
  let currentTable: string[] | null = null;
  const newLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    if (trimmedLine.includes('|')) {
      if (!currentTable) {
        currentTable = [line];
      } else {
        currentTable.push(line);
      }
    } else {
      if (currentTable) {
        if (currentTable.length >= 3 && currentTable[1].includes('---')) {
          tables.push(currentTable);
        } else {
          newLines.push(...currentTable);
        }
        currentTable = null;
      }
      newLines.push(line);
    }
  }
  if (currentTable) {
    if (currentTable.length >= 3 && currentTable[1].includes('---')) {
      tables.push(currentTable);
    } else {
      newLines.push(...currentTable);
    }
  }

  const parsedTables = tables.map(tableLines => {
    const parseLine = (l: string) => l.trim().replace(/^\||\|$/g, '').split('|').map(s => s.trim());
    return {
      headers: parseLine(tableLines[0]),
      rows: tableLines.slice(2).map(parseLine)
    };
  });

  return { tables: parsedTables, cleanedText: newLines.join('\n').trim() };
}

/**
 * Converts a critical query response into an A2UI surface using Just-In-Time Generative UI payload
 */
export function criticalResponseToSurface(
  res: CriticalQueryResponse,
  query?: string
): A2UISurface {
  const components: A2UIComponent[] = [];

  // Add the natural language answer
  if (res.answer) {
    // If there's no UI card, try to extract markdown tables just in case
    if (!res.ui_card) {
      const { tables, cleanedText } = extractMarkdownTables(res.answer);
      if (cleanedText) {
        components.push({
          id: "answer-text",
          type: "text",
          data: cleanedText,
        });
      }
      tables.forEach((table, i) => {
        components.push({
          id: `generic-table-${i}`,
          type: "generic_table",
          data: table,
        });
      });
    } else {
      components.push({
        id: "answer-text",
        type: "text",
        data: res.answer,
      });
    }
  }

  // Parse Generative UI card
  if (res.ui_card && res.ui_card.type) {
    switch (res.ui_card.type) {
      case "table":
        if (res.ui_card.table_data) {
          components.push({
            id: "gen-table",
            type: "generic_table",
            data: res.ui_card.table_data,
          });
        }
        break;
      case "steps":
      case "list":
        if (res.ui_card.steps_data) {
          components.push({
            id: "gen-steps",
            type: "emergency_steps",
            data: res.ui_card.steps_data,
          });
        }
        break;
      case "alert":
        if (res.ui_card.alert_data) {
          components.push({
            id: "gen-alert",
            type: "safety_alert",
            data: res.ui_card.alert_data,
          });
        }
        break;
      default:
        console.warn("Unknown Generative UI card type:", res.ui_card.type);
    }
  }

  return {
    surfaceId: "main",
    components,
    category: res.category,
  };
}

/**
 * Converts a standard query response into a simple text A2UI surface.
 */
export function queryResponseToSurface(res: QueryResponse): A2UISurface {
  const components: A2UIComponent[] = [];
  const { tables, cleanedText } = extractMarkdownTables(res.answer);

  if (cleanedText) {
    components.push({
      id: "answer-text",
      type: "text",
      data: cleanedText,
    });
  }

  tables.forEach((table, i) => {
    components.push({
      id: `generic-table-${i}`,
      type: "generic_table",
      data: table,
    });
  });

  return {
    surfaceId: "main",
    components,
    category: null,
  };
}
