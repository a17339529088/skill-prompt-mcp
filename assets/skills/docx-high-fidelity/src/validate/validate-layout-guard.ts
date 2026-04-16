import type { ValidationIssue } from "../contracts/fidelity-report.js";
import type { SlotFillDocument } from "../contracts/slot-fill.js";
import type { SlotSchema } from "../contracts/slot-schema.js";

export function validateLayoutGuard(fill: SlotFillDocument, schema: SlotSchema): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const slotMap = new Map(schema.slots.map((slot) => [slot.slotId, slot]));
  for (const slotFill of fill.fills) {
    const slot = slotMap.get(slotFill.slotId);
    if (!slot) {
      continue;
    }
    const joined = slotFill.content
      .flatMap((content) => ("runs" in content ? content.runs.map((run) => run.text) : []))
      .join("\n");
    if (slot.constraints.maxChars && joined.length > slot.constraints.maxChars) {
      issues.push({
        validator: "layout-guard",
        slotId: slotFill.slotId,
        level: "warn",
        message: `Exceeded maxChars: ${joined.length} > ${slot.constraints.maxChars}`
      });
    }
    if (slot.constraints.maxLines) {
      const lines = joined.split(/\n+/).filter(Boolean).length;
      if (lines > slot.constraints.maxLines) {
        issues.push({
          validator: "layout-guard",
          slotId: slotFill.slotId,
          level: "warn",
          message: `Exceeded maxLines: ${lines} > ${slot.constraints.maxLines}`
        });
      }
    }
  }
  return issues;
}
