export type FetchPdfInput = {
  url: string;
  timeoutMs?: number;
  maxBytes?: number;
  fetchImpl?: typeof fetch;
};

export type FetchedPdf = {
  bytes: Uint8Array;
  contentType: string | null;
  sizeBytes: number;
};

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_MAX_BYTES = 15 * 1024 * 1024;

function getContentLength(response: Response) {
  const raw = response.headers.get("content-length");
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function isPdfLikeContentType(value: string | null) {
  if (!value) {
    return true;
  }

  const normalized = value.toLowerCase();
  return (
    normalized.includes("application/pdf") ||
    normalized.includes("application/octet-stream") ||
    normalized.includes("binary/octet-stream")
  );
}

async function readBytesWithLimit(response: Response, maxBytes: number) {
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maxBytes) {
      throw new Error(`PDF is too large: ${bytes.byteLength} bytes`);
    }
    return bytes;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        throw new Error(`PDF is too large: ${totalBytes} bytes`);
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return bytes;
}

export async function fetchPdf(input: FetchPdfInput): Promise<FetchedPdf> {
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = input.maxBytes ?? DEFAULT_MAX_BYTES;
  const fetchImpl = input.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(input.url, {
      signal: controller.signal,
      headers: {
        Accept: "application/pdf"
      }
    });

    if (!response.ok) {
      throw new Error(`PDF request failed with ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    if (!isPdfLikeContentType(contentType)) {
      throw new Error(`Unexpected PDF content type: ${contentType}`);
    }

    const contentLength = getContentLength(response);
    if (contentLength !== null && contentLength > maxBytes) {
      throw new Error(`PDF is too large: ${contentLength} bytes`);
    }

    const bytes = await readBytesWithLimit(response, maxBytes);

    return {
      bytes,
      contentType,
      sizeBytes: bytes.byteLength
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`PDF request timed out after ${timeoutMs}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
