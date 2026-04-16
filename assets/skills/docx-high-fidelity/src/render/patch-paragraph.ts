import type { SlotFillDocument } from "../contracts/slot-fill.js";
import type { RenderParagraph } from "./render-types.js";

export function patchParagraph(fill: SlotFillDocument): RenderParagraph[] {
  const rows: RenderParagraph[] = [];
  for (const slotFill of fill.fills) {
    for (const content of slotFill.content) {
      if (content.type !== "paragraph" && content.type !== "caption") {
        continue;
      }
      rows.push({
        kind: "paragraph",
        styleId: content.styleId,
        text: content.runs.map((run) => run.text).join("")
      });
    }
  }
  return rows;
}
