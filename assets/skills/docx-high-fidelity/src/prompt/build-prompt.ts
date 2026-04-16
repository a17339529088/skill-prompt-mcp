import type { GenerationPromptContract } from "../contracts/generation-contract.js";

export function buildPrompt(contract: GenerationPromptContract): string {
  return [
    "You are a DOCX high-fidelity generation model.",
    `Template ID: ${contract.templateId}`,
    `Instruction: ${contract.instruction}`,
    "Hard Rules:",
    ...contract.hardRules.map((r, i) => `${i + 1}. ${r}`),
    `Allowed Styles: ${contract.styleWhitelist.join(", ")}`,
    "Slot Schema JSON:",
    JSON.stringify(contract.slotSchema)
  ].join("\n");
}
