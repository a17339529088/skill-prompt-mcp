import { readFile } from "node:fs/promises";
import JSZip from "jszip";

export interface UnzippedDocx {
  zip: JSZip;
  sourcePath: string;
}

export async function unzipDocx(sourcePath: string): Promise<UnzippedDocx> {
  const buffer = await readFile(sourcePath);
  const zip = await JSZip.loadAsync(buffer);
  return { zip, sourcePath };
}

export async function readZipText(zip: JSZip, filePath: string): Promise<string | undefined> {
  const entry = zip.file(filePath);
  if (!entry) {
    return undefined;
  }
  return entry.async("string");
}

export function listZipFiles(zip: JSZip, prefix: string): string[] {
  return Object.keys(zip.files)
    .filter((name) => name.startsWith(prefix) && !zip.files[name]?.dir)
    .sort((a, b) => a.localeCompare(b));
}
