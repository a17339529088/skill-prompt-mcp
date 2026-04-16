import type { ValidationIssue } from "../contracts/fidelity-report.js";
import type { SlotFillDocument } from "../contracts/slot-fill.js";
import type { TemplateGraph } from "../contracts/template-graph.js";

export function validateMedia(fill: SlotFillDocument, graph: TemplateGraph): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const mediaKeys = new Set(graph.mediaMap.map((item) => item.mediaKey));
  for (const slotFill of fill.fills) {
    for (const content of slotFill.content) {
      if (content.type !== "image") {
        continue;
      }
      if (!mediaKeys.has(content.mediaKey)) {
        issues.push({
          validator: "media",
          slotId: slotFill.slotId,
          level: "error",
          message: `Unknown mediaKey: ${content.mediaKey}`
        });
      }
    }
  }
  return issues;
}
