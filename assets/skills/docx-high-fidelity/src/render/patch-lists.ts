import type { SlotFillItem } from "../contracts/slot-fill.js";

export function listItemText(fillItem: SlotFillItem): string {
  const rows: string[] = [];
  for (const content of fillItem.content) {
    if (content.type !== "list_item") {
      continue;
    }
    rows.push(`• ${content.runs.map((run) => run.text).join("")}`);
  }
  return rows.join("\n");
}
