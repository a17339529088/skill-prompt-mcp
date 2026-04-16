# DOCX Skill V2 详细方案（确定性优先、Linux 可运行、无后端）

## 1. 方案状态

- 状态：**V2 提案（可直接进入实现）**
- 运行目标：**Linux 优先**，兼容 Windows/macOS
- 交付形态：**本地 Skill + 本地 CLI 流水线**（无后端服务）
- 人工介入：正常流水线 **不需要人工介入**

---

## 2. V2 相比 V1 的核心变化

V2 将核心策略从“模型直接生成带标注 Markdown”升级为更可控架构：

1. **结构锁定（Structure Lock）**：先冻结源文档结构与高风险版式要素。
2. **槽位填充（Slot Fill）**：模型只填预定义槽位（段落/列表/表格单元格/图片说明等）。
3. **确定性渲染优先**：渲染由规则驱动，不由模型直接拼整篇文档。
4. **自动修复回路**：校验失败后，定向再生成 + 再 patch。
5. **本地终整引擎适配层**：可选本地 office 引擎做字段与版面稳定化。

在“无人审阅”前提下，这是当前性价比最高方案。

---

## 3. 目标效果

实现以下一条龙用户体验：

1. 用户提供 `source.docx` + 指令，或仅提供指令（无模板模式）。
2. 系统解析为 **模板图（template graph）** 与 **槽位约束（slot schema）**，或在缺少源文档时加载内置模板档案。
3. 模型生成 **满足 schema 的槽位内容 JSON**（可选导出 markdown 视图）。
4. 渲染器按槽位回写 OOXML，最大程度保留源样式与布局。
5. 自动校验 + 自动修复，无需人工修文档。
6. 输出与源模板高度相似的 `final.docx`。

---

## 4. 无人工介入下的预期还原率

V2 稳定后预期区间（企业模板混合样本）：

1. 简单商务文档（无复杂表格/图形）：**93%-97%**
2. 中等复杂文档（表格+图片+多级列表）：**90%-95%**
3. 高复杂文档（嵌套表格、浮动对象多、交叉引用重）：**86%-92%**
4. 常见综合加权目标：**91%-94%**
5. 无模板模式（未提供源模板）：常见区间 **80%-88%**

说明：
1. 该区间是可落地的工程预期，不是理论峰值。
2. Linux 可运行；最终分数会受字体一致性与模板质量影响。

---

## 5. 设计原则

1. **先锁再生**：可确定提取的结构不交给模型决策。
2. **生成受约束数据，不生成自由文档**：模型输出 slot JSON，不直接产整篇文档结构。
3. **最小化 patch**：未知 OOXML 区域尽量原样保留。
4. **多层校验**：语法、schema、结构、样式、编号、布局、媒体全链路校验。
5. **按差异修复**：仅重生成失败槽位，避免全量回炉。
6. **引擎可插拔**：默认 Linux 安全路径，后续可扩展本机其他引擎。

---

## 6. V2 端到端流程

1. **输入阶段**
   - `source.docx`（无模板模式下可选）
   - `instruction.txt` 或直接文本
   - 可选 `images/`, `data.json`
   - 无源文档时可选 `template-profile`

2. **模板分析阶段**
   - 若存在 `source.docx`：解析 OOXML 包和关系文件
   - 若缺少 `source.docx`：加载内置模板档案（自动或指定 profile ID）
   - 构建样式账本、编号映射、分节映射
   - 区分不可变结构块与可编辑槽位
   - 输出 `template-graph.json`、`slot-schema.json`

3. **内容生成阶段**
   - 基于槽位约束构建 prompt
   - 模型返回 `slot-fill.json`（严格 JSON）
   - 可选转出 `annotated.md` 供人工查看

4. **校验阶段**
   - JSON schema 校验
   - 槽位样式合法性校验
   - 列表编号和表格合并校验
   - 图片资源和媒体关系校验

5. **自动修复阶段**
   - 产出机器可读错误
   - 仅重生成失败槽位
   - 合并修复结果
   - 最大重试默认 3 次

6. **确定性渲染阶段**
   - 克隆源 OOXML
   - 仅 patch 可编辑槽位
   - 保留分节/页眉页脚/未知 XML
   - 输出 `rendered.docx`

7. **本地终整阶段（适配层）**
   - 默认 `libreoffice-headless`
   - 可扩展 onlyoffice/wps/word-local
   - 输出 `final.docx`

8. **保真评估阶段**
   - 结构差异
   - 文本/样式/布局/对象差异
   - 可选 PDF 视觉差异
   - 输出 `fidelity-report.{md,json}`

## 6.1 无模板模式规则

当用户未提供 `source.docx` 时，V2 仍需稳定执行：

1. 通过领域分类从本地模板库选择档案（如 `proposal`、`report`、`meeting-minutes`）。
2. 支持 `--template-profile` 显式覆盖自动选择结果。
3. 继续使用相同的 slot JSON 契约、校验链路和确定性渲染器。
4. 报告语义从“模板相似度”切换为“版式质量 + 结构正确性”。
5. 将选中档案写入运行产物（`selected-template-profile.json`）。

---

## 7. 模板图模型（Template Graph）

V2 引入更强的中间表示，作为确定性执行核心。

## 7.1 `template-graph.json` 结构

包含：

1. `docMeta`：纸张、页边距、分节数、语言、默认字体。
2. `styles`：段落/字符/表格样式定义及继承链。
3. `numbering`：`numId -> abstractNumId -> ilvl` 及格式。
4. `blocks`：按顺序的文档块树（段落/列表/表格/图片/图形/域等）。
5. `locks`：不可编辑块 ID 与不可编辑属性。
6. `slots`：可编辑区定义（类型、约束、容量提示）。
7. `mediaMap`：图片关系、尺寸、裁切、环绕与锚点。

## 7.2 槽位类型（首版）

1. `paragraph_slot`
2. `list_item_slot`
3. `table_cell_slot`
4. `caption_slot`
5. `image_replace_slot`
6. `header_text_slot`
7. `footer_text_slot`
8. `footnote_slot`

每个槽位包含：

1. 可用样式白名单
2. 行数/长度容量提示
3. 列表编号约束
4. 表格合并约束
5. 可选语言/语气约束

---

## 8. 模型输出契约（JSON First）

V2 以 JSON 为唯一可信输入，提升稳定性：

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
          "runs": [
            { "text": "Quarterly Report Summary", "charStyleId": "Strong" }
          ]
        }
      ]
    }
  ]
}
```

硬约束：

1. 不允许 schema 外字段。
2. style ID 必须命中白名单。
3. 不允许非法嵌套。
4. 列表/表格 payload 必须匹配槽位类型。
5. 图片槽位只允许引用白名单资源键。

Markdown 保留为展示/调试格式，不作为主渲染输入。

---

## 9. 为什么 V2 仍保留 Markdown 产物

为了兼容现有习惯与可读性：

1. 保留 `annotated.md` 作为可审阅产物。
2. 增加双向转换器：
   - `slot-fill.json -> annotated.md`
   - `annotated.md -> slot-fill.json`（严格解析）
3. 生产渲染只读 canonical JSON。

这样保留易读性，同时避免 markdown 语义歧义进入核心链路。

---

## 10. 确定性渲染器设计细节

按槽位路径 patch OOXML，并执行严格保留策略：

1. 未修改节点尽量保持字节稳定。
2. 保留分节/页面/页眉页脚版式基元。
3. 编号定义尽量复用，仅在槽位允许时映射调整。
4. 表格网格与合并关系不改，只替换单元格内容。
5. 图形锚点与环绕几何默认锁定，除非槽位允许变更。
6. 未识别扩展 XML 一律原样保留。

关键模块建议：

1. `render/patch-paragraph.ts`
2. `render/patch-list.ts`
3. `render/patch-table.ts`
4. `render/patch-image.ts`
5. `render/patch-header-footer.ts`
6. `render/write-docx.ts`

---

## 11. 自动修复策略（无人值守）

校验分层：

1. **Schema 校验器**：JSON 结构与必填字段。
2. **Style 校验器**：段落/字符/表格样式合法性。
3. **编号校验器**：列表深度与 `numId/ilvl` 连续性。
4. **表格校验器**：合并合法性、网格适配、禁改结构项。
5. **媒体校验器**：关系完整性、尺寸/裁切边界。
6. **布局守卫校验器**：溢出风险与保留区冲突。

修复回路算法：

1. 按槽位聚合错误
2. 构造最小修复提示
3. 仅重生失败槽位
4. 合并后再校验
5. 通过或达到重试上限则退出

默认最大重试：`3`

---

## 12. 本地终整引擎适配层（Linux 安全默认）

V2 增加可插拔 finalizer：

1. `none`：跳过终整（最快）
2. `libreoffice`：Linux 通用基线路径
3. `word-local`：本机 Word 引擎（平台可选）
4. `onlyoffice/wps`：后续可扩展

finalizer 负责：

1. 字段刷新（TOC/页码等，按能力 best effort）
2. 版面稳定化
3. 导出预览 PDF 供视觉 diff

Linux 默认优先 `libreoffice`；不可用时回退 `none` 并告警。

---

## 13. 保真评分与门禁

## 13.1 评分维度

1. `structureScore`：块结构、分节、列表/表格完整度
2. `styleScore`：样式匹配度与 run 级合法性
3. `layoutScore`：几何布局偏差
4. `visualScore`：PDF 像素/区域差异
5. `stabilityScore`：同环境重复运行一致性

## 13.2 建议加权

```text
docScore = 0.30*structure + 0.25*style + 0.25*layout + 0.15*visual + 0.05*stability
```

## 13.3 通过门槛

1. `docScore >= 90`
2. `structureScore >= 95`
3. 无阻断错误（rels 损坏、OOXML 包损坏、媒体缺失）
4. 无模板模式门槛：`docScore >= 82` 且无阻断错误

---

## 14. V2 项目目录建议

```text
tool_ai_docx_skill/
  package.json
  tsconfig.json
  skills/
    docx-high-fidelity/
      SKILL.md
      references/
        v1-annotation-spec.md
        v2-slot-json-spec.md
        prompt-contract.md
      scripts/
        run_pipeline.sh
        run_pipeline.ps1
  src/
    pipeline/
      run.ts
      config.ts
    ingest/
      open-docx.ts
      parse-ooxml.ts
      parse-style-ledger.ts
      parse-numbering.ts
      parse-sections.ts
      parse-media-map.ts
    template/
      build-template-graph.ts
      build-slot-schema.ts
      lock-structure.ts
    prompt/
      build-generation-prompt.ts
      build-repair-prompt.ts
    model/
      llm-client.ts
      generate-slot-fill.ts
      repair-slot-fill.ts
    contracts/
      template-graph.ts
      slot-schema.ts
      slot-fill.ts
      fidelity-report.ts
    validate/
      validate-schema.ts
      validate-style.ts
      validate-numbering.ts
      validate-table.ts
      validate-media.ts
      validate-layout-guard.ts
    render/
      patch-paragraph.ts
      patch-list.ts
      patch-table.ts
      patch-image.ts
      patch-header-footer.ts
      write-docx.ts
    finalize/
      finalize-none.ts
      finalize-libreoffice.ts
      finalize-router.ts
    fidelity/
      structure-diff.ts
      style-diff.ts
      layout-diff.ts
      visual-diff.ts
      score.ts
      report.ts
```

---

## 15. CLI 契约（V2）

```bash
pnpm tsx src/pipeline/run.ts \
  --source "/path/source.docx" \
  --template-mode "source|auto|profile" \
  --template-profile "business-report-a4" \
  --instruction "/path/instruction.txt" \
  --assets "/path/assets" \
  --out "/path/runs/run_002" \
  --model "qwen3-max" \
  --finalizer "libreoffice" \
  --max-repair 3
```

输出示例：

```text
run_002/
  input/
  extracted/
    template-graph.json
    slot-schema.json
  generated/
    slot-fill.raw.json
    slot-fill.validated.json
    annotated.md
  repaired/
    repair-1.json
    repair-2.json
  rendered/
    rendered.docx
    final.docx
  fidelity/
    fidelity-report.md
    fidelity-report.json
    structure-diff.json
    style-diff.json
    layout-diff.json
    visual-diff/
  logs/
    pipeline.log
```

---

## 16. Skill 打包约束

`skills/docx-high-fidelity/SKILL.md` 需要强制：

1. 触发条件：用户要求按给定 Word 模板高保真生成新文档
   - 或用户要求生成 Word，但未提供源模板
2. 固定链路：analyze -> generate(slot JSON) -> validate -> repair -> render -> finalize -> score
3. 硬约束：只接受 schema 合法输出；样式只允许白名单；槽位外结构不可改
4. 必备产物：`final.docx`, `slot-fill.validated.json`, `fidelity-report.md`

---

## 17. 单包交付清单（不分期）

一次性交付以下完整能力：

1. parser + template graph + slot schema
2. JSON-first prompt 与生成契约
3. 槽位级确定性渲染器
4. 全量校验器 + 自动修复循环
5. 本地终整路由（`none` + `libreoffice`）
6. 保真评分与报告链路
7. skill 打包与可运行脚本
8. 10 文档基准集自动化执行

---

## 18. 基准与验收

使用 10 文档混合复杂度数据集：

1. 至少 `9/10` 通过门禁
2. 加权平均 `docScore >= 91`
3. 法务/财报/公告类模板不允许硬失败
4. 同环境重复运行分数波动 <= 1.0

---

## 19. 风险与缓解

1. **风险**：模型仍可能产出边界非法 JSON
   - **缓解**：严格 schema 校验 + JSON 修复提示 + 生成 guardrails。
2. **风险**：Linux 字体差异拉低视觉分
   - **缓解**：运行镜像内统一字体包并执行字体策略。
3. **风险**：复杂浮动对象位置漂移
   - **缓解**：默认锁定锚点几何，仅开放必要可编辑字段。
4. **风险**：长表跨页导致布局异常
   - **缓解**：槽位容量提示 + 溢出校验 + 定向重写。
5. **风险**：高级 Word 特性超出支持
   - **缓解**：未知 XML 原样保留，并在报告中显式提示限制。

---

## 20. 性价比结论（无人介入前提）

在“无后端 + 无人工审阅”条件下，V2 是当前最优性价比路线：

1. 主要收益来自契约收敛与确定性渲染，而非盲目增加模型调用次数。
2. JSON-first 显著减少无效输出与返工成本。
3. Linux 下 `libreoffice` 终整成本低、可直接启用。
4. 架构完全本地化，天然适配 skill 形态。

调优后工程可达的常见区间：**平均 91%-94% 保真度**。
无模板模式常见区间：**80%-88%**（取决于模板库质量）。

---

## 21. 版本标记

- Plan Version: `v2.0-deterministic-slot-finalizer`
- Date: `2026-04-15`
- Owner: `docx skill project team`
- Runtime Baseline: `Linux`
- Review Trigger: 首轮完整 10-doc 基准报告产出后
