import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { TemplateMode } from "../contracts/template-graph.js";
import { nowRunId } from "../utils/files.js";

export type FinalizerType = "none" | "libreoffice";

export interface PipelineCliOptions {
  source?: string;
  templateMode: TemplateMode;
  templateProfile?: string;
  instruction: string;
  assets?: string;
  outDir: string;
  model: string;
  finalizer: FinalizerType;
  maxRepair: number;
}

export interface PipelinePaths {
  runRoot: string;
  inputDir: string;
  extractedDir: string;
  generatedDir: string;
  repairedDir: string;
  renderedDir: string;
  fidelityDir: string;
  logsDir: string;
}

function parseArgMap(argv: string[]): Map<string, string> {
  const argMap = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      argMap.set(key, "true");
      continue;
    }
    argMap.set(key, next);
    i += 1;
  }
  return argMap;
}

function readRequiredInstruction(value: string | undefined): string {
  if (!value) {
    throw new Error("Missing required --instruction argument.");
  }
  const candidate = resolve(value);
  if (existsSync(candidate)) {
    return candidate;
  }
  return value;
}

export function parseCliOptions(argv: string[]): PipelineCliOptions {
  const argMap = parseArgMap(argv);
  const templateMode = (argMap.get("template-mode") ?? "auto") as TemplateMode;
  if (!["source", "auto", "profile"].includes(templateMode)) {
    throw new Error(`Invalid --template-mode: ${templateMode}`);
  }

  const finalizer = (argMap.get("finalizer") ?? "libreoffice") as FinalizerType;
  if (!["none", "libreoffice"].includes(finalizer)) {
    throw new Error(`Invalid --finalizer: ${finalizer}`);
  }

  const maxRepairRaw = Number(argMap.get("max-repair") ?? "3");
  const maxRepair = Number.isFinite(maxRepairRaw) && maxRepairRaw > 0 ? Math.floor(maxRepairRaw) : 3;
  const runId = nowRunId();
  const outDir = resolve(argMap.get("out") ?? `./runs/${runId}`);

  const source = argMap.get("source") ? resolve(argMap.get("source") as string) : undefined;
  const instruction = readRequiredInstruction(argMap.get("instruction"));
  const templateProfile = argMap.get("template-profile") ?? undefined;
  const assets = argMap.get("assets") ? resolve(argMap.get("assets") as string) : undefined;

  if (templateMode === "source" && !source) {
    throw new Error("--template-mode source requires --source");
  }
  if (templateMode === "profile" && !templateProfile) {
    throw new Error("--template-mode profile requires --template-profile");
  }

  return {
    source,
    templateMode,
    templateProfile,
    instruction,
    assets,
    outDir,
    model: argMap.get("model") ?? "qwen3-max",
    finalizer,
    maxRepair
  };
}

export function buildPipelinePaths(runRoot: string): PipelinePaths {
  return {
    runRoot,
    inputDir: resolve(runRoot, "input"),
    extractedDir: resolve(runRoot, "extracted"),
    generatedDir: resolve(runRoot, "generated"),
    repairedDir: resolve(runRoot, "repaired"),
    renderedDir: resolve(runRoot, "rendered"),
    fidelityDir: resolve(runRoot, "fidelity"),
    logsDir: resolve(runRoot, "logs")
  };
}
