import type { AnnotatedValidationError } from "../contracts/generation-contract.js";

function stripHtml(line: string): string {
  return line.replace(/<(?!!--)[^>]+>/g, "");
}

function normalizeStyleTag(line: string): string {
  const listLoose = line.match(/^<!--\s*style:list:([^>]+)-->$/);
  if (listLoose && !line.includes(";numId=") && !line.includes(";ilvl=")) {
    const styleId = listLoose[1].split(";")[0].trim();
    return `<!-- style:list:${styleId};numId=1;ilvl=0 -->`;
  }
  return line;
}

export function repairAnnotatedMarkdown(markdown: string, errors: AnnotatedValidationError[]): string {
  const hasNoHtml = errors.some((item) => item.rule === "no-html");
  const hasListError = errors.some((item) => item.rule === "list-rule");
  const hasTagError = errors.some((item) => item.rule === "tag-pair");

  const lines = markdown.split(/\r?\n/).map((line) => {
    let updated = line;
    if (hasNoHtml) {
      updated = stripHtml(updated);
    }
    if (hasListError) {
      updated = normalizeStyleTag(updated);
    }
    return updated;
  });

  if (hasTagError) {
    const openSlotCount = lines.filter((line) => /^<!--\s*slot:[^\s]+\s*-->$/.test(line.trim())).length;
    const closeSlotCount = lines.filter((line) => line.trim() === "<!-- /slot -->").length;
    for (let i = closeSlotCount; i < openSlotCount; i += 1) {
      lines.push("<!-- /slot -->");
    }

    const blockTypes: Array<"paragraph" | "table" | "list" | "image" | "character"> = [
      "paragraph",
      "table",
      "list",
      "image",
      "character"
    ];
    for (const type of blockTypes) {
      const open = lines.filter((line) => new RegExp(`^<!--\\s*style:${type}:`).test(line.trim())).length;
      const close = lines.filter((line) => new RegExp(`^<!--\\s*\\/style:${type}\\s*-->$`).test(line.trim())).length;
      for (let i = close; i < open; i += 1) {
        lines.push(`<!-- /style:${type} -->`);
      }
    }
  }

  return `${lines.join("\n")}\n`;
}
