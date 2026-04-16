import type JSZip from "jszip";
import type { NumberingDefinition } from "../contracts/template-graph.js";
import { parseXml, select } from "./xml-utils.js";
import { readZipText } from "./unzip-docx.js";

export async function parseNumberingFromDocx(zip: JSZip): Promise<NumberingDefinition[]> {
  const xml = await readZipText(zip, "word/numbering.xml");
  if (!xml) {
    return [];
  }

  const doc = parseXml(xml);
  const abstractNumLevels = new Map<string, Array<{ ilvl: number; format: string }>>();

  const abstractNums = select("//w:abstractNum", doc) as Node[];
  for (const node of abstractNums) {
    const elm = node as Element;
    const abstractNumId = elm.getAttribute("w:abstractNumId") ?? elm.getAttribute("abstractNumId") ?? "";
    if (!abstractNumId) {
      continue;
    }
    const levels = (select("./w:lvl", elm) as Node[]).map((lvlNode) => {
      const lvlElm = lvlNode as Element;
      const ilvl = Number(lvlElm.getAttribute("w:ilvl") ?? lvlElm.getAttribute("ilvl") ?? "0");
      const numFmtElm = (select("./w:numFmt", lvlElm) as Node[])[0] as Element | undefined;
      const format = numFmtElm?.getAttribute("w:val") ?? numFmtElm?.getAttribute("val") ?? "decimal";
      return { ilvl, format };
    });
    abstractNumLevels.set(abstractNumId, levels);
  }

  const result: NumberingDefinition[] = [];
  const nums = select("//w:num", doc) as Node[];
  for (const node of nums) {
    const elm = node as Element;
    const numId = elm.getAttribute("w:numId") ?? elm.getAttribute("numId") ?? "";
    if (!numId) {
      continue;
    }
    const abstractElm = (select("./w:abstractNumId", elm) as Node[])[0] as Element | undefined;
    const abstractNumId = abstractElm?.getAttribute("w:val") ?? abstractElm?.getAttribute("val") ?? "";
    result.push({
      numId,
      abstractNumId,
      levels: abstractNumLevels.get(abstractNumId) ?? []
    });
  }
  return result;
}
