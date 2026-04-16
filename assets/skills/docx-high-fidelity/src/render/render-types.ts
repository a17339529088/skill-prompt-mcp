export interface RenderParagraph {
  text: string;
  kind: "paragraph" | "list" | "table" | "image" | "header_footer";
  styleId?: string;
  bulletLevel?: number;
}
