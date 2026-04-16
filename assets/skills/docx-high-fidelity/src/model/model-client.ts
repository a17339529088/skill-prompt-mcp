export interface ModelGenerateInput {
  prompt: string;
  model: string;
}

export interface ModelClient {
  generateText(input: ModelGenerateInput): Promise<string>;
}

export class DeterministicModelClient implements ModelClient {
  async generateText(input: ModelGenerateInput): Promise<string> {
    const shortened = input.prompt.slice(0, 200).replace(/\s+/g, " ");
    return `<!-- model:${input.model} -->\n${shortened}`;
  }
}
