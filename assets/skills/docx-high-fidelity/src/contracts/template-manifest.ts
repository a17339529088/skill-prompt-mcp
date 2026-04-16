import type { DocMeta, NumberingDefinition, SlotDefinition, StyleDefinition } from "./template-graph.js";

export interface TemplateManifest {
  templateId: string;
  templateMode: "source" | "auto" | "profile";
  sourceDocxPath?: string;
  profileId?: string;
  styles: {
    paragraph: string[];
    character: string[];
    table: string[];
  };
  numbering: NumberingDefinition[];
  slots: Array<
    {
      slotId: string;
      type: SlotDefinition["type"];
      path?: string;
      part?: string;
      title: string;
      allowedStyles: string[];
      mediaKey?: string;
      relId?: string;
      allowedMediaKeys?: string[];
      appendMode?: "append_body";
    }
  >;
  sections: Array<{ index: number; pageSize: string; orientation: "portrait" | "landscape" }>;
  docMeta: DocMeta;
  styleLedger: StyleDefinition[];
}
