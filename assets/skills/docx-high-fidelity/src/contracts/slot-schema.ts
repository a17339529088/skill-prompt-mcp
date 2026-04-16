import type { SlotDefinition } from "./template-graph.js";

export interface SlotSchema {
  schemaVersion: string;
  templateId: string;
  slots: SlotDefinition[];
}

export interface SlotSchemaValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateSlotSchemaShape(input: SlotSchema): SlotSchemaValidationResult {
  const errors: string[] = [];
  if (!input.schemaVersion) {
    errors.push("schemaVersion is required.");
  }
  if (!input.templateId) {
    errors.push("templateId is required.");
  }
  if (!Array.isArray(input.slots) || input.slots.length === 0) {
    errors.push("slots is required and cannot be empty.");
  }
  return { ok: errors.length === 0, errors };
}
