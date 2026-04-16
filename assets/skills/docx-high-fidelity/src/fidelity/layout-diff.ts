import type { ValidationIssue } from "../contracts/fidelity-report.js";

export interface LayoutDiffResult {
  warningCount: number;
  layoutScore: number;
}

export function diffLayout(issues: ValidationIssue[]): LayoutDiffResult {
  const warnings = issues.filter((item) => item.level === "warn");
  const layoutScore = Math.max(0, 100 - warnings.length * 3);
  return {
    warningCount: warnings.length,
    layoutScore
  };
}
