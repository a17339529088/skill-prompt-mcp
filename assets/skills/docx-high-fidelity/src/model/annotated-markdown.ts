import type { SlotFillDocument, SlotFillItem, SlotContent } from "../contracts/slot-fill.js";
import type { SlotSchema } from "../contracts/slot-schema.js";

interface StyleTag {
  kind: "paragraph" | "table" | "list" | "image";
  styleId?: string;
  numId?: string;
  ilvl?: number;
}

function contentText(content: SlotContent): string {
  if ("runs" in content) {
    return content.runs.map((run) => run.text).join("");
  }
  return content.altText ?? content.mediaKey;
}

function styleTagForContent(content: SlotContent): StyleTag {
  if (content.type === "table_cell") {
    return { kind: "table", styleId: content.styleId };
  }
  if (content.type === "list_item") {
    return { kind: "list", styleId: content.styleId, numId: "1", ilvl: content.ilvl };
  }
  if (content.type === "image") {
    return { kind: "image", styleId: "Image" };
  }
  return { kind: "paragraph", styleId: "styleId" in content ? content.styleId : "Normal" };
}

function openStyleTag(style: StyleTag): string {
  if (style.kind === "list") {
    return `<!-- style:list:${style.styleId ?? "ListParagraph"};numId=${style.numId ?? "1"};ilvl=${style.ilvl ?? 0} -->`;
  }
  return `<!-- style:${style.kind}:${style.styleId ?? "Normal"} -->`;
}

function closeStyleTag(style: StyleTag): string {
  return `<!-- /style:${style.kind} -->`;
}

export function slotFillToAnnotatedMarkdown(fill: SlotFillDocument, schema: SlotSchema): string {
  const slotTitleMap = new Map(schema.slots.map((s) => [s.slotId, s.title]));
  const lines: string[] = ["# Annotated Markdown++", ""];

  for (const slot of fill.fills) {
    lines.push(`<!-- slot:${slot.slotId} -->`);
    lines.push(`<!-- slot-title:${slotTitleMap.get(slot.slotId) ?? slot.slotId} -->`);
    for (const content of slot.content) {
      const style = styleTagForContent(content);
      lines.push(openStyleTag(style));
      if (content.type === "image") {
        lines.push(`![${content.altText ?? slot.slotId}](media://${content.mediaKey})`);
      } else {
        lines.push(contentText(content));
      }
      lines.push(closeStyleTag(style));
    }
    lines.push("<!-- /slot -->");
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function parseStyleTag(line: string): StyleTag | undefined {
  const listMatch = line.match(/^<!--\s*style:list:([^;]+);numId=([^;]+);ilvl=(\d+)\s*-->$/);
  if (listMatch) {
    return { kind: "list", styleId: listMatch[1], numId: listMatch[2], ilvl: Number(listMatch[3]) };
  }
  const genericMatch = line.match(/^<!--\s*style:(paragraph|table|image):([^\s]+)\s*-->$/);
  if (genericMatch) {
    return { kind: genericMatch[1] as StyleTag["kind"], styleId: genericMatch[2] };
  }
  return undefined;
}

function toContent(style: StyleTag, textLines: string[]): SlotContent {
  const text = textLines.join("\n").trim();
  if (style.kind === "list") {
    return {
      type: "list_item",
      styleId: style.styleId ?? "ListParagraph",
      ilvl: style.ilvl ?? 0,
      runs: [{ text }]
    };
  }
  if (style.kind === "table") {
    return {
      type: "table_cell",
      styleId: style.styleId ?? "TableGrid",
      runs: [{ text }]
    };
  }
  if (style.kind === "image") {
    const mediaMatch = text.match(/media:\/\/([^\)\s]+)/);
    return {
      type: "image",
      mediaKey: mediaMatch?.[1] ?? "media-1",
      altText: text.replace(/!\[[^\]]*\]\([^\)]*\)/g, "").trim() || "image"
    };
  }
  return {
    type: "paragraph",
    styleId: style.styleId ?? "Normal",
    runs: [{ text }]
  };
}

export function annotatedMarkdownToSlotFill(markdown: string, templateId: string): SlotFillDocument {
  const lines = markdown.split(/\r?\n/);
  const fills: SlotFillItem[] = [];

  let currentSlot: SlotFillItem | undefined;
  let currentStyle: StyleTag | undefined;
  let styleTextLines: string[] = [];

  const flushStyle = (): void => {
    if (!currentSlot || !currentStyle) {
      return;
    }
    currentSlot.content.push(toContent(currentStyle, styleTextLines));
    currentStyle = undefined;
    styleTextLines = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (currentStyle) {
        styleTextLines.push("");
      }
      continue;
    }

    const slotOpen = line.match(/^<!--\s*slot:([^\s]+)\s*-->$/);
    if (slotOpen) {
      flushStyle();
      if (currentSlot && currentSlot.content.length > 0) {
        fills.push(currentSlot);
      }
      currentSlot = { slotId: slotOpen[1], content: [] };
      continue;
    }

    if (line === "<!-- /slot -->") {
      flushStyle();
      if (currentSlot) {
        fills.push(currentSlot);
        currentSlot = undefined;
      }
      continue;
    }

    const style = parseStyleTag(line);
    if (style) {
      flushStyle();
      currentStyle = style;
      styleTextLines = [];
      continue;
    }

    const styleClose = line.match(/^<!--\s*\/style:(paragraph|table|list|image)\s*-->$/);
    if (styleClose) {
      flushStyle();
      continue;
    }

    if (line.startsWith("<!-- slot-title:")) {
      continue;
    }

    if (currentStyle) {
      styleTextLines.push(rawLine);
    }
  }

  flushStyle();
  if (currentSlot && currentSlot.content.length > 0) {
    fills.push(currentSlot);
  }

  return { templateId, fills };
}
