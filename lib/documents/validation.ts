export const SUPPORTED_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "application/octet-stream"
]);

export const SUPPORTED_DOCUMENT_EXTENSIONS = new Set([".pdf", ".txt", ".md"]);

export const MAX_DOCUMENT_UPLOAD_BYTES = 10 * 1024 * 1024;

function extensionOf(filename: string) {
  const index = filename.lastIndexOf(".");
  return index >= 0 ? filename.slice(index).toLowerCase() : "";
}

export function getSupportedDocumentKind(file: {
  name: string;
  type?: string;
}) {
  const extension = extensionOf(file.name);
  const mimeType = file.type?.toLowerCase() ?? "";

  if (!SUPPORTED_DOCUMENT_EXTENSIONS.has(extension)) {
    return null;
  }

  if (mimeType && !SUPPORTED_DOCUMENT_MIME_TYPES.has(mimeType)) {
    return null;
  }

  if (extension === ".pdf") {
    return "pdf" as const;
  }

  if (extension === ".md") {
    return "markdown" as const;
  }

  return "text" as const;
}

export function validateUploadFile(file: File) {
  if (file.size > MAX_DOCUMENT_UPLOAD_BYTES) {
    throw new Error(
      `File is too large. Maximum supported size is ${Math.round(
        MAX_DOCUMENT_UPLOAD_BYTES / 1024 / 1024
      )} MB.`
    );
  }

  const kind = getSupportedDocumentKind(file);

  if (!kind) {
    throw new Error("Unsupported file type. Upload PDF, TXT, or MD files only.");
  }

  return kind;
}
