# V2 Slot JSON Spec

V2 以 JSON 为唯一可信渲染输入：

```json
{
  "templateId": "tpl_xxx",
  "fills": [
    {
      "slotId": "slot_001",
      "content": [
        {
          "type": "paragraph",
          "styleId": "Heading1",
          "runs": [{ "text": "Quarterly Report Summary" }]
        }
      ]
    }
  ]
}
```

硬约束：

1. 不允许 schema 外字段。
2. styleId 必须命中白名单。
3. payload 类型必须匹配 slot 类型。
4. 图片槽位仅可引用白名单 mediaKey。
