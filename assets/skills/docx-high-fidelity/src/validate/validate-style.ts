import type { ValidationIssue } from "../contracts/fidelity-report.js";
import type { SlotFillDocument } from "../contracts/slot-fill.js";
import type { SlotSchema } from "../contracts/slot-schema.js";

export function validateStyle(fill: SlotFillDocument, schema: SlotSchema): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const slotMap = new Map(schema.slots.map((slot) => [slot.slotId, slot]));

  for (const slotFill of fill.fills) {
    const slot = slotMap.get(slotFill.slotId);
    if (!slot) {
      continue;
    }
    for (const content of slotFill.content) {
      if (!("styleId" in content)) {
        continue;
      }
      if (!slot.constraints.allowedStyles.includes(content.styleId)) {
        issues.push({
          validator: "style",
          slotId: slotFill.slotId,
          level: "error",
          message: `styleId "${content.styleId}" not allowed for slot "${slotFill.slotId}".`
        });
      }
    }
  }

  return issues;
}
