import { parseStructure } from "../extract/parse-structure.js";
import { unzipDocx } from "../extract/unzip-docx.js";

export interface SectionInfo {
  sectionCount: number;
  paperSize: string;
  language: string;
  defaultFont: string;
}

export async function parseSections(sourcePath?: string): Promise<SectionInfo> {
  if (!sourcePath) {
    return {
      sectionCount: 1,
      paperSize: "A4",
      language: "zh-CN",
      defaultFont: "Calibri"
    };
  }

  const { zip } = await unzipDocx(sourcePath);
  const structure = await parseStructure(zip);
  return {
    sectionCount: structure.docMeta.sections,
    paperSize: structure.docMeta.paperSize,
    language: structure.docMeta.language,
    defaultFont: structure.docMeta.defaultFont
  };
}
