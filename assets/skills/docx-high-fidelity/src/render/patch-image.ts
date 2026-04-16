import type { SlotFillDocument } from "../contracts/slot-fill.js";
import type { RenderParagraph } from "./render-types.js";

export function patchImage(fill: SlotFillDocument): RenderParagraph[] {
  const rows: RenderParagraph[] = [];
  for (const slotFill of fill.fills) {
    for (const content of slotFill.content) {
      if (content.type !== "image") {
        continue;
      }
      rows.push({
        kind: "image",
        text: `[图片占位] mediaKey=${content.mediaKey} alt=${content.altText ?? ""}`
      });
    }
  }
  return rows;
}
