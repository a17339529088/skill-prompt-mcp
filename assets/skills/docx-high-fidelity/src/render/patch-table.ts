import type { SlotFillDocument } from "../contracts/slot-fill.js";
import type { RenderParagraph } from "./render-types.js";

export function patchTable(fill: SlotFillDocument): RenderParagraph[] {
  const rows: RenderParagraph[] = [];
  for (const slotFill of fill.fills) {
    for (const content of slotFill.content) {
      if (content.type !== "table_cell") {
        continue;
      }
      rows.push({
        kind: "table",
        styleId: content.styleId,
        text: `[表格单元格] ${content.runs.map((run) => run.text).join("")}`
      });
    }
  }
  return rows;
}
