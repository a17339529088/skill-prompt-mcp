import type { NumberingDefinition } from "../contracts/template-graph.js";
import { parseNumberingFromDocx } from "../extract/parse-numbering.js";
import { unzipDocx } from "../extract/unzip-docx.js";

export async function parseNumbering(sourcePath?: string): Promise<NumberingDefinition[]> {
  if (!sourcePath) {
    return [
      {
        numId: "1",
        abstractNumId: "1",
        levels: [
          { ilvl: 0, format: "decimal" },
          { ilvl: 1, format: "lowerLetter" }
        ]
      }
    ];
  }

  const { zip } = await unzipDocx(sourcePath);
  return parseNumberingFromDocx(zip);
}
