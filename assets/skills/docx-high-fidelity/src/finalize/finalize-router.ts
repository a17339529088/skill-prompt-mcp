import type { FinalizerType } from "../pipeline/config.js";
import { finalizeLibreoffice } from "./finalize-libreoffice.js";
import { finalizeNone, type FinalizeResult } from "./finalize-none.js";

export async function finalizeRouter(
  finalizer: FinalizerType,
  renderedDocxPath: string,
  finalDocxPath: string
): Promise<FinalizeResult> {
  if (finalizer === "libreoffice") {
    return finalizeLibreoffice(renderedDocxPath, finalDocxPath);
  }
  return finalizeNone(renderedDocxPath, finalDocxPath);
}
