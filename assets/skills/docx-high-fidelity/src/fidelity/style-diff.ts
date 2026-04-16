import type { SlotFillDocument } from "../contracts/slot-fill.js";
import type { SlotSchema } from "../contracts/slot-schema.js";

export interface StyleDiffResult {
  totalStyleChecks: number;
  passedStyleChecks: number;
  styleScore: number;
}

export function diffStyle(schema: SlotSchema, fill: SlotFillDocument): StyleDiffResult {
  const slotMap = new Map(schema.slots.map((slot) => [slot.slotId, slot]));
  let totalStyleChecks = 0;
  let passedStyleChecks = 0;

  for (const slotFill of fill.fills) {
    const slot = slotMap.get(slotFill.slotId);
    if (!slot) {
      continue;
    }
    for (const content of slotFill.content) {
      if (!("styleId" in content)) {
        continue;
      }
      totalStyleChecks += 1;
      if (slot.constraints.allowedStyles.includes(content.styleId)) {
        passedStyleChecks += 1;
      }
    }
  }

  const styleScore =
    totalStyleChecks === 0 ? 100 : Math.max(0, Math.round((passedStyleChecks / totalStyleChecks) * 100));
  return { totalStyleChecks, passedStyleChecks, styleScore };
}
