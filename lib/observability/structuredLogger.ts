export type LogLevel = "info" | "warn" | "error";

export type StructuredLogFields = Record<string, unknown>;

export type StructuredLogEvent = {
  level: LogLevel;
  event: string;
  timestamp: string;
  service: string;
  environment: string;
} & StructuredLogFields;

const SENSITIVE_KEY_PATTERN =
  /(authorization|password|secret|token|api[_-]?key|cookie|session)/i;

function isStructuredLoggingEnabled() {
  const explicit = process.env.STRUCTURED_LOGS?.trim().toLowerCase();

  if (explicit) {
    return ["1", "true", "yes", "on"].includes(explicit);
  }

  return process.env.NODE_ENV === "production";
}

function getServiceName() {
  return process.env.LOG_SERVICE_NAME?.trim() || "ai-brief-generator";
}

function safeError(error: Error) {
  return {
    name: error.name,
    message: error.message,
    stack: process.env.LOG_INCLUDE_STACK === "true" ? error.stack : undefined
  };
}

function sanitizeValue(value: unknown, key = ""): unknown {
  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return "[redacted]";
  }

  if (value instanceof Error) {
    return safeError(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        sanitizeValue(entryValue, entryKey)
      ])
    );
  }

  return value;
}

export function createStructuredLogEvent(
  level: LogLevel,
  event: string,
  fields: StructuredLogFields = {}
): StructuredLogEvent {
  const safeFields = sanitizeValue(fields) as StructuredLogFields;

  return {
    ...safeFields,
    level,
    event,
    timestamp: new Date().toISOString(),
    service: getServiceName(),
    environment: process.env.NODE_ENV ?? "development"
  };
}

function writeLog(level: LogLevel, event: string, fields: StructuredLogFields = {}) {
  const logEvent = createStructuredLogEvent(level, event, fields);

  if (isStructuredLoggingEnabled()) {
    const output = JSON.stringify(logEvent);

    if (level === "error") {
      console.error(output);
      return;
    }

    if (level === "warn") {
      console.warn(output);
      return;
    }

    console.log(output);
    return;
  }

  const details = Object.fromEntries(
    Object.entries(logEvent).filter(
      ([key]) => !["level", "event", "timestamp"].includes(key)
    )
  );
  const detailText = Object.keys(details).length
    ? ` ${JSON.stringify(details)}`
    : "";
  const line = `[${level}] ${event}${detailText}`;

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export const structuredLogger = {
  info: (event: string, fields?: StructuredLogFields) =>
    writeLog("info", event, fields),
  warn: (event: string, fields?: StructuredLogFields) =>
    writeLog("warn", event, fields),
  error: (event: string, fields?: StructuredLogFields) =>
    writeLog("error", event, fields)
};
