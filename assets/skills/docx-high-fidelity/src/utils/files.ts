import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export function nowRunId(): string {
  const iso = new Date().toISOString().replace(/[:.]/g, "-");
  return `run_${iso}`;
}

export function abs(pathLike: string): string {
  return resolve(pathLike);
}

export async function ensureDir(pathLike: string): Promise<void> {
  await mkdir(pathLike, { recursive: true });
}

export async function ensureParentDir(filePath: string): Promise<void> {
  await ensureDir(dirname(filePath));
}

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await ensureParentDir(filePath);
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

export async function readUtf8(filePath: string): Promise<string> {
  return readFile(filePath, "utf-8");
}

export async function writeUtf8(filePath: string, content: string): Promise<void> {
  await ensureParentDir(filePath);
  await writeFile(filePath, content, "utf-8");
}

export async function copyIfExists(source: string | undefined, target: string): Promise<boolean> {
  if (!source) {
    return false;
  }
  try {
    await ensureParentDir(target);
    await copyFile(source, target);
    return true;
  } catch {
    return false;
  }
}
