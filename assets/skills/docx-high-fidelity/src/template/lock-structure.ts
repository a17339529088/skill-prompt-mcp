import type { TemplateBlock } from "../contracts/template-graph.js";

export function lockStructure(blocks: TemplateBlock[]): string[] {
  return blocks
    .filter((block) => !block.slotId)
    .map((block) => block.blockId);
}
