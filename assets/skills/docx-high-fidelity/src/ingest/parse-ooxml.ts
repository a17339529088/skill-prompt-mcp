import { unzipDocx, readZipText, listZipFiles } from "../extract/unzip-docx.js";

export interface OoxmlSummary {
  documentXmlPath: string;
  hasHeaders: boolean;
  hasFooters: boolean;
  hasFootnotes: boolean;
  packageType: "docx";
}

export async function parseOoxml(sourcePath?: string): Promise<OoxmlSummary> {
  if (!sourcePath) {
    return {
      documentXmlPath: "word/document.xml",
      hasHeaders: true,
      hasFooters: true,
      hasFootnotes: false,
      packageType: "docx"
    };
  }

  const { zip } = await unzipDocx(sourcePath);
  const hasDocument = Boolean(await readZipText(zip, "word/document.xml"));
  if (!hasDocument) {
    throw new Error("word/document.xml is missing in source docx");
  }

  const headerFiles = listZipFiles(zip, "word/").filter((item) => /word\/header\d+\.xml$/.test(item));
  const footerFiles = listZipFiles(zip, "word/").filter((item) => /word\/footer\d+\.xml$/.test(item));
  const hasFootnotes = Boolean(await readZipText(zip, "word/footnotes.xml"));

  return {
    documentXmlPath: "word/document.xml",
    hasHeaders: headerFiles.length > 0,
    hasFooters: footerFiles.length > 0,
    hasFootnotes,
    packageType: "docx"
  };
}
