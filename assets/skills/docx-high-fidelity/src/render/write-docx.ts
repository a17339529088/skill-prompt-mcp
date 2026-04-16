import { writeFile } from "node:fs/promises";
import { Document, Packer, Paragraph, TextRun } from "docx";
import type { RenderParagraph } from "./render-types.js";

function toParagraph(node: RenderParagraph): Paragraph {
  const run = new TextRun({
    text: node.text
  });

  if (node.kind === "list") {
    return new Paragraph({
      children: [run],
      bullet: { level: node.bulletLevel ?? 0 },
      style: node.styleId
    });
  }

  return new Paragraph({
    children: [run],
    style: node.styleId
  });
}

export async function writeDocx(outputPath: string, rows: RenderParagraph[]): Promise<void> {
  const doc = new Document({
    sections: [
      {
        children: rows.length > 0 ? rows.map((row) => toParagraph(row)) : [new Paragraph("No content generated.")]
      }
    ]
  });
  const buffer = await Packer.toBuffer(doc);
  await writeFile(outputPath, buffer);
}
