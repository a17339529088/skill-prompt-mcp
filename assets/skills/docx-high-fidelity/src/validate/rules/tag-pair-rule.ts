import type { AnnotatedValidationError } from "../../contracts/generation-contract.js";

export function tagPairRule(markdown: string): AnnotatedValidationError[] {
  const errors: AnnotatedValidationError[] = [];
  const lines = markdown.split(/\r?\n/);
  const stack: Array<{ tag: string; line: number }> = [];

  const openRegex = /^<!--\s*(slot:[^\s]+|style:[^>]+)\s*-->$/;
  const closeRegex = /^<!--\s*\/(slot|style:[^\s>]+)\s*-->$/;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    const open = line.match(openRegex);
    if (open) {
      stack.push({ tag: open[1], line: i + 1 });
      continue;
    }

    const close = line.match(closeRegex);
    if (!close) {
      continue;
    }

    if (stack.length === 0) {
      errors.push({ rule: "tag-pair", line: i + 1, message: `Unexpected closing tag: ${close[1]}` });
      continue;
    }

    const last = stack[stack.length - 1];
    const closeKey = close[1] === "slot" ? "slot:" : close[1];
    if (last.tag.startsWith(closeKey)) {
      stack.pop();
      continue;
    }

    errors.push({
      rule: "tag-pair",
      line: i + 1,
      message: `Mismatched closing tag: expected close for ${last.tag}, got ${close[1]}`
    });
  }

  for (const unclosed of stack) {
    errors.push({ rule: "tag-pair", line: unclosed.line, message: `Unclosed tag: ${unclosed.tag}` });
  }

  return errors;
}
