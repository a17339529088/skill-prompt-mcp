import { copyFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { basename, dirname, join } from "node:path";
import type { FinalizeResult } from "./finalize-none.js";

function hasSoffice(): boolean {
  const probe = spawnSync("soffice", ["--version"], { encoding: "utf-8" });
  return probe.status === 0;
}

export async function finalizeLibreoffice(
  renderedDocxPath: string,
  finalDocxPath: string
): Promise<FinalizeResult> {
  const warnings: string[] = [];
  await copyFile(renderedDocxPath, finalDocxPath);

  if (!hasSoffice()) {
    warnings.push("libreoffice not available, fallback to none finalizer.");
    return { finalDocxPath, warnings };
  }

  const outDir = dirname(finalDocxPath);
  const convert = spawnSync(
    "soffice",
    ["--headless", "--convert-to", "pdf", "--outdir", outDir, finalDocxPath],
    { encoding: "utf-8" }
  );
  if (convert.status !== 0) {
    warnings.push(`libreoffice conversion failed: ${convert.stderr || convert.stdout || "unknown error"}`);
    return { finalDocxPath, warnings };
  }

  const pdfPreviewPath = join(outDir, `${basename(finalDocxPath, ".docx")}.pdf`);
  return { finalDocxPath, pdfPreviewPath, warnings };
}
