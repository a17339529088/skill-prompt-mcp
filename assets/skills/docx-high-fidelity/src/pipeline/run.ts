import { copyFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { existsSync } from "node:fs";
import { parseCliOptions, buildPipelinePaths } from "./config.js";
import { ensureDir, readUtf8, writeJson, writeUtf8 } from "../utils/files.js";
import { PipelineLogger } from "../utils/logger.js";
import { openDocx } from "../ingest/open-docx.js";
import { parseOoxml } from "../ingest/parse-ooxml.js";
import { parseStyleLedger } from "../ingest/parse-style-ledger.js";
import { parseNumbering } from "../ingest/parse-numbering.js";
import { parseSections } from "../ingest/parse-sections.js";
import { parseMediaMap } from "../ingest/parse-media-map.js";
import { buildTemplateGraph } from "../template/build-template-graph.js";
import { buildSlotSchema } from "../template/build-slot-schema.js";
import { validateSlotSchemaShape } from "../contracts/slot-schema.js";
import { DeterministicLocalLlmClient } from "../model/llm-client.js";
import { generateSlotFill } from "../model/generate-slot-fill.js";
import { validateSchema } from "../validate/validate-schema.js";
import { validateStyle } from "../validate/validate-style.js";
import { validateNumbering } from "../validate/validate-numbering.js";
import { validateTable } from "../validate/validate-table.js";
import { validateMedia } from "../validate/validate-media.js";
import { validateLayoutGuard } from "../validate/validate-layout-guard.js";
import type { ValidationIssue } from "../contracts/fidelity-report.js";
import { repairSlotFill } from "../model/repair-slot-fill.js";
import { patchParagraph } from "../render/patch-paragraph.js";
import { patchList } from "../render/patch-list.js";
import { patchTable } from "../render/patch-table.js";
import { patchImage } from "../render/patch-image.js";
import { patchHeaderFooter } from "../render/patch-header-footer.js";
import { writeDocx } from "../render/write-docx.js";
import { patchDocument } from "../render/patch-document.js";
import { finalizeRouter } from "../finalize/finalize-router.js";
import { diffStructure } from "../fidelity/structure-diff.js";
import { diffStyle } from "../fidelity/style-diff.js";
import { diffLayout } from "../fidelity/layout-diff.js";
import { diffVisual } from "../fidelity/visual-diff.js";
import { scoreDocument } from "../fidelity/score.js";
import { renderFidelityReportMarkdown } from "../fidelity/report.js";
import type { SlotFillDocument } from "../contracts/slot-fill.js";
import { unzipDocx } from "../extract/unzip-docx.js";
import { parseStructure } from "../extract/parse-structure.js";
import { buildTemplateManifest } from "../extract/build-template-manifest.js";
import { slotFillToAnnotatedMarkdown, annotatedMarkdownToSlotFill } from "../model/annotated-markdown.js";
import { validateAnnotatedMarkdown } from "../validate/validate-annotated-md.js";
import { repairAnnotatedMarkdown } from "../repair/repair-annotated-md.js";
import { DeterministicModelClient } from "../model/model-client.js";
import { generateAnnotatedMarkdown } from "../model/generate-annotated-md.js";

function mergeSlotFill(base: SlotFillDocument, patch: SlotFillDocument): SlotFillDocument {
  const map = new Map(base.fills.map((item) => [item.slotId, item]));
  for (const slot of patch.fills) {
    map.set(slot.slotId, slot);
  }
  return {
    templateId: base.templateId,
    fills: [...map.values()]
  };
}

function collectValidationIssues(
  fill: SlotFillDocument,
  schema: ReturnType<typeof buildSlotSchema>,
  graph: ReturnType<typeof buildTemplateGraph>["graph"]
): ValidationIssue[] {
  return [
    ...validateSchema(fill, schema),
    ...validateStyle(fill, schema),
    ...validateNumbering(fill),
    ...validateTable(fill),
    ...validateMedia(fill, graph),
    ...validateLayoutGuard(fill, schema)
  ];
}

async function materializeRunDirs(paths: ReturnType<typeof buildPipelinePaths>): Promise<void> {
  await Promise.all([
    ensureDir(paths.runRoot),
    ensureDir(paths.inputDir),
    ensureDir(paths.extractedDir),
    ensureDir(paths.generatedDir),
    ensureDir(paths.repairedDir),
    ensureDir(paths.renderedDir),
    ensureDir(paths.fidelityDir),
    ensureDir(resolve(paths.fidelityDir, "visual-diff")),
    ensureDir(paths.logsDir)
  ]);
}

async function readInstruction(instructionArg: string): Promise<string> {
  if (existsSync(instructionArg)) {
    return readUtf8(instructionArg);
  }
  return instructionArg;
}

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));
  const paths = buildPipelinePaths(options.outDir);
  await materializeRunDirs(paths);
  const logger = new PipelineLogger(resolve(paths.logsDir, "pipeline.log"));
  await logger.reset();

  await logger.info("Pipeline started.");
  const instruction = (await readInstruction(options.instruction)).trim();
  if (!instruction) {
    throw new Error("Instruction cannot be empty.");
  }

  if (existsSync(options.instruction)) {
    await copyFile(options.instruction, resolve(paths.inputDir, basename(options.instruction)));
  } else {
    await writeUtf8(resolve(paths.inputDir, "instruction.txt"), `${instruction}\n`);
  }

  let sourceStructure: Awaited<ReturnType<typeof parseStructure>> | undefined;
  if (options.source) {
    await openDocx(options.source);
    await copyFile(options.source, resolve(paths.inputDir, basename(options.source)));
    const { zip } = await unzipDocx(options.source);
    sourceStructure = await parseStructure(zip);
  }

  const [ooxmlSummary, styles, numbering, sectionInfo, mediaMap] = await Promise.all([
    parseOoxml(options.source),
    parseStyleLedger(options.source),
    parseNumbering(options.source),
    parseSections(options.source),
    parseMediaMap(options.source)
  ]);

  const templateGraphResult = buildTemplateGraph({
    templateMode: options.templateMode,
    instruction,
    sourcePath: options.source,
    profileId: options.templateProfile,
    styles,
    numbering,
    mediaMap,
    sectionInfo,
    ooxmlSummary,
    sourceStructure
  });

  const slotSchema = buildSlotSchema(templateGraphResult.graph);
  const slotSchemaCheck = validateSlotSchemaShape(slotSchema);
  if (!slotSchemaCheck.ok) {
    throw new Error(`slot schema invalid: ${slotSchemaCheck.errors.join("; ")}`);
  }

  const manifest = buildTemplateManifest(templateGraphResult.graph);

  await writeJson(resolve(paths.extractedDir, "template-graph.json"), templateGraphResult.graph);
  await writeJson(resolve(paths.extractedDir, "slot-schema.json"), slotSchema);
  await writeJson(resolve(paths.extractedDir, "template-manifest.json"), manifest);
  if (templateGraphResult.selectedProfile) {
    await writeJson(resolve(paths.runRoot, "selected-template-profile.json"), templateGraphResult.selectedProfile);
  }

  // V2 JSON-first generation
  const llmClient = new DeterministicLocalLlmClient();
  const generated = await generateSlotFill(instruction, slotSchema, options.model, llmClient);
  await writeUtf8(resolve(paths.generatedDir, "generation.prompt.txt"), generated.prompt);
  await writeJson(resolve(paths.generatedDir, "slot-fill.raw.json"), generated.fill);

  // V1 annotated generation (parallel compatibility output)
  const modelClient = new DeterministicModelClient();
  const v1Generated = await generateAnnotatedMarkdown(instruction, manifest, options.model, modelClient);
  await writeUtf8(resolve(paths.generatedDir, "annotation.prompt.txt"), v1Generated.prompt);
  await writeUtf8(resolve(paths.generatedDir, "annotated.model.raw.md"), v1Generated.markdown);

  // Canonical annotated from JSON-first output
  const annotatedRaw = slotFillToAnnotatedMarkdown(generated.fill, slotSchema);
  await writeUtf8(resolve(paths.generatedDir, "annotated.raw.md"), annotatedRaw);

  // V1 annotation validation + repair loop
  let currentAnnotated = annotatedRaw;
  let annotatedValidation = validateAnnotatedMarkdown(currentAnnotated, manifest);
  let annotationRepairCount = 0;
  while (!annotatedValidation.ok && annotationRepairCount < options.maxRepair) {
    annotationRepairCount += 1;
    await logger.warn(`Annotated validation failed. Running annotation repair #${annotationRepairCount}`);
    await writeJson(resolve(paths.repairedDir, `annotation-validation-errors-${annotationRepairCount}.json`), annotatedValidation.errors);
    currentAnnotated = repairAnnotatedMarkdown(currentAnnotated, annotatedValidation.errors);
    await writeUtf8(resolve(paths.repairedDir, `annotated-repair-${annotationRepairCount}.md`), currentAnnotated);
    annotatedValidation = validateAnnotatedMarkdown(currentAnnotated, manifest);
  }

  await writeJson(resolve(paths.generatedDir, "annotation-validation-errors.json"), annotatedValidation.errors);
  await writeUtf8(resolve(paths.generatedDir, "annotated.validated.md"), currentAnnotated);

  const parsedFromAnnotated = annotatedMarkdownToSlotFill(currentAnnotated, slotSchema.templateId);
  await writeJson(resolve(paths.generatedDir, "slot-fill.from-annotated.json"), parsedFromAnnotated);

  let currentFill = mergeSlotFill(generated.fill, parsedFromAnnotated);
  let allIssues = collectValidationIssues(currentFill, slotSchema, templateGraphResult.graph);
  let repairCount = 0;

  while (repairCount < options.maxRepair && allIssues.some((item) => item.level === "error")) {
    repairCount += 1;
    await logger.warn(`JSON validation failed. Running slot repair #${repairCount}`);
    const repairedResult = await repairSlotFill(currentFill, slotSchema, allIssues, options.model, llmClient);
    currentFill = repairedResult.repaired;
    await writeJson(resolve(paths.repairedDir, `repair-${repairCount}.json`), currentFill);
    await writeUtf8(resolve(paths.repairedDir, `repair-${repairCount}.prompt.txt`), repairedResult.repairPrompts.join("\n\n"));
    allIssues = collectValidationIssues(currentFill, slotSchema, templateGraphResult.graph);
  }

  await writeJson(resolve(paths.generatedDir, "slot-fill.validated.json"), currentFill);
  await writeUtf8(resolve(paths.generatedDir, "annotated.md"), currentAnnotated);

  const renderedDocxPath = resolve(paths.renderedDir, "rendered.docx");
  if (options.source && templateGraphResult.graph.templateMode === "source") {
    const patchResult = await patchDocument(options.source, renderedDocxPath, templateGraphResult.graph, currentFill, options.assets);
    for (const warning of patchResult.warnings) {
      await logger.warn(warning);
    }
  } else {
    const renderedRows = [
      ...patchParagraph(currentFill),
      ...patchList(currentFill),
      ...patchTable(currentFill),
      ...patchImage(currentFill),
      ...patchHeaderFooter(currentFill, slotSchema)
    ];
    await writeDocx(renderedDocxPath, renderedRows);
  }

  const finalDocxPath = resolve(paths.renderedDir, "final.docx");
  const finalized = await finalizeRouter(options.finalizer, renderedDocxPath, finalDocxPath);
  for (const warning of finalized.warnings) {
    await logger.warn(warning);
  }

  const structureDiff = diffStructure(slotSchema, currentFill);
  const styleDiff = diffStyle(slotSchema, currentFill);
  const layoutDiff = diffLayout(allIssues);
  const visualDiff = await diffVisual(finalized.pdfPreviewPath);

  const score = scoreDocument({
    structureScore: structureDiff.structureScore,
    styleScore: styleDiff.styleScore,
    layoutScore: layoutDiff.layoutScore,
    visualScore: visualDiff.visualScore,
    stabilityScore: 95
  });

  const blockers = allIssues.filter((item) => item.level === "error");
  const warnings = allIssues.filter((item) => item.level === "warn");
  const noTemplateMode = !options.source;
  const passed = noTemplateMode
    ? blockers.length === 0 && score.docScore >= 82
    : blockers.length === 0 && score.docScore >= 90 && score.structureScore >= 95;

  const report = {
    runId: basename(paths.runRoot),
    templateMode: options.templateMode,
    score,
    passed,
    blockers,
    warnings
  };

  await writeJson(resolve(paths.fidelityDir, "structure-diff.json"), structureDiff);
  await writeJson(resolve(paths.fidelityDir, "style-diff.json"), styleDiff);
  await writeJson(resolve(paths.fidelityDir, "layout-diff.json"), layoutDiff);
  await writeJson(resolve(paths.fidelityDir, "visual-diff.json"), visualDiff);
  await writeJson(resolve(paths.fidelityDir, "visual-diff", "summary.json"), visualDiff);
  await writeJson(resolve(paths.fidelityDir, "fidelity-report.json"), report);
  await writeUtf8(resolve(paths.fidelityDir, "fidelity-report.md"), renderFidelityReportMarkdown(report));

  await logger.info(`Pipeline finished. passed=${passed} docScore=${score.docScore}`);
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        runRoot: paths.runRoot,
        passed,
        docScore: score.docScore,
        blockers: blockers.length,
        warnings: warnings.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(`[pipeline] failed: ${(error as Error).message}`);
  process.exitCode = 1;
});
