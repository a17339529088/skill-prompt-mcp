import type { AnnotatedValidationError } from "../../contracts/generation-contract.js";

export function noHtmlRule(markdown: string): AnnotatedValidationError[] {
  const errors: AnnotatedValidationError[] = [];
  const lines = markdown.split(/\r?\n/);
  const htmlRegex = /<(?!!--\s*\/?(slot|style)|!--)([a-zA-Z][a-zA-Z0-9]*)(\s|>|\/)/;

  for (let i = 0; i < lines.length; i += 1) {
    if (htmlRegex.test(lines[i])) {
      errors.push({
        rule: "no-html",
        line: i + 1,
        message: "HTML tags are not allowed in annotated markdown."
      });
    }
  }

  return errors;
}
