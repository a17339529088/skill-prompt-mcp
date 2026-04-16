import type { SlotFillDocument } from "../contracts/slot-fill.js";
import type { RenderParagraph } from "./render-types.js";

export function patchList(fill: SlotFillDocument): RenderParagraph[] {
  const rows: RenderParagraph[] = [];
  for (const slotFill of fill.fills) {
    for (const content of slotFill.content) {
      if (content.type !== "list_item") {
        continue;
      }
      rows.push({
        kind: "list",
        styleId: content.styleId,
        bulletLevel: content.ilvl,
        text: content.runs.map((run) => run.text).join("")
      });
    }
  }
  return rows;
}
