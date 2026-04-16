# DOCX Skill V1 Detailed Plan (Linux-Ready)

## 1. Plan Status

- Status: **Frozen (V1)**
- Runtime Target: **Linux (primary)**, Windows/macOS as compatible targets
- Delivery Form: **Local Skill + Local CLI Pipeline** (no backend service)
- V2 Features: **Pending / Deferred**

---

## 2. Goal

Build a local skill that can:

1. Parse a user-provided `.docx` into a reusable high-fidelity template model.
2. Ask the model to generate template-constrained annotated markdown content.
3. Convert generated content back into `.docx` while preserving original Word layout/style as much as possible.
4. Output fidelity scores and difference artifacts for quality gating.
5. Run in a **template-optional mode** when no user `.docx` is provided, by selecting a built-in base template profile.

---

## 3. Scope Freeze

## 3.1 In Scope (V1)

1. Local pipeline execution from CLI.
2. OOXML parsing for:
   - `word/document.xml`
   - `word/styles.xml`
   - `word/numbering.xml`
   - `word/header*.xml`
   - `word/footer*.xml`
   - `word/_rels/*.rels`
   - `word/media/*`
3. Template manifest generation.
4. Annotated Markdown++ generation (model-driven, prompt-constrained).
5. Validation + auto-repair loop (1-2 retries).
6. OOXML patch-based rendering to final `.docx`.
7. Fidelity report:
   - Structure score
   - Visual score (PDF diff)
8. Template-optional generation path:
   - Auto-select built-in template profile when `source.docx` is absent.
   - Continue with the same generate/validate/repair/render pipeline.

## 3.2 Out of Scope (V1)

1. HTTP API / backend service.
2. Word COM automation.
3. SDT-first authoring workflow.
4. SmartArt/formula full semantic rebuild.
5. Tracked changes reconstruction.

## 3.3 Deferred (V2, Pending)

1. Word COM finalizer path.
2. SDT slot-first workflow.
3. Dual-engine router (OOXML vs COM).
4. Visual closed-loop second-pass repair.

---

## 4. Target Repository and Layout

Recommended new project (same level as current project):

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

## 5. Tech Stack (Linux Friendly)

1. Node.js 22 LTS
2. TypeScript 5.x
3. Package manager: pnpm
4. ZIP/OOXML:
   - `jszip`
   - `@xmldom/xmldom`
   - `xpath`
   - `fast-xml-parser`
5. Markdown parsing:
   - `unified`
   - `remark-parse`
6. Schema validation:
   - `zod`
7. Diff/image:
   - `pdfjs-dist`
   - `canvas`
   - `pixelmatch`
8. Utilities:
   - `commander` (CLI)
   - `pino` (logs)
9. PDF rendering dependency:
   - `libreoffice` headless (Linux)

---

## 6. End-to-End Pipeline

1. **Input**
   - `source.docx` (optional in template-optional mode)
   - `instruction.txt` (or direct text)
   - optional `assets/` (image replacements)
   - optional `template-profile` (used when no `source.docx`)

2. **Template Resolve**
   - if `source.docx` is provided: parse source OOXML and build template manifest
   - if `source.docx` is absent: load built-in template profile (auto or explicit profile ID)
3. **Template Extract**
   - unzip `.docx`
   - parse styles/numbering/document/header/footer/media/rels
   - detect candidate slots
   - output `template-manifest.json`

4. **Prompt Build**
   - inject style whitelist
   - inject numbering constraints (`numId/ilvl`)
   - inject table merge constraints (`<<`, `^^`)
   - inject image slot constraints

5. **Model Generate**
   - generate `annotated.md`
   - save raw model output

6. **Validate**
   - syntax and contract checks
   - if failed -> produce `validation-errors.json`

7. **Repair Loop**
   - pass errors back to model
   - regenerate patched markdown
   - max retries: 2

8. **Render**
   - clone source OOXML package
   - patch content in target slots
   - preserve unmodified XML regions
   - output `final.docx`

9. **Fidelity**
   - structure diff (`template-manifest` vs rendered manifest)
   - visual diff (source PDF vs final PDF)
   - output `fidelity-report.md`

10. **Deliverables**
   - `annotated.md`
   - `final.docx`
   - `fidelity-report.md`
   - `diff-images/*`

---

## 7. Data Contracts

## 7.1 Template Manifest (example)

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

## 7.2 Annotated Markdown++ Rules

1. Allowed block tags:
   - `<!-- style:paragraph:STYLE_ID --> ... <!-- /style:paragraph -->`
   - `<!-- style:table:STYLE_ID --> ... <!-- /style:table -->`
   - `<!-- style:list:STYLE_ID;numId=N;ilvl=L --> ... <!-- /style:list -->`
2. Allowed inline tag:
   - `<!-- style:character:STYLE_ID --> ... <!-- /style:character -->`
3. No HTML tags (`<strong>`, `<span>`, etc.).
4. No nested `style:character`.
5. `STYLE_ID` must be in manifest whitelist.

## 7.3 Fidelity Report (example fields)

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

## 8. Module Responsibilities

## 8.1 `extract/*`

1. Build template inventory from OOXML.
2. Resolve style inheritance and effective style candidates.
3. Build numbering map (`numId -> abstractNumId -> ilvl`).
4. Detect slot candidates by bookmark/content pattern/section boundaries.

## 8.2 `prompt/*`

1. Produce deterministic prompt payload.
2. Inject only valid style IDs and constraints.
3. Encode hard rules (no HTML, no unclosed tags, no invalid style IDs).

## 8.3 `validate/*`

1. Parse markdown annotations.
2. Check tag balance, style legality, nesting legality, list params.
3. Produce machine-readable error list.

## 8.4 `repair/*`

1. Convert validation errors to compact fix prompts.
2. Keep original content semantics while correcting format/contract issues.

## 8.5 `render/*`

1. Patch paragraph blocks with style-preserving strategy.
2. Patch list blocks with numbering mapping.
3. Patch tables with merge-preserving logic.
4. Patch images by replacing media + updating rels if needed.
5. Preserve headers/footers/sections unless explicit slot targets them.

## 8.6 `fidelity/*`

1. Structure diff from OOXML metadata.
2. Visual diff from rendered PDFs.
3. Weighted scoring and output report.

---

## 9. CLI Contract

## 9.1 Command

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

## 9.2 Output Folder

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

## 10. Linux Runtime Notes

1. Install LibreOffice for headless PDF conversion.
2. Ensure font package parity for stable visual diff.
3. Set UTF-8 locale for consistent XML/text handling.
4. Avoid OS-specific COM dependencies in V1.

---

## 11. Quality Gates (V1)

1. Style whitelist hit rate >= 98%.
2. List numbering consistency >= 99%.
3. Table structure consistency >= 99%.
4. No broken OOXML package.
5. No missing media rels.
6. Final weighted score >= 85 for pass.
7. Template-optional mode minimum layout quality score >= 80.

---

## 12. 10-Doc Acceptance Baseline

Use the previously agreed 10-doc matrix and enforce:

1. At least 8/10 docs pass their minimum line.
2. Weighted average score >= 85.
3. DOC-01 to DOC-06 cannot fail hard constraints.

---

## 13. Risks and Mitigations

1. **Risk**: model outputs invalid annotation syntax
   - **Mitigation**: strict validator + auto-repair loop.
2. **Risk**: list/number drift
   - **Mitigation**: enforce `numId/ilvl` contract + renderer mapping checks.
3. **Risk**: table merge corruption
   - **Mitigation**: lock merge structure and only patch text cells.
4. **Risk**: visual drift due to fonts
   - **Mitigation**: controlled font set in Linux runtime image.
5. **Risk**: complex objects degraded
   - **Mitigation**: preserve unknown OOXML regions verbatim.

---

## 14. Skill Packaging Notes

`skills/docx-high-fidelity/SKILL.md` must include:

1. Trigger conditions:
   - User asks to mimic style/format of an uploaded Word.
   - User asks to generate content with high similarity to source `.docx`.
2. Fixed execution steps:
   - extract -> generate -> validate -> repair -> render -> fidelity
3. Required outputs:
   - `final.docx`, `annotated.md`, `fidelity-report.md`
4. Hard constraints:
   - no HTML in annotated markdown
   - style IDs from whitelist only
   - all style tags must be paired

---

## 15. Version Marker

- Plan Version: `v1.0-linux-frozen`
- Date: `2026-04-15`
- Owner: `docx skill project team`
- Next Review: after first full 10-doc benchmark run
