# DOCX Skill V1 详细方案（Linux 可运行）

## 1. 方案状态

- 状态：**Frozen (V1)**
- 运行目标：**Linux（主目标）**，Windows/macOS 兼容
- 交付形态：**本地 Skill + 本地 CLI 流水线**（无后端服务）
- V2 特性：**待定 / 延后**

---

## 2. 目标

构建一个本地 skill，能够：

1. 将用户提供的 `.docx` 解析为可复用的高保真模板模型。
2. 约束模型输出符合模板规则的带标注 Markdown 内容。
3. 把生成内容回写为 `.docx`，最大程度保留原 Word 布局与样式。
4. 输出保真度评分和差异产物，用于质量门禁。
5. 在用户未提供 `.docx` 时，支持 **无模板模式**（自动选择内置基础模板档案）。

---

## 3. 范围冻结

## 3.1 V1 范围内（In Scope）

1. 本地 CLI 全流程执行。
2. OOXML 解析：
   - `word/document.xml`
   - `word/styles.xml`
   - `word/numbering.xml`
   - `word/header*.xml`
   - `word/footer*.xml`
   - `word/_rels/*.rels`
   - `word/media/*`
3. 模板清单（manifest）生成。
4. 带标注 Markdown++ 生成（模型驱动 + Prompt 约束）。
5. 校验 + 自动修复（1-2 次重试）。
6. 基于 OOXML patch 的 `.docx` 渲染。
7. 保真度报告：
   - 结构分（Structure Score）
   - 视觉分（PDF Diff）
8. 无模板生成路径：
   - 当缺少 `source.docx` 时自动选择内置模板档案。
   - 继续执行同一套 generate/validate/repair/render 流程。

## 3.2 V1 不包含（Out of Scope）

1. HTTP API / 后端服务。
2. Word COM 自动化。
3. SDT 优先模板编写流程。
4. SmartArt/公式的完整语义重建。
5. 修订模式（Tracked Changes）重建。

## 3.3 延后到 V2（Pending）

1. Word COM 最终收敛路径。
2. SDT 槽位优先工作流。
3. 双引擎路由（OOXML vs COM）。
4. 视觉闭环二次修复。

---

## 4. 目标仓库与目录

推荐新项目目录（与当前项目同级）：

`D:\java\project\play\tool_ai_docx_skill`

```text
tool_ai_docx_skill/
  package.json
  pnpm-workspace.yaml
  tsconfig.json
  README.md
  skills/
    docx-high-fidelity/
      SKILL.md
      references/
        annotation-spec.md
        prompt-contract.md
      scripts/
        run_pipeline.ps1
        run_pipeline.sh
  src/
    pipeline/
      run.ts
    extract/
      unzip-docx.ts
      parse-styles.ts
      parse-numbering.ts
      parse-structure.ts
      parse-media.ts
      build-template-manifest.ts
    prompt/
      build-prompt.ts
    model/
      model-client.ts
      generate-annotated-md.ts
    validate/
      validate-annotated-md.ts
      rules/
        tag-pair-rule.ts
        style-whitelist-rule.ts
        no-html-rule.ts
        no-nested-character-rule.ts
        list-rule.ts
    repair/
      repair-annotated-md.ts
    render/
      patch-document.ts
      patch-lists.ts
      patch-tables.ts
      patch-images.ts
      patch-header-footer.ts
      write-docx.ts
    fidelity/
      structure-diff.ts
      visual-diff.ts
      report.ts
    contracts/
      template-manifest.ts
      generation-contract.ts
      fidelity-report.ts
```

---

## 5. 技术栈（Linux 友好）

1. Node.js 22 LTS
2. TypeScript 5.x
3. 包管理：pnpm
4. ZIP/OOXML：
   - `jszip`
   - `@xmldom/xmldom`
   - `xpath`
   - `fast-xml-parser`
5. Markdown 解析：
   - `unified`
   - `remark-parse`
6. Schema 校验：
   - `zod`
7. Diff/图像：
   - `pdfjs-dist`
   - `canvas`
   - `pixelmatch`
8. 工具：
   - `commander`（CLI）
   - `pino`（日志）
9. PDF 渲染依赖：
   - Linux 下 `libreoffice` headless

---

## 6. 端到端流程

1. **输入**
   - `source.docx`（无模板模式下可选）
   - `instruction.txt`（或直接文本）
   - 可选 `assets/`（图片替换）
   - 可选 `template-profile`（无 `source.docx` 时使用）

2. **模板决议**
   - 若提供 `source.docx`：解析源 OOXML 并生成模板清单
   - 若未提供 `source.docx`：加载内置模板档案（自动或显式 profile ID）
3. **模板提取**
   - 解压 `.docx`
   - 解析 styles/numbering/document/header/footer/media/rels
   - 识别候选槽位
   - 输出 `template-manifest.json`

4. **Prompt 构建**
   - 注入样式白名单
   - 注入编号约束（`numId/ilvl`）
   - 注入表格合并约束（`<<`, `^^`）
   - 注入图片槽位约束

5. **模型生成**
   - 生成 `annotated.md`
   - 保存原始模型输出

6. **校验**
   - 语法与契约检查
   - 失败时输出 `validation-errors.json`

7. **修复回路**
   - 将错误反馈给模型
   - 重新生成修复后的 markdown
   - 最大重试：2 次

8. **渲染**
   - 克隆 source OOXML 包
   - 按槽位 patch 内容
   - 保留未修改 XML 区域
   - 输出 `final.docx`

9. **保真度评估**
   - 结构 diff（模板 vs 渲染后）
   - 视觉 diff（source PDF vs final PDF）
   - 输出 `fidelity-report.md`

10. **交付产物**
   - `annotated.md`
   - `final.docx`
   - `fidelity-report.md`
   - `diff-images/*`

---

## 7. 数据契约

## 7.1 模板清单（示例）

```json
{
  "templateId": "tpl_20260415_001",
  "styles": {
    "paragraph": ["Normal", "Heading1", "Heading2"],
    "character": ["Strong", "Emphasis"],
    "table": ["TableGrid"]
  },
  "numbering": [
    { "numId": 7, "abstractNumId": 3, "levels": [0, 1, 2] }
  ],
  "slots": [
    { "slotId": "main_body_01", "type": "paragraph_block", "path": "/w:document/w:body/..." },
    { "slotId": "table_01", "type": "table_block", "path": "/w:document/w:body/..." },
    { "slotId": "img_hero", "type": "image_slot", "rId": "rId12" }
  ],
  "sections": [
    { "index": 0, "pageSize": "A4", "orientation": "portrait" }
  ]
}
```

## 7.2 Annotated Markdown++ 规则

1. 允许的块级标注：
   - `<!-- style:paragraph:STYLE_ID --> ... <!-- /style:paragraph -->`
   - `<!-- style:table:STYLE_ID --> ... <!-- /style:table -->`
   - `<!-- style:list:STYLE_ID;numId=N;ilvl=L --> ... <!-- /style:list -->`
2. 允许的行内标注：
   - `<!-- style:character:STYLE_ID --> ... <!-- /style:character -->`
3. 禁止 HTML 标签（`<strong>`, `<span>` 等）。
4. 禁止 `style:character` 嵌套。
5. `STYLE_ID` 必须来自 manifest 白名单。

## 7.3 保真度报告字段（示例）

```json
{
  "docScore": 89.4,
  "structureScore": 92.1,
  "layoutScore": 86.7,
  "visualScore": 88.3,
  "stabilityScore": 100,
  "blockingIssues": [],
  "warnings": ["page_3 image offset > threshold"]
}
```

---

## 8. 模块职责

## 8.1 `extract/*`

1. 从 OOXML 构建模板资产清单。
2. 解析样式继承并计算有效样式候选。
3. 构建编号映射（`numId -> abstractNumId -> ilvl`）。
4. 基于书签/内容模式/节边界识别候选槽位。

## 8.2 `prompt/*`

1. 生成确定性的 prompt payload。
2. 仅注入合法 style ID 与约束。
3. 编码硬约束（无 HTML、标签闭合、style ID 合法）。

## 8.3 `validate/*`

1. 解析 markdown 标注。
2. 检查标签平衡、样式合法、嵌套合法、列表参数合法。
3. 输出机器可读错误列表。

## 8.4 `repair/*`

1. 将校验错误压缩为修复提示。
2. 在不改变语义的前提下修正格式/契约错误。

## 8.5 `render/*`

1. 段落块 patch（尽量保留原样式结构）。
2. 列表块 patch（带编号映射）。
3. 表格块 patch（保留合并关系）。
4. 图片 patch（替换 media 并按需更新 rels）。
5. 默认保留页眉/页脚/分节，除非目标槽位显式命中。

## 8.6 `fidelity/*`

1. 基于 OOXML 元数据做结构 diff。
2. 基于 PDF 做视觉 diff。
3. 加权评分并输出报告。

---

## 9. CLI 契约

## 9.1 命令

```bash
pnpm tsx src/pipeline/run.ts \
  --source "/path/source.docx" \
  --template-mode "source|auto|profile" \
  --template-profile "business-report-a4" \
  --instruction "/path/instruction.txt" \
  --assets "/path/assets" \
  --out "/path/runs/run_001" \
  --model "qwen3-max"
```

## 9.2 输出目录

```text
run_001/
  input/
    source.docx
    instruction.txt
  extracted/
    template-manifest.json
  generated/
    annotated.raw.md
    annotated.validated.md
  rendered/
    final.docx
  fidelity/
    fidelity-report.md
    structure-diff.json
    diff-images/
  logs/
    pipeline.log
```

---

## 10. Linux 运行说明

1. 安装 LibreOffice 用于 headless PDF 转换。
2. 确保字体包一致，避免视觉 diff 漂移。
3. 使用 UTF-8 locale，保证 XML/文本处理一致性。
4. V1 不引入任何 OS 特定 COM 依赖。

---

## 11. 质量门禁（V1）

1. 样式白名单命中率 >= 98%。
2. 列表编号一致性 >= 99%。
3. 表格结构一致性 >= 99%。
4. OOXML 包完整无损坏。
5. media rels 无缺失。
6. 加权总分 >= 85 才通过。
7. 无模板模式下布局质量分 >= 80。

---

## 12. 10 文档验收基线

沿用已约定 10-doc 测试矩阵，并强制：

1. 至少 8/10 文档达到各自最低线。
2. 加权平均分 >= 85。
3. DOC-01 至 DOC-06 不允许硬性失败。

---

## 13. 风险与缓解

1. **风险**：模型输出非法标注语法
   - **缓解**：严格校验器 + 自动修复循环。
2. **风险**：列表编号漂移
   - **缓解**：强约束 `numId/ilvl` + 渲染器映射校验。
3. **风险**：表格合并损坏
   - **缓解**：锁定合并结构，仅 patch 单元格文本。
4. **风险**：字体差异导致视觉漂移
   - **缓解**：Linux 运行镜像中固定字体集合。
5. **风险**：复杂对象退化
   - **缓解**：未知 OOXML 区域按原样保留。

---

## 14. Skill 打包要求

`skills/docx-high-fidelity/SKILL.md` 必须包含：

1. 触发条件：
   - 用户要求模仿已上传 Word 的样式与排版。
   - 用户要求生成与源 `.docx` 高相似度的文档。
2. 固定执行链路：
   - extract -> generate -> validate -> repair -> render -> fidelity
3. 必需输出：
   - `final.docx`, `annotated.md`, `fidelity-report.md`
4. 硬约束：
   - annotated markdown 禁止 HTML
   - style ID 必须来自白名单
   - 所有 style 标签必须成对闭合

---

## 15. 版本标记

- Plan Version: `v1.0-linux-frozen`
- Date: `2026-04-15`
- Owner: `docx skill project team`
- Next Review: 首轮 10-doc 基准测试完成后
