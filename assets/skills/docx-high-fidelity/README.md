# tool_ai_docx_skill

本项目是一个本地可运行的 DOCX 高保真生成/改写 skill，融合 V1 + V2 方案：

1. `source` 模式：基于用户参考 Word 模板做槽位级 OOXML patch（保留结构与样式）
2. `auto/profile` 模式：无模板生成（自动选择或指定模板档案）
3. JSON-first（`slot-fill`）+ Annotated Markdown++ 双链路
4. 自动校验 + 自动修复 + 保真评分
5. 支持图片替换、表格单元格填充、列表、页眉页脚、追加新增段落

## 当前支持范围

已支持：

1. 标题/段落样式填充
2. 列表项填充（含层级约束）
3. 表格单元格填充
4. 页眉/页脚文本填充
5. 图片槽位替换（按 `mediaKey`）
6. `source` 模式自由新增（文末追加段落，`slot_append_free`）

仍是限制项（保留但不做完整语义重建）：

1. SmartArt 深度重建
2. 复杂公式结构重排
3. 修订模式（Tracked Changes）语义重建
4. VBA 宏与 ActiveX 编辑

## 目录

```text
src/
  extract/        # OOXML 提取
  template/       # 模板图与槽位 schema
  model/          # JSON + Annotated 生成
  validate/       # 校验器与规则
  repair/         # 自动修复
  render/         # OOXML patch / 写回
  finalize/       # none/libreoffice
  fidelity/       # diff 与评分
  pipeline/       # run + benchmark
skills/
  docx-high-fidelity/
```

## 安装

```bash
npm install
```

## 运行

### 1) 基于参考模板改写（source）

```bash
npm run pipeline -- \
  --template-mode source \
  --source "D:/path/source.docx" \
  --instruction "生成一份新的版本" \
  --assets "D:/path/assets" \
  --out "./runs/run_001" \
  --finalizer none
```

说明：

1. `--assets` 可选；用于图片槽位替换，文件名按 `mediaKey` 前缀匹配，如 `media-1.png`。
2. `source` 模式会自动增加一个 `slot_append_free`，用于文末追加新增段落内容。

### 2) 无模板生成（auto/profile）

```bash
npm run pipeline -- \
  --template-mode auto \
  --instruction "生成一份项目周报" \
  --out "./runs/run_auto" \
  --finalizer none
```

```bash
npm run pipeline -- \
  --template-mode profile \
  --template-profile business-report-a4 \
  --instruction "生成季度经营简报" \
  --out "./runs/run_profile" \
  --finalizer none
```

## 测试

```bash
npm run test:all
```

## 10 文档基准

```bash
npm run benchmark -- --dataset ./benchmarks/sample10 --out ./runs/benchmark_sample10
```

## 输出产物

典型运行目录：

```text
runs/run_xxx/
  input/
  extracted/
    template-manifest.json
    template-graph.json
    slot-schema.json
  generated/
    slot-fill.raw.json
    slot-fill.validated.json
    annotated.raw.md
    annotated.validated.md
  repaired/
  rendered/
    rendered.docx
    final.docx
  fidelity/
    fidelity-report.json
    fidelity-report.md
```

## 打包最终 skill（release 资产）

Windows PowerShell：

```powershell
$root = "D:\java\project\play\tool_ai_docx_skill"
$releaseDir = Join-Path $root "release"
New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null
$zipPath = Join-Path $releaseDir "docx-high-fidelity-skill-v2.0.0.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path "$root\skills\docx-high-fidelity\*" -DestinationPath $zipPath
```

## Git 上传与 Release 建议流程

```bash
git init
git add .
git commit -m "feat: final docx skill v2"
git remote add origin <YOUR_GIT_URL>
git push -u origin main
```

然后在你的 Git 平台创建 `v2.0.0` Release，并上传 `release/docx-high-fidelity-skill-v2.0.0.zip`。
