import type { SlotSchema } from "../contracts/slot-schema.js";

export function buildGenerationPrompt(instruction: string, schema: SlotSchema): string {
  return [
    "你是文档槽位填充模型。请输出严格 JSON，不要输出解释。",
    `模板ID: ${schema.templateId}`,
    `槽位数量: ${schema.slots.length}`,
    "必须遵守：",
    "1. 只能输出 templateId 和 fills 字段",
    "2. styleId 只能来自槽位允许样式",
    "3. 不得新增 schema 以外的 slotId",
    "4. 所有文本内容必须是中文并与指令一致",
    `用户指令: ${instruction}`,
    `槽位定义: ${JSON.stringify(schema.slots)}`
  ].join("\n");
}
