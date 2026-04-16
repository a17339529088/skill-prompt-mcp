import { DOMParser } from "@xmldom/xmldom";
import xpath from "xpath";

export const ns = {
  w: "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
  r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
  a: "http://schemas.openxmlformats.org/drawingml/2006/main",
  wp: "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
};

export const select = xpath.useNamespaces(ns);

export function parseXml(xml: string): Document {
  return new DOMParser().parseFromString(xml, "text/xml");
}

export function textOf(node: Node): string {
  return (node.textContent ?? "").replace(/\s+/g, " ").trim();
}

export function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
