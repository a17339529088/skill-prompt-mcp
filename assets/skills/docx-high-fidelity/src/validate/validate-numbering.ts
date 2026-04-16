import type { ValidationIssue } from "../contracts/fidelity-report.js";
import type { SlotFillDocument } from "../contracts/slot-fill.js";

export function validateNumbering(fill: SlotFillDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const slotFill of fill.fills) {
    for (const content of slotFill.content) {
      if (content.type !== "list_item") {
        continue;
      }
      if (content.ilvl < 0 || content.ilvl > 8) {
        issues.push({
          validator: "numbering",
          slotId: slotFill.slotId,
          level: "error",
          message: `ilvl out of range: ${content.ilvl}`
        });
      }
    }
  }
  return issues;
}
