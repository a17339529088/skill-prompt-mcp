import type { AnnotatedValidationError } from "../contracts/generation-contract.js";
import type { TemplateManifest } from "../contracts/template-manifest.js";
import { listRule } from "./rules/list-rule.js";
import { noHtmlRule } from "./rules/no-html-rule.js";
import { noNestedCharacterRule } from "./rules/no-nested-character-rule.js";
import { styleWhitelistRule } from "./rules/style-whitelist-rule.js";
import { tagPairRule } from "./rules/tag-pair-rule.js";

export interface AnnotatedValidationResult {
  ok: boolean;
  errors: AnnotatedValidationError[];
}

export function validateAnnotatedMarkdown(markdown: string, manifest: TemplateManifest): AnnotatedValidationResult {
  const styleWhitelist = new Set([
    ...manifest.styles.paragraph,
    ...manifest.styles.character,
    ...manifest.styles.table,
    "Normal",
    "ListParagraph",
    "TableGrid"
  ]);

  const errors: AnnotatedValidationError[] = [
    ...tagPairRule(markdown),
    ...styleWhitelistRule(markdown, styleWhitelist),
    ...noHtmlRule(markdown),
    ...noNestedCharacterRule(markdown),
    ...listRule(markdown)
  ];

  return {
    ok: errors.length === 0,
    errors
  };
}
