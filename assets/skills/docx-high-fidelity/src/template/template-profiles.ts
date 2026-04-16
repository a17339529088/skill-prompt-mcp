import type { DocMeta, SlotDefinition, TemplateBlock } from "../contracts/template-graph.js";

export interface TemplateProfile {
  profileId: string;
  title: string;
  domain: string;
  docMeta: DocMeta;
  slots: SlotDefinition[];
  blocks: TemplateBlock[];
}

const baseDocMeta: DocMeta = {
  paperSize: "A4",
  margin: { top: 2.54, right: 2.54, bottom: 2.54, left: 2.54 },
  sections: 1,
  language: "zh-CN",
  defaultFont: "Calibri"
};

const commonSlots: SlotDefinition[] = [
  {
    slotId: "slot_title",
    type: "paragraph_slot",
    title: "标题",
    constraints: { allowedStyles: ["Title", "Heading1"], maxChars: 64, maxLines: 2 }
  },
  {
    slotId: "slot_summary",
    type: "paragraph_slot",
    title: "摘要",
    constraints: { allowedStyles: ["Normal"], maxChars: 300, maxLines: 8 }
  },
  {
    slotId: "slot_key_points",
    type: "list_item_slot",
    title: "关键要点",
    constraints: { allowedStyles: ["ListParagraph", "Normal"], maxChars: 600, maxLines: 16 }
  },
  {
    slotId: "slot_next_steps",
    type: "list_item_slot",
    title: "后续计划",
    constraints: { allowedStyles: ["ListParagraph", "Normal"], maxChars: 500, maxLines: 12 }
  }
];

const commonBlocks: TemplateBlock[] = [
  { blockId: "blk_title", type: "paragraph", slotId: "slot_title" },
  { blockId: "blk_summary", type: "paragraph", slotId: "slot_summary" },
  { blockId: "blk_points", type: "list", slotId: "slot_key_points" },
  { blockId: "blk_next", type: "list", slotId: "slot_next_steps" }
];

export const BUILTIN_TEMPLATE_PROFILES: TemplateProfile[] = [
  {
    profileId: "business-report-a4",
    title: "Business Report A4",
    domain: "report",
    docMeta: baseDocMeta,
    slots: commonSlots,
    blocks: commonBlocks
  },
  {
    profileId: "proposal-standard",
    title: "Proposal Standard",
    domain: "proposal",
    docMeta: baseDocMeta,
    slots: [
      ...commonSlots,
      {
        slotId: "slot_budget",
        type: "table_cell_slot",
        title: "预算摘要",
        constraints: { allowedStyles: ["Normal", "TableGrid"], maxChars: 240, maxLines: 8 }
      }
    ],
    blocks: [...commonBlocks, { blockId: "blk_budget", type: "table", slotId: "slot_budget" }]
  },
  {
    profileId: "meeting-minutes-cn",
    title: "Meeting Minutes CN",
    domain: "meeting-minutes",
    docMeta: baseDocMeta,
    slots: [
      ...commonSlots,
      {
        slotId: "slot_attendees",
        type: "paragraph_slot",
        title: "参会人员",
        constraints: { allowedStyles: ["Normal"], maxChars: 200, maxLines: 5 }
      }
    ],
    blocks: [...commonBlocks, { blockId: "blk_attendees", type: "paragraph", slotId: "slot_attendees" }]
  }
];

export function getTemplateProfileById(profileId: string): TemplateProfile | undefined {
  return BUILTIN_TEMPLATE_PROFILES.find((item) => item.profileId === profileId);
}

export function autoSelectTemplateProfile(instruction: string): TemplateProfile {
  const lower = instruction.toLowerCase();
  if (lower.includes("meeting") || instruction.includes("会议") || instruction.includes("纪要")) {
    return getTemplateProfileById("meeting-minutes-cn") as TemplateProfile;
  }
  if (lower.includes("proposal") || instruction.includes("提案")) {
    return getTemplateProfileById("proposal-standard") as TemplateProfile;
  }
  return getTemplateProfileById("business-report-a4") as TemplateProfile;
}
