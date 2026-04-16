export type TemplateMode = "source" | "auto" | "profile";

export type SlotType =
  | "paragraph_slot"
  | "list_item_slot"
  | "table_cell_slot"
  | "caption_slot"
  | "image_replace_slot"
  | "header_text_slot"
  | "footer_text_slot"
  | "footnote_slot";

export interface DocMeta {
  paperSize: string;
  margin: { top: number; right: number; bottom: number; left: number };
  sections: number;
  language: string;
  defaultFont: string;
}

export interface StyleDefinition {
  styleId: string;
  type: "paragraph" | "character" | "table";
  basedOn?: string;
}

export interface NumberingLevel {
  ilvl: number;
  format: string;
}

export interface NumberingDefinition {
  numId: string;
  abstractNumId: string;
  levels: NumberingLevel[];
}

export type TemplateBlockType =
  | "paragraph"
  | "list"
  | "table"
  | "image"
  | "header"
  | "footer"
  | "footnote";

export interface TemplateBlock {
  blockId: string;
  type: TemplateBlockType;
  slotId?: string;
  path?: string;
  part?: string;
  children?: TemplateBlock[];
}

export interface SlotConstraints {
  allowedStyles: string[];
  maxChars?: number;
  maxLines?: number;
  allowedLanguages?: string[];
  numbering?: { numId?: string; ilvl?: number };
  allowedMediaKeys?: string[];
}

export interface SlotDefinition {
  slotId: string;
  type: SlotType;
  title: string;
  constraints: SlotConstraints;
  path?: string;
  part?: string;
  mediaKey?: string;
  relId?: string;
  appendMode?: "append_body";
}

export interface MediaMapping {
  mediaKey: string;
  relId: string;
  path?: string;
  width?: number;
  height?: number;
}

export interface TemplateGraph {
  templateId: string;
  templateMode: TemplateMode;
  profileId?: string;
  sourceDocxPath?: string;
  docMeta: DocMeta;
  styles: StyleDefinition[];
  numbering: NumberingDefinition[];
  blocks: TemplateBlock[];
  locks: string[];
  slots: SlotDefinition[];
  mediaMap: MediaMapping[];
}
