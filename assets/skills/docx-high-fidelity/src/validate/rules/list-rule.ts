import type { AnnotatedValidationError } from "../../contracts/generation-contract.js";

export function listRule(markdown: string): AnnotatedValidationError[] {
  const errors: AnnotatedValidationError[] = [];
  const lines = markdown.split(/\r?\n/);

  const listTag = /^<!--\s*style:list:([^;\s>]+);numId=([^;\s>]+);ilvl=(\d+)\s*-->$/;
  const listOpenLoose = /^<!--\s*style:list:/;

  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (!listOpenLoose.test(trimmed)) {
      continue;
    }

    const strict = trimmed.match(listTag);
    if (!strict) {
      errors.push({
        rule: "list-rule",
        line: i + 1,
        message: "List style tag must include style:list:STYLE;numId=N;ilvl=L"
      });
      continue;
    }

    const ilvl = Number(strict[3]);
    if (!Number.isInteger(ilvl) || ilvl < 0 || ilvl > 8) {
      errors.push({
        rule: "list-rule",
        line: i + 1,
        message: `Invalid ilvl: ${strict[3]}`
      });
    }
  }

  return errors;
}
