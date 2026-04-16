export type SlotContentType = "paragraph" | "list_item" | "table_cell" | "caption" | "image";

export interface SlotTextRun {
  text: string;
  charStyleId?: string;
}

export interface SlotParagraphContent {
  type: "paragraph";
  styleId: string;
  runs: SlotTextRun[];
}

export interface SlotListItemContent {
  type: "list_item";
  styleId: string;
  ilvl: number;
  runs: SlotTextRun[];
}

export interface SlotTableCellContent {
  type: "table_cell";
  styleId: string;
  runs: SlotTextRun[];
}

export interface SlotCaptionContent {
  type: "caption";
  styleId: string;
  runs: SlotTextRun[];
}

export interface SlotImageContent {
  type: "image";
  mediaKey: string;
  altText?: string;
}

export type SlotContent =
  | SlotParagraphContent
  | SlotListItemContent
  | SlotTableCellContent
  | SlotCaptionContent
  | SlotImageContent;

export interface SlotFillItem {
  slotId: string;
  content: SlotContent[];
}

export interface SlotFillDocument {
  templateId: string;
  fills: SlotFillItem[];
}
