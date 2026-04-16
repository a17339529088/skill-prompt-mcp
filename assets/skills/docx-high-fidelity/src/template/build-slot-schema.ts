import type { SlotSchema } from "../contracts/slot-schema.js";
import type { TemplateGraph } from "../contracts/template-graph.js";

export function buildSlotSchema(graph: TemplateGraph): SlotSchema {
  return {
    schemaVersion: "v2.0",
    templateId: graph.templateId,
    slots: graph.slots
  };
}
