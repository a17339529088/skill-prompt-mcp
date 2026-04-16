import type JSZip from "jszip";
import type { DocMeta, SlotDefinition, TemplateBlock } from "../contracts/template-graph.js";
import { listZipFiles, readZipText } from "./unzip-docx.js";
import { parseXml, select, textOf } from "./xml-utils.js";

export interface ParsedStructure {
  docMeta: DocMeta;
  blocks: TemplateBlock[];
  slots: SlotDefinition[];
}

function uniq(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function inferDocMeta(documentDoc: Document): DocMeta {
  const sectPr = (select("(//w:sectPr)[last()]", documentDoc) as Node[])[0] as Element | undefined;
  const pgSz = (select("./w:pgSz", sectPr ?? documentDoc) as Node[])[0] as Element | undefined;
  const pgMar = (select("./w:pgMar", sectPr ?? documentDoc) as Node[])[0] as Element | undefined;

  const w = Number(pgSz?.getAttribute("w:w") ?? pgSz?.getAttribute("w") ?? "11906");
  const h = Number(pgSz?.getAttribute("w:h") ?? pgSz?.getAttribute("h") ?? "16838");
  const orient = pgSz?.getAttribute("w:orient") ?? pgSz?.getAttribute("orient") ?? "portrait";
  const paperSize = orient === "landscape" ? "A4-Landscape" : w > h ? "Landscape" : "A4";

  const toCm = (twips: number): number => Number(((twips / 1440) * 2.54).toFixed(2));
  const margin = {
    top: toCm(Number(pgMar?.getAttribute("w:top") ?? pgMar?.getAttribute("top") ?? "1440")),
    right: toCm(Number(pgMar?.getAttribute("w:right") ?? pgMar?.getAttribute("right") ?? "1440")),
    bottom: toCm(Number(pgMar?.getAttribute("w:bottom") ?? pgMar?.getAttribute("bottom") ?? "1440")),
    left: toCm(Number(pgMar?.getAttribute("w:left") ?? pgMar?.getAttribute("left") ?? "1440"))
  };

  const sectCount = (select("count(//w:sectPr)", documentDoc) as unknown as number) || 1;
  return {
    paperSize,
    margin,
    sections: Math.max(1, Number(sectCount)),
    language: "zh-CN",
    defaultFont: "Calibri"
  };
}

function parseBodySlots(documentXml: string): { blocks: TemplateBlock[]; slots: SlotDefinition[]; docMeta: DocMeta } {
  const doc = parseXml(documentXml);
  const body = (select("/w:document/w:body", doc) as Node[])[0] as Element | undefined;
  if (!body) {
    return {
      docMeta: {
        paperSize: "A4",
        margin: { top: 2.54, right: 2.54, bottom: 2.54, left: 2.54 },
        sections: 1,
        language: "zh-CN",
        defaultFont: "Calibri"
      },
      blocks: [],
      slots: []
    };
  }

  const blocks: TemplateBlock[] = [];
  const slots: SlotDefinition[] = [];

  const pNodes = select("/w:document/w:body/w:p", doc) as Node[];
  for (let i = 0; i < pNodes.length; i += 1) {
    const p = pNodes[i] as Element;
    const text = textOf(p);
    if (!text) {
      continue;
    }
    const styleElm = (select("./w:pPr/w:pStyle", p) as Node[])[0] as Element | undefined;
    const styleId = styleElm?.getAttribute("w:val") ?? styleElm?.getAttribute("val") ?? "Normal";

    const numElm = (select("./w:pPr/w:numPr", p) as Node[])[0] as Element | undefined;
    const isList = Boolean(numElm);
    const numId = ((select("./w:numId", numElm ?? p) as Node[])[0] as Element | undefined)?.getAttribute("w:val") ?? undefined;
    const ilvlRaw = ((select("./w:ilvl", numElm ?? p) as Node[])[0] as Element | undefined)?.getAttribute("w:val") ?? "0";
    const ilvl = Number(ilvlRaw || "0");

    const slotId = `slot_p_${String(slots.length + 1).padStart(3, "0")}`;
    const path = `/w:document/w:body/w:p[${i + 1}]`;
    slots.push({
      slotId,
      type: isList ? "list_item_slot" : "paragraph_slot",
      title: isList ? `List Item ${slots.length + 1}` : `Paragraph ${slots.length + 1}`,
      part: "word/document.xml",
      path,
      constraints: {
        allowedStyles: uniq([styleId, isList ? "ListParagraph" : "Normal"]),
        maxChars: 1200,
        maxLines: isList ? 8 : 20,
        numbering: isList ? { numId, ilvl } : undefined
      }
    });
    blocks.push({
      blockId: `blk_p_${i + 1}`,
      type: isList ? "list" : "paragraph",
      slotId,
      part: "word/document.xml",
      path
    });
  }

  const tblNodes = select("/w:document/w:body/w:tbl", doc) as Node[];
  for (let ti = 0; ti < tblNodes.length; ti += 1) {
    const tbl = tblNodes[ti] as Element;
    const trNodes = select("./w:tr", tbl) as Node[];
    for (let ri = 0; ri < trNodes.length; ri += 1) {
      const tr = trNodes[ri] as Element;
      const tcNodes = select("./w:tc", tr) as Node[];
      for (let ci = 0; ci < tcNodes.length; ci += 1) {
        const tc = tcNodes[ci] as Element;
        const text = textOf(tc);
        if (!text) {
          continue;
        }
        const slotId = `slot_t_${String(slots.length + 1).padStart(3, "0")}`;
        const path = `/w:document/w:body/w:tbl[${ti + 1}]/w:tr[${ri + 1}]/w:tc[${ci + 1}]`;
        slots.push({
          slotId,
          type: "table_cell_slot",
          title: `Table ${ti + 1} Cell ${ri + 1}-${ci + 1}`,
          part: "word/document.xml",
          path,
          constraints: {
            allowedStyles: ["TableGrid", "Normal"],
            maxChars: 500,
            maxLines: 6
          }
        });
        blocks.push({
          blockId: `blk_t_${ti + 1}_${ri + 1}_${ci + 1}`,
          type: "table",
          slotId,
          part: "word/document.xml",
          path
        });
      }
    }
  }

  const blipNodes = select("/w:document/w:body//a:blip[@r:embed]", doc) as Node[];
  for (let bi = 0; bi < blipNodes.length; bi += 1) {
    const blip = blipNodes[bi] as Element;
    const relId = blip.getAttribute("r:embed") ?? "";
    if (!relId) {
      continue;
    }
    const slotId = `slot_img_${String(slots.length + 1).padStart(3, "0")}`;
    slots.push({
      slotId,
      type: "image_replace_slot",
      title: `Image ${bi + 1}`,
      part: "word/document.xml",
      path: `/w:document/w:body//a:blip[@r:embed='${relId}'][${bi + 1}]`,
      relId,
      constraints: {
        allowedStyles: ["Normal"],
        allowedMediaKeys: []
      }
    });
    blocks.push({
      blockId: `blk_img_${bi + 1}`,
      type: "image",
      slotId,
      part: "word/document.xml",
      path: `/w:document/w:body//a:blip[@r:embed='${relId}'][${bi + 1}]`
    });
  }

  return { docMeta: inferDocMeta(doc), blocks, slots };
}

function parseHeaderFooterSlots(partName: string, xml: string, nextIndex: number): { blocks: TemplateBlock[]; slots: SlotDefinition[] } {
  const doc = parseXml(xml);
  const pNodes = select("//*[local-name()='p']", doc) as Node[];
  const blocks: TemplateBlock[] = [];
  const slots: SlotDefinition[] = [];

  if (pNodes.length === 0) {
    return { blocks, slots };
  }

  const p = pNodes[0] as Element;
  const text = textOf(p);
  if (!text) {
    return { blocks, slots };
  }

  const isHeader = partName.includes("header");
  const slotId = `${isHeader ? "slot_h" : "slot_f"}_${String(nextIndex).padStart(3, "0")}`;
  const path = isHeader ? "/w:hdr/w:p[1]" : "/w:ftr/w:p[1]";
  slots.push({
    slotId,
    type: isHeader ? "header_text_slot" : "footer_text_slot",
    title: isHeader ? "Header Text" : "Footer Text",
    part: partName,
    path,
    constraints: {
      allowedStyles: ["Normal"],
      maxChars: 120,
      maxLines: 3
    }
  });
  blocks.push({
    blockId: `${isHeader ? "blk_h" : "blk_f"}_${nextIndex}`,
    type: isHeader ? "header" : "footer",
    slotId,
    part: partName,
    path
  });
  return { blocks, slots };
}

export async function parseStructure(zip: JSZip): Promise<ParsedStructure> {
  const documentXml = await readZipText(zip, "word/document.xml");
  if (!documentXml) {
    throw new Error("word/document.xml is missing in source docx");
  }

  const bodyParsed = parseBodySlots(documentXml);
  const slots = [...bodyParsed.slots];
  const blocks = [...bodyParsed.blocks];

  const headerFooterFiles = listZipFiles(zip, "word/").filter((name) => /word\/(header|footer)\d+\.xml$/.test(name));
  for (const partName of headerFooterFiles) {
    const xml = await readZipText(zip, partName);
    if (!xml) {
      continue;
    }
    const parsed = parseHeaderFooterSlots(partName, xml, slots.length + 1);
    slots.push(...parsed.slots);
    blocks.push(...parsed.blocks);
  }

  return {
    docMeta: bodyParsed.docMeta,
    blocks,
    slots
  };
}
