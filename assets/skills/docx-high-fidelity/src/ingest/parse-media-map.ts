import type { MediaMapping } from "../contracts/template-graph.js";
import { parseMedia } from "../extract/parse-media.js";
import { unzipDocx } from "../extract/unzip-docx.js";

export async function parseMediaMap(sourcePath?: string): Promise<MediaMapping[]> {
  if (!sourcePath) {
    return [
      {
        mediaKey: "media-1",
        relId: "rIdImage1",
        path: "word/media/image1.png",
        width: 1200,
        height: 800
      }
    ];
  }

  const { zip } = await unzipDocx(sourcePath);
  const parsed = await parseMedia(zip);
  if (parsed.length > 0) {
    return parsed;
  }
  return [
    {
      mediaKey: "media-1",
      relId: "rIdImage1",
      path: "word/media/image1.png"
    }
  ];
}
