import type { StyleDefinition } from "../contracts/template-graph.js";
import { parseStyles } from "../extract/parse-styles.js";
import { unzipDocx } from "../extract/unzip-docx.js";

export async function parseStyleLedger(sourcePath?: string): Promise<StyleDefinition[]> {
  if (!sourcePath) {
    return [
      { styleId: "Title", type: "paragraph" },
      { styleId: "Heading1", type: "paragraph" },
      { styleId: "Normal", type: "paragraph" },
      { styleId: "ListParagraph", type: "paragraph" },
      { styleId: "Strong", type: "character" },
      { styleId: "TableGrid", type: "table" }
    ];
  }

  const { zip } = await unzipDocx(sourcePath);
  const parsed = await parseStyles(zip);
  const fallbackStyles: StyleDefinition[] = [
    { styleId: "Normal", type: "paragraph" },
    { styleId: "ListParagraph", type: "paragraph" },
    { styleId: "TableGrid", type: "table" }
  ];
  return parsed.length > 0 ? parsed : fallbackStyles;
}
