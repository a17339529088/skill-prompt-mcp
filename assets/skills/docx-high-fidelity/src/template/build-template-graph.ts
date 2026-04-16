import type { TemplateGraph, TemplateMode } from "../contracts/template-graph.js";
import type { OoxmlSummary } from "../ingest/parse-ooxml.js";
import type { SectionInfo } from "../ingest/parse-sections.js";
import type { ParsedStructure } from "../extract/parse-structure.js";
import type { TemplateProfile } from "./template-profiles.js";
import { autoSelectTemplateProfile, getTemplateProfileById } from "./template-profiles.js";
import { lockStructure } from "./lock-structure.js";

export interface BuildTemplateGraphInput {
  templateMode: TemplateMode;
  instruction: string;
  sourcePath?: string;
  profileId?: string;
  styles: TemplateGraph["styles"];
  numbering: TemplateGraph["numbering"];
  mediaMap: TemplateGraph["mediaMap"];
  sectionInfo: SectionInfo;
  ooxmlSummary: OoxmlSummary;
  sourceStructure?: ParsedStructure;
}

export interface BuildTemplateGraphOutput {
  graph: TemplateGraph;
  selectedProfile?: TemplateProfile;
}

function buildSourceAppendSlot(styles: TemplateGraph["styles"]): TemplateGraph["slots"][number] {
  const paragraphStyles = styles.filter((item) => item.type === "paragraph").map((item) => item.styleId);
  const preferredStyles = ["Heading2", "Heading3", "Normal", "ListParagraph"];
  const allowedStyles = preferredStyles.filter((styleId) => paragraphStyles.includes(styleId));
  if (allowedStyles.length === 0) {
    allowedStyles.push("Normal");
  }

  return {
    slotId: "slot_append_free",
    type: "paragraph_slot",
    title: "Append Free Content",
    part: "word/document.xml",
    path: "/w:document/w:body",
    appendMode: "append_body",
    constraints: {
      allowedStyles,
      maxChars: 3000,
      maxLines: 80
    }
  };
}

function fromProfile(
  templateMode: TemplateMode,
  profile: TemplateProfile,
  styles: TemplateGraph["styles"],
  numbering: TemplateGraph["numbering"],
  mediaMap: TemplateGraph["mediaMap"]
): TemplateGraph {
  return {
    templateId: `tpl_${profile.profileId}`,
    templateMode,
    profileId: profile.profileId,
    docMeta: profile.docMeta,
    styles,
    numbering,
    blocks: profile.blocks,
    locks: lockStructure(profile.blocks),
    slots: profile.slots,
    mediaMap
  };
}

function fallbackSourceGraph(input: BuildTemplateGraphInput): TemplateGraph {
  const sourceName = input.sourcePath?.split(/[\\/]/).pop() ?? "source";
  const slots: TemplateGraph["slots"] = [
    {
      slotId: "slot_source_title",
      type: "paragraph_slot",
      title: "Title",
      part: "word/document.xml",
      path: "/w:document/w:body/w:p[1]",
      constraints: { allowedStyles: ["Title", "Heading1", "Normal"], maxChars: 80, maxLines: 2 }
    },
    {
      slotId: "slot_source_body",
      type: "paragraph_slot",
      title: "Body",
      part: "word/document.xml",
      path: "/w:document/w:body/w:p[2]",
      constraints: { allowedStyles: ["Normal"], maxChars: 1200, maxLines: 40 }
    },
    {
      slotId: "slot_source_list",
      type: "list_item_slot",
      title: "List",
      part: "word/document.xml",
      path: "/w:document/w:body/w:p[3]",
      constraints: { allowedStyles: ["ListParagraph", "Normal"], maxChars: 500, maxLines: 20 }
    },
    buildSourceAppendSlot(input.styles)
  ];

  const blocks = [
    { blockId: "blk_source_title", type: "paragraph", slotId: "slot_source_title", part: "word/document.xml", path: "/w:document/w:body/w:p[1]" },
    { blockId: "blk_source_body", type: "paragraph", slotId: "slot_source_body", part: "word/document.xml", path: "/w:document/w:body/w:p[2]" },
    { blockId: "blk_source_list", type: "list", slotId: "slot_source_list", part: "word/document.xml", path: "/w:document/w:body/w:p[3]" }
  ] as const;

  return {
    templateId: `tpl_source_${sourceName}`,
    templateMode: "source",
    sourceDocxPath: input.sourcePath,
    docMeta: {
      paperSize: input.sectionInfo.paperSize,
      margin: { top: 2.54, right: 2.54, bottom: 2.54, left: 2.54 },
      sections: input.sectionInfo.sectionCount,
      language: input.sectionInfo.language,
      defaultFont: input.sectionInfo.defaultFont
    },
    styles: input.styles,
    numbering: input.numbering,
    blocks: [...blocks],
    locks: lockStructure([...blocks]),
    slots,
    mediaMap: input.mediaMap
  };
}

function fromSource(input: BuildTemplateGraphInput): TemplateGraph {
  if (!input.sourceStructure) {
    return fallbackSourceGraph(input);
  }

  const sourceName = input.sourcePath?.split(/[\\/]/).pop() ?? "source";
  const slots = input.sourceStructure.slots.map((slot) => {
    if (slot.type !== "image_replace_slot" || !slot.relId) {
      return slot;
    }
    const media = input.mediaMap.find((item) => item.relId === slot.relId);
    if (!media) {
      return slot;
    }
    return {
      ...slot,
      mediaKey: media.mediaKey,
      constraints: {
        ...slot.constraints,
        allowedMediaKeys: [media.mediaKey]
      }
    };
  });

  return {
    templateId: `tpl_source_${sourceName}`,
    templateMode: "source",
    sourceDocxPath: input.sourcePath,
    docMeta: input.sourceStructure.docMeta,
    styles: input.styles,
    numbering: input.numbering,
    blocks: input.sourceStructure.blocks,
    locks: lockStructure(input.sourceStructure.blocks),
    slots: [...slots, buildSourceAppendSlot(input.styles)],
    mediaMap: input.mediaMap
  };
}

export function buildTemplateGraph(input: BuildTemplateGraphInput): BuildTemplateGraphOutput {
  if (input.templateMode === "source") {
    return { graph: fromSource(input) };
  }

  const selectedProfile =
    input.templateMode === "profile" && input.profileId
      ? getTemplateProfileById(input.profileId)
      : autoSelectTemplateProfile(input.instruction);

  if (!selectedProfile) {
    throw new Error(`Template profile not found: ${input.profileId}`);
  }

  return {
    graph: fromProfile(input.templateMode, selectedProfile, input.styles, input.numbering, input.mediaMap),
    selectedProfile
  };
}
