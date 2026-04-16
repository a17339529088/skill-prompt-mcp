import type { SlotFillDocument } from "../contracts/slot-fill.js";
import type { SlotSchema } from "../contracts/slot-schema.js";

export interface StructureDiffResult {
  expectedSlots: number;
  filledSlots: number;
  missingSlots: string[];
  structureScore: number;
}

export function diffStructure(schema: SlotSchema, fill: SlotFillDocument): StructureDiffResult {
  const filled = new Set(fill.fills.map((item) => item.slotId));
  const missing = schema.slots.map((slot) => slot.slotId).filter((slotId) => !filled.has(slotId));
  const expected = schema.slots.length;
  const filledCount = expected - missing.length;
  const structureScore = expected === 0 ? 100 : Math.max(0, Math.round((filledCount / expected) * 100));
  return {
    expectedSlots: expected,
    filledSlots: filledCount,
    missingSlots: missing,
    structureScore
  };
}
