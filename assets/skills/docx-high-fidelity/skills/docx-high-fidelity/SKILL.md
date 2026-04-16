# DOCX High Fidelity Skill

## Trigger

Use this skill when either condition is true:

1. User asks to generate a new Word document with high fidelity to a provided source `.docx` template.
2. User asks to generate a Word document but no source template is provided (template-optional mode).

## Fixed Pipeline

Always execute in this order:

1. `extract` (OOXML parse + template-manifest/template-graph/slot-schema)
2. `generate` (JSON-first slot fill + Annotated Markdown++)
3. `validate` (annotation + slot-schema/style/numbering/table/media/layout)
4. `repair` (annotation repair + slot-level JSON repair)
5. `render` (source patch if source exists; deterministic render otherwise)
6. `finalize` (`none` or `libreoffice`)
7. `fidelity` (structure/layout/style/visual scoring + report)

## Hard Constraints

1. JSON output must satisfy slot schema.
2. Style IDs must come from template whitelist.
3. Structure outside slots must stay unchanged in source patch mode.
4. Annotated Markdown++ cannot contain HTML tags.
5. All style tags must be paired.

## Required Artifacts

Every run must include:

1. `rendered/final.docx`
2. `generated/slot-fill.validated.json`
3. `generated/annotated.validated.md`
4. `fidelity/fidelity-report.md`

## CLI Examples

```bash
pnpm tsx src/pipeline/run.ts \
  --source "/path/source.docx" \
  --template-mode source \
  --instruction "/path/instruction.txt" \
  --out "/path/runs/run_001" \
  --finalizer libreoffice
```

```bash
pnpm tsx src/pipeline/run.ts \
  --template-mode auto \
  --instruction "Generate a project report with conclusions and risks" \
  --out "/path/runs/run_002" \
  --finalizer none
```

```bash
pnpm tsx src/pipeline/benchmark.ts \
  --dataset "/path/10-doc-set" \
  --out "/path/runs/benchmark"
```
