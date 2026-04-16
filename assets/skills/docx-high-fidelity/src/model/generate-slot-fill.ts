import type { SlotFillDocument, SlotFillItem, SlotContent } from "../contracts/slot-fill.js";
import type { SlotSchema } from "../contracts/slot-schema.js";
import { buildGenerationPrompt } from "../prompt/build-generation-prompt.js";
import type { LlmClient } from "./llm-client.js";

function buildTextSeed(instruction: string): string[] {
  const cleaned = instruction.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return ["Document content placeholder"];
  }
  const parts = cleaned.split(/[.!?。！？\n]/).map((item) => item.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [cleaned];
}

function buildContentBySlotType(
  slotType: string,
  styleId: string,
  textSeed: string[],
  slotTitle: string,
  mediaKey?: string
): SlotContent[] {
  switch (slotType) {
    case "list_item_slot":
      return textSeed.slice(0, 3).map((text, index) => ({
        type: "list_item",
        styleId,
        ilvl: 0,
        runs: [{ text: `${slotTitle} ${index + 1}: ${text}` }]
      }));
    case "table_cell_slot":
      return [
        {
          type: "table_cell",
          styleId,
          runs: [{ text: `${slotTitle}: ${textSeed[0]}` }]
        }
      ];
    case "caption_slot":
      return [
        {
          type: "caption",
          styleId,
          runs: [{ text: `${slotTitle} caption: ${textSeed[0]}` }]
        }
      ];
    case "image_replace_slot":
      return [{ type: "image", mediaKey: mediaKey ?? "media-1", altText: slotTitle }];
    default:
      return [
        {
          type: "paragraph",
          styleId,
          runs: [{ text: `${slotTitle}: ${textSeed[0]}` }]
        }
      ];
  }
}

export async function generateSlotFill(
  instruction: string,
  schema: SlotSchema,
  model: string,
  llmClient: LlmClient
): Promise<{ prompt: string; fill: SlotFillDocument }> {
  const prompt = buildGenerationPrompt(instruction, schema);
  await llmClient.generateJson({ prompt, model });
  const textSeed = buildTextSeed(instruction);

  const fills: SlotFillItem[] = schema.slots.map((slot, idx) => {
    const styleId = slot.constraints.allowedStyles[0] ?? "Normal";
    const rotatedSeed = textSeed[idx % textSeed.length] ? [textSeed[idx % textSeed.length], ...textSeed] : textSeed;
    return {
      slotId: slot.slotId,
      content: buildContentBySlotType(slot.type, styleId, rotatedSeed, slot.title, slot.mediaKey)
    };
  });

  return {
    prompt,
    fill: {
      templateId: schema.templateId,
      fills
    }
  };
}
