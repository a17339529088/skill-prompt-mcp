import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import type JSZip from "jszip";
import type { SlotFillDocument } from "../contracts/slot-fill.js";
import type { TemplateGraph } from "../contracts/template-graph.js";

async function loadAssetByMediaKey(assetsDir: string, mediaKey: string): Promise<Buffer | undefined> {
  const files = await readdir(assetsDir, { withFileTypes: true });
  const candidate = files.find((file) => file.isFile() && file.name.startsWith(mediaKey));
  if (!candidate) {
    return undefined;
  }
  const fullPath = join(assetsDir, candidate.name);
  return readFile(fullPath);
}

export async function patchImages(
  zip: JSZip,
  graph: TemplateGraph,
  fill: SlotFillDocument,
  assetsDir?: string
): Promise<string[]> {
  if (!assetsDir) {
    return [];
  }

  const warnings: string[] = [];

  for (const slotFill of fill.fills) {
    for (const content of slotFill.content) {
      if (content.type !== "image") {
        continue;
      }
      const mediaMap = graph.mediaMap.find((item) => item.mediaKey === content.mediaKey);
      if (!mediaMap?.path) {
        warnings.push(`mediaKey ${content.mediaKey} not found in template media map.`);
        continue;
      }

      let buffer: Buffer | undefined;
      try {
        buffer = await loadAssetByMediaKey(assetsDir, content.mediaKey);
      } catch {
        buffer = undefined;
      }
      if (!buffer) {
        warnings.push(`asset for mediaKey ${content.mediaKey} not found in assets directory.`);
        continue;
      }

      const suffix = extname(mediaMap.path).toLowerCase();
      if (!suffix) {
        warnings.push(`media path has no extension for ${content.mediaKey}, writing as binary buffer.`);
      }
      zip.file(mediaMap.path, buffer, { binary: true });
    }
  }

  return warnings;
}
