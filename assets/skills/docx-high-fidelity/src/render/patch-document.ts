import { readFile, writeFile } from "node:fs/promises";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import JSZip from "jszip";
import type { SlotFillDocument, SlotFillItem } from "../contracts/slot-fill.js";
import type { SlotDefinition, TemplateGraph } from "../contracts/template-graph.js";
import { patchImages } from "./patch-images.js";
import { listItemText } from "./patch-lists.js";
import { tableCellText } from "./patch-tables.js";
import { headerFooterText } from "./patch-header-footer.js";
import { ns, select } from "../extract/xml-utils.js";

interface PatchResult {
  warnings: string[];
}

function plainText(fillItem: SlotFillItem): string {
  return fillItem.content
    .flatMap((content) => ("runs" in content ? content.runs.map((run) => run.text) : []))
    .join("\n")
    .trim();
}

function slotFillToText(slot: SlotDefinition, fillItem: SlotFillItem): string {
  if (slot.type === "list_item_slot") {
    const listText = listItemText(fillItem);
    return listText || plainText(fillItem);
  }
  if (slot.type === "table_cell_slot") {
    const tableText = tableCellText(fillItem);
    return tableText || plainText(fillItem);
  }
  if (slot.type === "header_text_slot" || slot.type === "footer_text_slot" || slot.type === "footnote_slot") {
    return headerFooterText(fillItem);
  }
  if (slot.type === "image_replace_slot") {
    const image = fillItem.content.find((c) => c.type === "image");
    return image?.altText ?? slot.title;
  }
  return plainText(fillItem);
}

function ensureRunText(targetNode: Node, replacementText: string): void {
  const tNodes = select(".//w:t", targetNode) as Node[];
  if (tNodes.length > 0) {
    const first = tNodes[0];
    first.textContent = replacementText;
    for (let i = 1; i < tNodes.length; i += 1) {
      tNodes[i].textContent = "";
    }
    return;
  }

  const owner = targetNode.ownerDocument;
  if (!owner) {
    return;
  }

  const createTextRun = (parent: Node): void => {
    const r = owner.createElementNS(ns.w, "w:r");
    const t = owner.createElementNS(ns.w, "w:t");
    t.appendChild(owner.createTextNode(replacementText));
    r.appendChild(t);
    parent.appendChild(r);
  };

  const localName = (targetNode as Element).localName;
  if (localName === "p") {
    createTextRun(targetNode);
    return;
  }

  if (localName === "tc") {
    let p = (select("./w:p[1]", targetNode) as Node[])[0];
    if (!p) {
      p = owner.createElementNS(ns.w, "w:p");
      targetNode.appendChild(p);
    }
    createTextRun(p);
    return;
  }

  targetNode.appendChild(owner.createTextNode(replacementText));
}

function createStyledParagraph(owner: Document, text: string, styleId?: string): Element {
  const p = owner.createElementNS(ns.w, "w:p");
  if (styleId) {
    const pPr = owner.createElementNS(ns.w, "w:pPr");
    const pStyle = owner.createElementNS(ns.w, "w:pStyle");
    pStyle.setAttributeNS(ns.w, "w:val", styleId);
    pPr.appendChild(pStyle);
    p.appendChild(pPr);
  }

  const r = owner.createElementNS(ns.w, "w:r");
  const t = owner.createElementNS(ns.w, "w:t");
  t.appendChild(owner.createTextNode(text));
  r.appendChild(t);
  p.appendChild(r);
  return p;
}

function appendParagraphsToBody(bodyNode: Node, fillItem: SlotFillItem, fallbackStyleId: string): void {
  const owner = bodyNode.ownerDocument;
  if (!owner) {
    return;
  }
  const lines = fillItem.content
    .flatMap((content) => ("runs" in content ? content.runs.map((run) => run.text) : []))
    .join("\n")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return;
  }

  const firstStyleFromFill =
    fillItem.content.find(
      (content): content is Extract<SlotFillItem["content"][number], { styleId: string }> =>
        "styleId" in content && typeof content.styleId === "string" && content.styleId.length > 0
    )?.styleId ?? fallbackStyleId;
  const sectPr = (select("./w:sectPr[1]", bodyNode) as Node[])[0];

  for (const line of lines) {
    const paragraph = createStyledParagraph(owner, line, firstStyleFromFill);
    if (sectPr) {
      bodyNode.insertBefore(paragraph, sectPr);
    } else {
      bodyNode.appendChild(paragraph);
    }
  }
}

function groupSlotsByPart(slots: SlotDefinition[]): Map<string, SlotDefinition[]> {
  const grouped = new Map<string, SlotDefinition[]>();
  for (const slot of slots) {
    const part = slot.part ?? "word/document.xml";
    const list = grouped.get(part) ?? [];
    list.push(slot);
    grouped.set(part, list);
  }
  return grouped;
}

function parseXml(xml: string): Document {
  return new DOMParser().parseFromString(xml, "text/xml");
}

export async function patchDocument(
  sourceDocxPath: string,
  outputDocxPath: string,
  graph: TemplateGraph,
  fill: SlotFillDocument,
  assetsDir?: string
): Promise<PatchResult> {
  const warnings: string[] = [];
  const sourceBuffer = await readFile(sourceDocxPath);
  const zip = await JSZip.loadAsync(sourceBuffer);
  const fillsBySlotId = new Map(fill.fills.map((item) => [item.slotId, item]));

  const groupedSlots = groupSlotsByPart(graph.slots.filter((slot) => Boolean(slot.path)));
  for (const [part, slots] of groupedSlots) {
    const entry = zip.file(part);
    if (!entry) {
      warnings.push(`Part not found: ${part}`);
      continue;
    }
    const xml = await entry.async("string");
    const doc = parseXml(xml);

    for (const slot of slots) {
      const fillItem = fillsBySlotId.get(slot.slotId);
      if (!fillItem) {
        continue;
      }
      if (!slot.path) {
        continue;
      }

      const targetNode = (select(slot.path, doc) as Node[])[0];
      if (!targetNode) {
        warnings.push(`Slot path not found for ${slot.slotId}: ${slot.path}`);
        continue;
      }

      if (slot.appendMode === "append_body") {
        appendParagraphsToBody(targetNode, fillItem, slot.constraints.allowedStyles[0] ?? "Normal");
        continue;
      }

      if (slot.type === "image_replace_slot") {
        continue;
      }

      const text = slotFillToText(slot, fillItem);
      ensureRunText(targetNode, text);
    }

    const updated = new XMLSerializer().serializeToString(doc);
    zip.file(part, updated);
  }

  const imageWarnings = await patchImages(zip, graph, fill, assetsDir);
  warnings.push(...imageWarnings);

  const out = await zip.generateAsync({ type: "nodebuffer" });
  await writeFile(outputDocxPath, out);

  return { warnings };
}
