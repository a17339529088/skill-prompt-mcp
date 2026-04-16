import { access } from "node:fs/promises";

export interface OpenDocxResult {
  sourcePath: string;
  exists: boolean;
}

export async function openDocx(sourcePath: string): Promise<OpenDocxResult> {
  try {
    await access(sourcePath);
    return { sourcePath, exists: true };
  } catch {
    throw new Error(`Source DOCX not found: ${sourcePath}`);
  }
}
