import type { TemplateGraph } from "../contracts/template-graph.js";
import type { TemplateManifest } from "../contracts/template-manifest.js";

export function buildTemplateManifest(graph: TemplateGraph): TemplateManifest {
  return {
    templateId: graph.templateId,
    templateMode: graph.templateMode,
    sourceDocxPath: graph.sourceDocxPath,
    profileId: graph.profileId,
    styles: {
      paragraph: graph.styles.filter((s) => s.type === "paragraph").map((s) => s.styleId),
      character: graph.styles.filter((s) => s.type === "character").map((s) => s.styleId),
      table: graph.styles.filter((s) => s.type === "table").map((s) => s.styleId)
    },
    numbering: graph.numbering,
    slots: graph.slots.map((slot) => ({
      slotId: slot.slotId,
      type: slot.type,
      path: slot.path,
      part: slot.part,
      title: slot.title,
      allowedStyles: slot.constraints.allowedStyles,
      ...(slot.appendMode ? { appendMode: slot.appendMode } : {}),
      ...(slot.mediaKey ? { mediaKey: slot.mediaKey } : {}),
      ...(slot.relId ? { relId: slot.relId } : {}),
      ...(slot.constraints.allowedMediaKeys ? { allowedMediaKeys: slot.constraints.allowedMediaKeys } : {})
    })),
    sections: Array.from({ length: Math.max(1, graph.docMeta.sections) }).map((_, idx) => ({
      index: idx,
      pageSize: graph.docMeta.paperSize,
      orientation: graph.docMeta.paperSize.includes("Landscape") ? "landscape" : "portrait"
    })),
    docMeta: graph.docMeta,
    styleLedger: graph.styles
  };
}
