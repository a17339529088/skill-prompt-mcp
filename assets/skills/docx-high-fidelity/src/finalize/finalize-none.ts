import { copyFile } from "node:fs/promises";

export interface FinalizeResult {
  finalDocxPath: string;
  pdfPreviewPath?: string;
  warnings: string[];
}

export async function finalizeNone(renderedDocxPath: string, finalDocxPath: string): Promise<FinalizeResult> {
  await copyFile(renderedDocxPath, finalDocxPath);
  return {
    finalDocxPath,
    warnings: []
  };
}
