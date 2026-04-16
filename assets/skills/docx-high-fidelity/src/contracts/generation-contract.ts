import type { SlotSchema } from "./slot-schema.js";

export interface GenerationPromptContract {
  templateId: string;
  instruction: string;
  styleWhitelist: string[];
  slotSchema: SlotSchema;
  hardRules: string[];
}

export interface AnnotatedValidationError {
  rule: string;
  message: string;
  line?: number;
  slotId?: string;
}
