import type { ValidationIssue } from "../contracts/fidelity-report.js";
import type { SlotFillDocument } from "../contracts/slot-fill.js";

export function validateTable(fill: SlotFillDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const slotFill of fill.fills) {
    for (const content of slotFill.content) {
      if (content.type !== "table_cell") {
        continue;
      }
      if (!content.runs.length) {
        issues.push({
          validator: "table",
          slotId: slotFill.slotId,
          level: "error",
          message: "table_cell content requires at least one text run."
        });
      }
    }
  }
  return issues;
}
