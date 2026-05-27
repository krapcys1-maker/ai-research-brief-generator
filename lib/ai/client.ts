export type AIProviderName = "deepseek" | "openai" | "anthropic" | "custom";

export type AIModelConfig = {
  provider: AIProviderName;
  model: string;
  apiKey?: string;
};

export type GenerateStructuredInput = {
  systemPrompt: string;
  userPrompt: string;
  schemaName: string;
};

export type AIProvider = {
  name: AIProviderName;
  generateStructured(input: GenerateStructuredInput): Promise<unknown>;
};

export class AIConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIConfigurationError";
  }
}

export class AIProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIProviderError";
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getAIConfig(): AIModelConfig {
  const provider = (process.env.AI_PROVIDER ?? "deepseek") as AIProviderName;
  const model = process.env.AI_MODEL ?? "deepseek-v4-pro";

  if (provider !== "deepseek") {
    throw new AIConfigurationError(
      `AI_PROVIDER="${provider}" is not implemented yet. Use AI_PROVIDER="deepseek" for this MVP.`
    );
  }

  return {
    provider,
    model,
    apiKey: process.env.DEEPSEEK_API_KEY
  };
}

function extractJsonObject(text: string) {
  const trimmed = text.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return JSON.parse(trimmed);
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return JSON.parse(fenced[1].trim());
  }

  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");

  if (first >= 0 && last > first) {
    return JSON.parse(trimmed.slice(first, last + 1));
  }

  throw new AIProviderError("AI provider did not return a JSON object.");
}

function createDeepSeekProvider(config: AIModelConfig): AIProvider {
  return {
    name: "deepseek",
    async generateStructured(input) {
      if (!config.apiKey) {
        throw new AIConfigurationError(
          "Missing DEEPSEEK_API_KEY. Add it to .env to generate briefs with DeepSeek."
        );
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);
      let response: Response;

      try {
        response = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`
          },
          body: JSON.stringify({
            model: config.model,
            temperature: 0.2,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: input.systemPrompt
              },
              {
                role: "user",
                content: input.userPrompt
              }
            ]
          })
        });
      } catch (error) {
        const message = getErrorMessage(error);
        throw new AIProviderError(
          message.includes("abort")
            ? "DeepSeek request timed out after 120 seconds."
            : `DeepSeek request failed before a response was received: ${message}`
        );
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        const status = `${response.status} ${response.statusText}`.trim();
        throw new AIProviderError(
          `DeepSeek request failed (${status}). Check AI_MODEL, DEEPSEEK_API_KEY, and provider availability.`
        );
      }

      const payload = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = payload.choices?.[0]?.message?.content;

      if (!content) {
        throw new AIProviderError("DeepSeek returned an empty response.");
      }

      return extractJsonObject(content);
    }
  };
}

export function createAIProvider() {
  const config = getAIConfig();
  return createDeepSeekProvider(config);
}
