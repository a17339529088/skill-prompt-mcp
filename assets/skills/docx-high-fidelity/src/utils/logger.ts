import { appendFile, writeFile } from "node:fs/promises";

export class PipelineLogger {
  constructor(private readonly logFile: string) {}

  async reset(): Promise<void> {
    await writeFile(this.logFile, "", "utf-8");
  }

  async info(message: string): Promise<void> {
    await this.write("INFO", message);
  }

  async warn(message: string): Promise<void> {
    await this.write("WARN", message);
  }

  async error(message: string): Promise<void> {
    await this.write("ERROR", message);
  }

  private async write(level: string, message: string): Promise<void> {
    const line = `[${new Date().toISOString()}] [${level}] ${message}\n`;
    await appendFile(this.logFile, line, "utf-8");
  }
}
