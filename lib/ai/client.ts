export type AIProviderName = "deepseek" | "openai" | "anthropic" | "custom";

export type AIModelConfig = {
  provider: AIProviderName;
  model: string;
  apiKey?: string;
  maxTokens: number;
  thinkingEnabled: boolean;
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

function numberEnv(name: string, fallback: number) {
  const raw = process.env[name];

  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function booleanEnv(name: string, fallback: boolean) {
  const normalized = process.env[name]?.trim().toLowerCase();

  if (!normalized) {
    return fallback;
  }

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
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
    apiKey: process.env.DEEPSEEK_API_KEY,
    maxTokens: numberEnv("AI_MAX_OUTPUT_TOKENS", 7000),
    thinkingEnabled: booleanEnv("AI_THINKING_ENABLED", false)
  };
}

function getDefaultAiRequestTimeoutMs() {
  return process.env.NODE_ENV === "development" ? 30000 : 90000;
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

async function runWithRequestTimeout<T>(
  timeoutMs: number,
  operation: (signal: AbortSignal) => Promise<T>
) {
  const controller = new AbortController();
  let didTimeout = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      didTimeout = true;
      controller.abort();
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation(controller.signal), timeoutPromise]);
  } catch (error) {
    if (
      didTimeout ||
      (error instanceof Error &&
        (error.name === "AbortError" ||
          error.message.toLowerCase().includes("abort")))
    ) {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }

    throw error;
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
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

      const requestTimeoutMs = numberEnv(
        "AI_REQUEST_TIMEOUT_MS",
        getDefaultAiRequestTimeoutMs()
      );
      let payload: {
        choices?: { message?: { content?: string } }[];
      };

      try {
        payload = await runWithRequestTimeout(requestTimeoutMs, async (signal) => {
          const response = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            signal,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
            model: config.model,
            temperature: 0.2,
            max_tokens: config.maxTokens,
            thinking: {
              type: config.thinkingEnabled ? "enabled" : "disabled"
            },
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

          if (!response.ok) {
            const status = `${response.status} ${response.statusText}`.trim();
            throw new AIProviderError(
              `DeepSeek request failed (${status}). Check AI_MODEL, DEEPSEEK_API_KEY, and provider availability.`
            );
          }

          return (await response.json()) as {
            choices?: { message?: { content?: string } }[];
          };
        });
      } catch (error) {
        if (error instanceof AIProviderError) {
          throw error;
        }

        const message = getErrorMessage(error);
        const lowerMessage = message.toLowerCase();
        const timeoutSeconds = Math.max(1, Math.ceil(requestTimeoutMs / 1000));
        throw new AIProviderError(
          lowerMessage.includes("abort") ||
            lowerMessage.includes("timeout") ||
            lowerMessage.includes("timed out")
            ? `DeepSeek request timed out after ${timeoutSeconds} seconds.`
            : `DeepSeek request failed before a response was received: ${message}`
        );
      }
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
