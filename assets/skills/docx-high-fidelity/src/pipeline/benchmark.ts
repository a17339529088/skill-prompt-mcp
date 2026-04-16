import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { writeJson, writeUtf8 } from "../utils/files.js";

interface BenchCase {
  docx: string;
  instruction: string;
  id: string;
}

interface BenchResult {
  id: string;
  runRoot?: string;
  passed: boolean;
  docScore: number;
  error?: string;
}

const require = createRequire(import.meta.url);
const tsxPackagePath = require.resolve("tsx/package.json");
const tsxCliPath = resolve(dirname(tsxPackagePath), "dist/cli.mjs");

function parseArg(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
    out[key] = value;
  }
  return out;
}

async function findCases(datasetDir: string): Promise<BenchCase[]> {
  const entries = await readdir(datasetDir, { withFileTypes: true });
  const docxFiles = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".docx") && !e.name.startsWith("~$"))
    .map((e) => join(datasetDir, e.name));
  const cases: BenchCase[] = [];
  for (const docxPath of docxFiles) {
    const id = basename(docxPath, ".docx");
    const instructionTxt = join(datasetDir, `${id}.txt`);
    const instruction = existsSync(instructionTxt)
      ? (await readFile(instructionTxt, "utf-8")).trim() || `Generate content for ${id}`
      : `Generate content for ${id}`;
    cases.push({ docx: docxPath, instruction, id });
  }
  return cases.sort((a, b) => a.id.localeCompare(b.id));
}

function runOneCase(caseItem: BenchCase, outRoot: string): BenchResult {
  const outDir = join(outRoot, caseItem.id);
  const pipelineArgs = [
    tsxCliPath,
    "src/pipeline/run.ts",
    "--template-mode",
    "source",
    "--source",
    caseItem.docx,
    "--instruction",
    caseItem.instruction,
    "--out",
    outDir,
    "--finalizer",
    "none"
  ];

  const proc = spawnSync(process.execPath, pipelineArgs, { encoding: "utf-8" });
  if (proc.status !== 0) {
    return {
      id: caseItem.id,
      passed: false,
      docScore: 0,
      error: proc.error?.message || proc.stderr || proc.stdout || "pipeline failed"
    };
  }

  const stdout = proc.stdout || "";
  const jsonMatch = stdout.match(/\{[\s\S]*\}\s*$/);
  if (!jsonMatch) {
    return {
      id: caseItem.id,
      passed: false,
      docScore: 0,
      error: "No JSON summary in pipeline output"
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as { runRoot: string; passed: boolean; docScore: number };
    return {
      id: caseItem.id,
      runRoot: parsed.runRoot,
      passed: parsed.passed,
      docScore: parsed.docScore
    };
  } catch {
    return {
      id: caseItem.id,
      passed: false,
      docScore: 0,
      error: "Invalid JSON summary"
    };
  }
}

async function main(): Promise<void> {
  const args = parseArg(process.argv.slice(2));
  const dataset = resolve(args.dataset ?? "./benchmarks");
  const outRoot = resolve(args.out ?? "./runs/benchmark");

  const cases = await findCases(dataset);
  if (cases.length === 0) {
    throw new Error(`No .docx found under dataset: ${dataset}`);
  }

  const results: BenchResult[] = [];
  for (const caseItem of cases) {
    const result = runOneCase(caseItem, outRoot);
    results.push(result);
  }

  const passCount = results.filter((r) => r.passed).length;
  const avgScore = Number((results.reduce((sum, r) => sum + r.docScore, 0) / results.length).toFixed(2));
  const gates = {
    v1: {
      minPass: 8,
      minAvgScore: 85,
      pass: passCount >= 8 && avgScore >= 85
    },
    v2: {
      minPass: 9,
      minAvgScore: 91,
      pass: passCount >= 9 && avgScore >= 91
    }
  };

  const summary = {
    dataset,
    outRoot,
    total: results.length,
    passCount,
    avgScore,
    gates,
    results
  };

  await writeJson(join(outRoot, "benchmark-report.json"), summary);
  const md = [
    "# Benchmark Report",
    "",
    `- Dataset: ${dataset}`,
    `- Total: ${results.length}`,
    `- Passed: ${passCount}`,
    `- Avg Score: ${avgScore}`,
    "",
    "## Gates",
    `- V1 (>=8 pass, avg>=85): ${gates.v1.pass ? "PASS" : "FAIL"}`,
    `- V2 (>=9 pass, avg>=91): ${gates.v2.pass ? "PASS" : "FAIL"}`,
    "",
    "## Cases",
    ...results.map((r) => `- ${r.id}: passed=${r.passed} score=${r.docScore}${r.error ? ` error=${r.error}` : ""}`),
    ""
  ].join("\n");
  await writeUtf8(join(outRoot, "benchmark-report.md"), md);

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ outRoot, total: results.length, passCount, avgScore, gates }, null, 2));
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(`[benchmark] failed: ${(error as Error).message}`);
  process.exitCode = 1;
});
