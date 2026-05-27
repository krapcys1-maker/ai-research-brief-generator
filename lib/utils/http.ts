export type FetchWithRetryOptions = {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  headers?: HeadersInit;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
) {
  const timeoutMs = options.timeoutMs ?? 15000;
  const retries = options.retries ?? 1;
  const retryDelayMs = options.retryDelayMs ?? 600;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        headers: options.headers,
        signal: controller.signal
      });

      if (!response.ok && shouldRetryStatus(response.status) && attempt < retries) {
        await sleep(retryDelayMs * (attempt + 1));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(retryDelayMs * (attempt + 1));
        continue;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Request failed before receiving a response.");
}

export function assertOk(response: Response, sourceName: string) {
  if (!response.ok) {
    throw new Error(
      `${sourceName} request failed with ${response.status} ${response.statusText}`.trim()
    );
  }
}
