import type { TemplateManifest } from "../contracts/template-manifest.js";
import { buildPrompt } from "../prompt/build-prompt.js";
import type { ModelClient } from "./model-client.js";

export async function generateAnnotatedMarkdown(
  instruction: string,
  manifest: TemplateManifest,
  model: string,
  client: ModelClient
): Promise<{ prompt: string; markdown: string }> {
  const styleWhitelist = [
    ...manifest.styles.paragraph,
    ...manifest.styles.character,
    ...manifest.styles.table,
    "Normal",
    "ListParagraph",
    "TableGrid"
  ];
  const prompt = buildPrompt({
    templateId: manifest.templateId,
    instruction,
    styleWhitelist,
    slotSchema: {
      schemaVersion: "v2.0",
      templateId: manifest.templateId,
      slots: manifest.slots.map((slot) => ({
        slotId: slot.slotId,
        title: slot.title,
        type: slot.type,
        constraints: { allowedStyles: slot.allowedStyles }
      }))
    },
    hardRules: [
      "No HTML tags",
      "All style tags must be paired",
      "Use only whitelist style IDs"
    ]
  });

  await client.generateText({ prompt, model });

  const lines: string[] = ["# Annotated Markdown++", ""];
  const shortInstruction = instruction.trim() || "Document content";

  for (const slot of manifest.slots) {
    lines.push(`<!-- slot:${slot.slotId} -->`);
    const styleId = slot.allowedStyles[0] ?? "Normal";
    if (slot.type === "list_item_slot") {
      lines.push(`<!-- style:list:${styleId};numId=1;ilvl=0 -->`);
      lines.push(`- ${slot.title}: ${shortInstruction}`);
      lines.push("<!-- /style:list -->");
    } else if (slot.type === "table_cell_slot") {
      lines.push(`<!-- style:table:${styleId} -->`);
      lines.push(`${slot.title}: ${shortInstruction}`);
      lines.push("<!-- /style:table -->");
    } else if (slot.type === "image_replace_slot") {
      const mediaKey = slot.mediaKey ?? slot.allowedMediaKeys?.[0] ?? "media-1";
      lines.push("<!-- style:image:Image -->");
      lines.push(`![${slot.title}](media://${mediaKey})`);
      lines.push("<!-- /style:image -->");
    } else {
      lines.push(`<!-- style:paragraph:${styleId} -->`);
      lines.push(`${slot.title}: ${shortInstruction}`);
      lines.push("<!-- /style:paragraph -->");
    }
    lines.push("<!-- /slot -->");
    lines.push("");
  }

  return { prompt, markdown: `${lines.join("\n")}\n` };
}
