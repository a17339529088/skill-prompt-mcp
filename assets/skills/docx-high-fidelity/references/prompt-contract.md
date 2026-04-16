# Prompt Contract

## Generation Prompt

模型必须：

1. 仅输出合法 JSON。
2. 不输出解释文本。
3. 仅填充已声明槽位。
4. styleId 仅从允许样式中选择。

## Repair Prompt

模型必须：

1. 仅修复指定槽位。
2. 优先修复结构与样式错误。
3. 不改变槽位语义。
