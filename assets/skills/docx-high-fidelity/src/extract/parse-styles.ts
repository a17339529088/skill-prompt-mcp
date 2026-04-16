import type { StyleDefinition } from "../contracts/template-graph.js";
import type JSZip from "jszip";
import { parseXml, select } from "./xml-utils.js";
import { readZipText } from "./unzip-docx.js";

export async function parseStyles(zip: JSZip): Promise<StyleDefinition[]> {
  const xml = await readZipText(zip, "word/styles.xml");
  if (!xml) {
    return [{ styleId: "Normal", type: "paragraph" }];
  }

  const doc = parseXml(xml);
  const styleNodes = select("//w:style", doc) as Node[];
  const styles: StyleDefinition[] = [];

  for (const node of styleNodes) {
    const elm = node as Element;
    const styleId = elm.getAttribute("w:styleId") ?? elm.getAttribute("styleId") ?? "";
    if (!styleId) {
      continue;
    }
    const styleTypeRaw = elm.getAttribute("w:type") ?? elm.getAttribute("type") ?? "paragraph";
    const type = styleTypeRaw === "character" || styleTypeRaw === "table" ? styleTypeRaw : "paragraph";
    const basedOn = ((select("./w:basedOn", elm) as Node[])[0] as Element | undefined)?.getAttribute("w:val") ?? undefined;
    styles.push({ styleId, type, basedOn });
  }

  if (styles.length === 0) {
    styles.push({ styleId: "Normal", type: "paragraph" });
  }
  return styles;
}
