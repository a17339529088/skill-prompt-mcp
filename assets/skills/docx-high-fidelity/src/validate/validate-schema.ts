import type { ValidationIssue } from "../contracts/fidelity-report.js";
import type { SlotFillDocument } from "../contracts/slot-fill.js";
import type { SlotSchema } from "../contracts/slot-schema.js";

export function validateSchema(fill: SlotFillDocument, schema: SlotSchema): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (fill.templateId !== schema.templateId) {
    issues.push({
      validator: "schema",
      level: "error",
      message: `templateId mismatch: ${fill.templateId} !== ${schema.templateId}`
    });
  }

  const slotIds = new Set(schema.slots.map((slot) => slot.slotId));
  for (const item of fill.fills) {
    if (!slotIds.has(item.slotId)) {
      issues.push({
        validator: "schema",
        slotId: item.slotId,
        level: "error",
        message: `Unknown slotId: ${item.slotId}`
      });
    }
    if (!Array.isArray(item.content) || item.content.length === 0) {
      issues.push({
        validator: "schema",
        slotId: item.slotId,
        level: "error",
        message: "Slot content cannot be empty."
      });
    }
  }

  return issues;
}
