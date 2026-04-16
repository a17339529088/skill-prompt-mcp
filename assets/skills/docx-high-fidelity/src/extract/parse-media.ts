import type JSZip from "jszip";
import type { MediaMapping } from "../contracts/template-graph.js";
import { parseXml, select } from "./xml-utils.js";
import { listZipFiles, readZipText } from "./unzip-docx.js";

export async function parseMedia(zip: JSZip): Promise<MediaMapping[]> {
  const relsXml = await readZipText(zip, "word/_rels/document.xml.rels");
  const mediaFiles = listZipFiles(zip, "word/media/");

  if (!relsXml) {
    return mediaFiles.map((path, index) => ({
      mediaKey: `media-${index + 1}`,
      relId: `rIdImage${index + 1}`,
      path
    }));
  }

  const relDoc = parseXml(relsXml);
  const relNodes = select("//*[local-name()='Relationship']", relDoc) as Node[];
  const mappings: MediaMapping[] = [];
  let idx = 0;
  for (const node of relNodes) {
    const rel = node as Element;
    const type = rel.getAttribute("Type") ?? "";
    if (!type.includes("/image")) {
      continue;
    }
    idx += 1;
    const relId = rel.getAttribute("Id") ?? `rIdImage${idx}`;
    const target = rel.getAttribute("Target") ?? "";
    const normalizedPath = target.startsWith("word/") ? target : `word/${target.replace(/^\.\//, "")}`;
    mappings.push({
      mediaKey: `media-${idx}`,
      relId,
      path: normalizedPath
    });
  }

  if (mappings.length === 0) {
    return mediaFiles.map((path, index) => ({
      mediaKey: `media-${index + 1}`,
      relId: `rIdImage${index + 1}`,
      path
    }));
  }
  return mappings;
}
