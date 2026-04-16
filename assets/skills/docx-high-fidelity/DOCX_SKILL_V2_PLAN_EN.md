# DOCX Skill V2 Detailed Plan (Deterministic-First, Linux-Ready, No Backend)

## 1. Plan Status

- Status: **Proposed V2 (ready for implementation)**
- Runtime Target: **Linux-first**, compatible with Windows/macOS
- Delivery Form: **Local Skill + Local CLI Pipeline** (no backend service)
- Human Intervention: **None required** in normal runs

---

## 2. What V2 Changes vs V1

V2 upgrades the core strategy from “model generates annotated markdown directly” to a higher-control architecture:

1. **Structure Lock**: freeze document structure and high-risk layout primitives from the source `.docx`.
2. **Slot Fill**: model fills only predefined content slots (paragraph/list/table-cell/image-caption/etc.).
3. **Deterministic Renderer First**: rendering is rule-driven, not model-driven.
4. **Auto-Repair Loop**: validation + targeted regeneration + deterministic patch retries.
5. **Local Finalizer Adapter**: optional local office engine normalization step for fields/layout stabilization.

This is the highest cost-performance approach without manual review.

---

## 3. Target Outcome

Build a skill that supports this one-shot user flow:

1. User provides a source Word file (`source.docx`) + writing instruction, or provides only instruction (template-optional mode).
2. System parses source into a **template graph** and **slot schema**, or loads a built-in template profile when source is absent.
3. Model generates **schema-valid slot content** (JSON first, markdown optional view).
4. Renderer patches source OOXML with slot content while preserving style/layout structure.
5. Validator + repair loop fixes structural/style/layout violations automatically.
6. Output `final.docx` highly similar to source style and layout.

---

## 4. Expected Fidelity (No Manual Intervention)

Expected range after V2 stabilization (based on mixed enterprise templates):

1. Simple business docs (no complex tables/charts): **93%-97%**
2. Medium complexity docs (tables + images + multi-level lists): **90%-95%**
3. Complex docs (nested tables, many floating shapes, heavy cross-references): **86%-92%**
4. Typical weighted average target: **91%-94%**
5. Template-optional mode (no source template provided): **80%-88%** typical range

Notes:
1. This is a realistic production range, not a theoretical peak.
2. Linux-only environment is supported; exact score depends on font parity and template quality.

---

## 5. Core Design Principles

1. **Lock before generate**: never let the model decide structure that can be extracted deterministically.
2. **Generate constrained data, not free-form documents**: model outputs slot payload JSON under strict schema.
3. **Patch minimally**: preserve unknown OOXML regions verbatim whenever possible.
4. **Validate at multiple layers**: syntax, schema, structure, style, numbering, layout, media.
5. **Repair by delta**: feed only violations back to model; avoid full regeneration unless needed.
6. **Engine abstraction**: keep renderer/finalizer pluggable with Linux-safe default.

---

## 6. End-to-End Pipeline (V2)

1. **Input Stage**
   - `source.docx` (optional in template-optional mode)
   - `instruction.txt` or inline prompt
   - optional external assets (`images/`, `data.json`)
   - optional `template-profile` for no-source runs

2. **Template Analysis Stage**
   - if `source.docx` exists: parse OOXML package + relationships
   - if `source.docx` is absent: load built-in template profile (auto or explicit profile ID)
   - build style ledger, numbering map, section map
   - detect immutable blocks vs editable slots
   - output `template-graph.json` and `slot-schema.json`

3. **Generation Stage**
   - build constrained prompt with slot schema + style whitelist
   - model returns `slot-fill.json` (strict JSON schema)
   - optional convert to human-readable `annotated.md`

4. **Validation Stage**
   - validate JSON schema
   - validate slot-level style constraints
   - validate list numbering and table merge legality
   - validate image references and media constraints

5. **Auto-Repair Stage**
   - produce machine-readable errors
   - targeted regenerate only failed slots
   - merge corrected slots
   - max retry count configurable (default: 3)

6. **Deterministic Render Stage**
   - clone source OOXML
   - patch only editable slot nodes
   - preserve section/header/footer/unknown XML blocks
   - output `rendered.docx`

7. **Local Finalizer Stage (Adapter)**
   - default: `libreoffice-headless` normalize pass
   - optional adapters: onlyoffice/wps/word-local (if available)
   - output `final.docx`

8. **Fidelity Stage**
   - structure diff
   - text/style/layout/object diff
   - optional visual PDF diff
   - output `fidelity-report.{md,json}`

## 6.1 Template-Optional Mode Rules

When user does not provide `source.docx`, V2 must still run successfully:

1. Choose template profile from local library by domain classifier (`proposal`, `report`, `meeting-minutes`, etc.).
2. Allow explicit override by `--template-profile`.
3. Use the same slot JSON contract, validator stack, and deterministic renderer.
4. Switch report semantics from “template similarity” to “format quality + structural correctness”.
5. Record selected profile in run artifacts (`selected-template-profile.json`).

---

## 7. Template Graph Model

V2 introduces a richer deterministic intermediate representation.

## 7.1 `template-graph.json`

Contains:

1. `docMeta`: page size, margins, section count, language, default fonts.
2. `styles`: paragraph/character/table style definitions and inheritance.
3. `numbering`: `numId -> abstractNumId -> ilvl` chain and format metadata.
4. `blocks`: ordered block tree (paragraph/list/table/image/shape/field/etc.).
5. `locks`: immutable block IDs and immutable properties.
6. `slots`: editable regions with type, constraints, and capacity hints.
7. `mediaMap`: image IDs, rel targets, crop/size/wrap anchor metadata.

## 7.2 Slot Types (initial)

1. `paragraph_slot`
2. `list_item_slot`
3. `table_cell_slot`
4. `caption_slot`
5. `image_replace_slot`
6. `header_text_slot`
7. `footer_text_slot`
8. `footnote_slot`

Each slot has:

1. allowed styles
2. max line hints
3. list/numbering constraints
4. table merge constraints
5. optional language/tone constraints

---

## 8. Model Output Contract (JSON-First)

V2 generation contract is JSON-first for reliability:

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

Rules:

1. No out-of-schema fields.
2. No style IDs outside whitelist.
3. No illegal nesting.
4. List/table payload must match slot type.
5. Image slot payload must reference allowed source or generated asset key.

Markdown is retained as a view/export format, not the source of truth.

---

## 9. Why V2 Still Supports Markdown

To stay compatible with existing workflow and debugging habits:

1. Keep `annotated.md` as optional artifact for human review.
2. Add converter:
   - `slot-fill.json -> annotated.md`
   - `annotated.md -> slot-fill.json` (strict parser)
3. Production rendering reads canonical JSON only.

This keeps compatibility while avoiding markdown ambiguity in core execution.

---

## 10. Deterministic Renderer Details

Renderer patches source OOXML by slot path, with strict preservation rules:

1. Keep unmodified XML nodes byte-stable when possible.
2. Preserve section/page/header/footer layout primitives.
3. Preserve numbering definitions and remap only where slot allows.
4. Preserve table grid/merge geometry; replace cell payload only.
5. Preserve drawing anchor geometry (position, wrapping, extents) unless slot allows change.
6. Preserve unknown/custom XML extensions untouched.

Critical module set:

1. `render/patch-paragraph.ts`
2. `render/patch-list.ts`
3. `render/patch-table.ts`
4. `render/patch-image.ts`
5. `render/patch-header-footer.ts`
6. `render/write-docx.ts`

---

## 11. Auto-Repair Strategy (No Manual Ops)

Validation layers:

1. **Schema Validator**: JSON schema and required fields.
2. **Style Validator**: paragraph/character/table style legality.
3. **Numbering Validator**: list depth and `numId/ilvl` continuity.
4. **Table Validator**: merge consistency, grid fit, forbidden structure changes.
5. **Media Validator**: rel integrity, dimension/crop bounds.
6. **Layout Guard Validator**: overflow risk and reserved block collision heuristics.

Repair loop algorithm:

1. aggregate errors by slot
2. produce compact fix prompts per slot
3. regenerate only failed slots
4. revalidate patched result
5. stop on pass or retry limit

Default max retries: `3`

---

## 12. Local Finalizer Adapter (Linux-Safe Default)

V2 includes a pluggable local finalizer:

1. `none`: skip finalizer (fastest)
2. `libreoffice`: Linux-safe baseline normalization
3. `word-local`: optional local Word engine adapter (platform dependent)
4. `onlyoffice/wps`: optional future adapters

Finalizer responsibilities:

1. field refresh best effort (TOC/page fields where supported)
2. layout normalization pass
3. export preview PDF for visual diff

Skill defaults to `libreoffice` on Linux when installed; otherwise falls back to `none` with warning.

---

## 13. Fidelity Scoring and Gate

## 13.1 Score Dimensions

1. `structureScore` (block tree + sections + list/table integrity)
2. `styleScore` (style ID match, run-level style legality)
3. `layoutScore` (line/page/object geometry deviation)
4. `visualScore` (PDF pixel/region diff)
5. `stabilityScore` (run-to-run determinism)

## 13.2 Suggested Weighted Formula

```text
docScore = 0.30*structure + 0.25*style + 0.25*layout + 0.15*visual + 0.05*stability
```

## 13.3 Pass Gate

1. `docScore >= 90`
2. `structureScore >= 95`
3. no blocking errors (broken rels, corrupted OOXML, missing media)
4. template-optional mode gate: `docScore >= 82` and no blocking errors

---

## 14. Project Layout (V2)

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

## 15. CLI Contract (V2)

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

Output example:

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

## 16. Skill Packaging Requirements

`skills/docx-high-fidelity/SKILL.md` must enforce:

1. trigger: user asks to generate a new Word document highly similar to a given source Word
   - also trigger when user asks for Word output but provides no source template
2. fixed chain: analyze -> generate(slot JSON) -> validate -> repair -> render -> finalize -> score
3. hard constraints: schema-valid output only, style whitelist only, no structure edits outside slots
4. mandatory artifacts: `final.docx`, `slot-fill.validated.json`, `fidelity-report.md`

---

## 17. Single Integrated Delivery Checklist (No Phase Split)

Implement the following as one complete delivery package:

1. parser + template graph + slot schema
2. JSON-first prompt and generation contract
3. deterministic renderer with slot-level patching
4. full validator stack + auto-repair loop
5. local finalizer router (`none` + `libreoffice`)
6. fidelity scoring/report pipeline
7. skill packaging + runnable scripts
8. 10-doc benchmark automation

---

## 18. Benchmark and Acceptance

Use a 10-doc benchmark set with mixed complexity:

1. at least `9/10` documents pass the gate
2. weighted average `docScore >= 91`
3. no hard failures on legal/finance/public-report templates
4. deterministic rerun variance <= 1.0 score point on same environment

---

## 19. Risks and Mitigation

1. **Risk**: model still outputs edge-case invalid JSON
   - **Mitigation**: strict schema validation + JSON repair prompt + tokenizer guardrails.
2. **Risk**: Linux font differences reduce visual score
   - **Mitigation**: bundle controlled font packs in runtime image and enforce font policy.
3. **Risk**: floating objects drift in complex templates
   - **Mitigation**: lock anchor geometry and restrict editable object fields.
4. **Risk**: long tables overflow pages
   - **Mitigation**: add slot capacity hints + overflow validator + targeted rewrite.
5. **Risk**: unsupported advanced Word features
   - **Mitigation**: preserve unknown XML untouched and report limitation explicitly.

---

## 20. Cost-Performance Positioning (No Human Review)

For the “no backend, no manual intervention” constraint, this V2 is the best ROI path:

1. Most improvements come from contract and deterministic rendering, not expensive model retries.
2. JSON-first slot fill reduces invalid-output waste significantly.
3. Local finalizer is optional and cheap to enable on Linux (`libreoffice`).
4. Architecture remains fully local and skill-friendly.

Expected practical band after tuning: **91%-94% average fidelity**.
Template-optional practical band: **80%-88%** (depends on template-library quality).

---

## 21. Version Marker

- Plan Version: `v2.0-deterministic-slot-finalizer`
- Date: `2026-04-15`
- Owner: `docx skill project team`
- Runtime Baseline: `Linux`
- Review Trigger: after first complete 10-doc benchmark report
