import type { AnnotatedValidationError } from "../../contracts/generation-contract.js";

export function styleWhitelistRule(markdown: string, styleWhitelist: Set<string>): AnnotatedValidationError[] {
  const errors: AnnotatedValidationError[] = [];
  const lines = markdown.split(/\r?\n/);

  const styleRegex = /<!--\s*style:(paragraph|table|list|character|image):([^;\s>]+)(?:;[^>]*)?\s*-->/;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const match = line.match(styleRegex);
    if (!match) {
      continue;
    }
    const styleId = match[2];
    if (!styleWhitelist.has(styleId) && match[1] !== "image") {
      errors.push({
        rule: "style-whitelist",
        line: i + 1,
        message: `Style not allowed: ${styleId}`
      });
    }
  }

  return errors;
}
