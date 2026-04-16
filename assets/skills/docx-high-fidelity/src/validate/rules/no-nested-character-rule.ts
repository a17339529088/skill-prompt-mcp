import type { AnnotatedValidationError } from "../../contracts/generation-contract.js";

export function noNestedCharacterRule(markdown: string): AnnotatedValidationError[] {
  const errors: AnnotatedValidationError[] = [];
  const lines = markdown.split(/\r?\n/);
  let depth = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (/^<!--\s*style:character:[^>]+-->$/.test(line)) {
      depth += 1;
      if (depth > 1) {
        errors.push({
          rule: "no-nested-character",
          line: i + 1,
          message: "Nested style:character tags are not allowed."
        });
      }
    }
    if (/^<!--\s*\/style:character\s*-->$/.test(line)) {
      depth = Math.max(0, depth - 1);
    }
  }

  return errors;
}
