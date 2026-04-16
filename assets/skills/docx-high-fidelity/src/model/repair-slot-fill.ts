import type { ValidationIssue } from "../contracts/fidelity-report.js";
import type { SlotFillDocument } from "../contracts/slot-fill.js";
import type { SlotSchema } from "../contracts/slot-schema.js";
import { buildRepairPrompt } from "../prompt/build-repair-prompt.js";
import type { LlmClient } from "./llm-client.js";

function truncate(text: string, maxChars: number | undefined): string {
  if (!maxChars || text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxChars - 3))}...`;
}

export async function repairSlotFill(
  current: SlotFillDocument,
  schema: SlotSchema,
  issues: ValidationIssue[],
  model: string,
  llmClient: LlmClient
): Promise<{ repaired: SlotFillDocument; repairPrompts: string[] }> {
  const bySlot = new Map<string, ValidationIssue[]>();
  for (const issue of issues) {
    if (!issue.slotId) {
      continue;
    }
    const list = bySlot.get(issue.slotId) ?? [];
    list.push(issue);
    bySlot.set(issue.slotId, list);
  }

  const repairPrompts: string[] = [];
  const repaired: SlotFillDocument = {
    templateId: current.templateId,
    fills: current.fills.map((fill) => ({
      slotId: fill.slotId,
      content: fill.content.map((item) => ({ ...item }))
    }))
  };

  for (const fill of repaired.fills) {
    const slotIssues = bySlot.get(fill.slotId);
    if (!slotIssues || slotIssues.length === 0) {
      continue;
    }

    const slot = schema.slots.find((item) => item.slotId === fill.slotId);
    if (!slot) {
      continue;
    }
    const prompt = buildRepairPrompt(fill.slotId, slotIssues);
    repairPrompts.push(prompt);
    await llmClient.generateJson({ prompt, model });

    const allowedStyle = slot.constraints.allowedStyles[0] ?? "Normal";
    for (const content of fill.content) {
      if ("styleId" in content) {
        content.styleId = allowedStyle;
      }
      if ("runs" in content) {
        content.runs = content.runs.map((run) => ({
          ...run,
          text: truncate(run.text, slot.constraints.maxChars)
        }));
      }
    }
  }

  return { repaired, repairPrompts };
}
