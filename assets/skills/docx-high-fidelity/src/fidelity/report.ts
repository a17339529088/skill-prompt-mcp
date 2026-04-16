import type { FidelityReport } from "../contracts/fidelity-report.js";

export function renderFidelityReportMarkdown(report: FidelityReport): string {
  const blockerLines =
    report.blockers.length === 0
      ? "- 无"
      : report.blockers.map((item) => `- [${item.validator}] ${item.slotId ?? "global"}: ${item.message}`).join("\n");
  const warnLines =
    report.warnings.length === 0
      ? "- 无"
      : report.warnings.map((item) => `- [${item.validator}] ${item.slotId ?? "global"}: ${item.message}`).join("\n");

  return [
    "# Fidelity Report",
    "",
    `- Run ID: ${report.runId}`,
    `- Template Mode: ${report.templateMode}`,
    `- Passed: ${report.passed ? "YES" : "NO"}`,
    `- docScore: ${report.score.docScore}`,
    "",
    "## Scores",
    `- structureScore: ${report.score.structureScore}`,
    `- styleScore: ${report.score.styleScore}`,
    `- layoutScore: ${report.score.layoutScore}`,
    `- visualScore: ${report.score.visualScore}`,
    `- stabilityScore: ${report.score.stabilityScore}`,
    "",
    "## Blockers",
    blockerLines,
    "",
    "## Warnings",
    warnLines,
    ""
  ].join("\n");
}
