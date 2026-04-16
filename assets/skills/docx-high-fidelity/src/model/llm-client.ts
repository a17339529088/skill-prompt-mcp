export interface LlmGenerateInput {
  prompt: string;
  model: string;
}

export interface LlmClient {
  generateJson(input: LlmGenerateInput): Promise<unknown>;
}

export class DeterministicLocalLlmClient implements LlmClient {
  async generateJson(_input: LlmGenerateInput): Promise<unknown> {
    return { mode: "deterministic-local" };
  }
}
