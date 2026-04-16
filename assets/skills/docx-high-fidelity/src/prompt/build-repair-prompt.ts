import type { ValidationIssue } from "../contracts/fidelity-report.js";

export function buildRepairPrompt(slotId: string, errors: ValidationIssue[]): string {
  return [
    "请仅修复指定槽位，并返回该槽位内容 JSON。",
    `目标槽位: ${slotId}`,
    `错误明细: ${errors.map((item) => item.message).join(" | ")}`,
    "要求：保持语义不变，修复 styleId、结构、长度约束。"
  ].join("\n");
}
