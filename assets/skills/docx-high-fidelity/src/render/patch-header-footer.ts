import type { SlotFillDocument, SlotFillItem } from "../contracts/slot-fill.js";
import type { SlotSchema } from "../contracts/slot-schema.js";
import type { RenderParagraph } from "./render-types.js";

export function headerFooterText(fillItem: SlotFillItem): string {
  return fillItem.content
    .flatMap((content) => ("runs" in content ? content.runs.map((run) => run.text) : []))
    .join(" ")
    .trim();
}

export function patchHeaderFooter(fill: SlotFillDocument, schema: SlotSchema): RenderParagraph[] {
  const rows: RenderParagraph[] = [];
  const slotMap = new Map(schema.slots.map((slot) => [slot.slotId, slot]));

  for (const slotFill of fill.fills) {
    const slot = slotMap.get(slotFill.slotId);
    if (!slot) {
      continue;
    }
    if (slot.type !== "header_text_slot" && slot.type !== "footer_text_slot" && slot.type !== "footnote_slot") {
      continue;
    }
    const text = headerFooterText(slotFill);
    rows.push({
      kind: "header_footer",
      text: `[${slot.type}] ${text}`
    });
  }

  return rows;
}
