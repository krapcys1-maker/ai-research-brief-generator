import {
  AIConfigurationError,
  AIProviderError,
  createAIProvider
} from "@/lib/ai/client";
import {
  AskDocumentsAnswerSchema,
  type AskDocumentsAnswer,
  type UserDocument,
  type UserDocumentChunk
} from "@/lib/documents/schemas";
import type { RetrievedDocumentChunk } from "@/lib/documents/retrieval";

export type AskDocumentsInput = {
  question: string;
  documents: UserDocument[];
  retrievedChunks: RetrievedDocumentChunk[];
};

export type AskDocumentsDependencies = {
  generateStructured?: (input: {
    systemPrompt: string;
    userPrompt: string;
    schemaName: string;
  }) => Promise<unknown>;
};

const systemPrompt = `You answer questions over private user-uploaded documents.

You are not a generic chatbot.
Answer only from the provided document chunks.
Do not use general world knowledge.
If the chunks do not support the answer, set notAnswerableFromDocuments to true and explain that the uploaded documents do not contain enough evidence.
Every answerable response must include evidenceSnippets.
Evidence snippets must be short spans copied or tightly paraphrased from the provided chunks.
Do not cite document IDs or chunk IDs that are not in the prompt.
Return only valid JSON matching the requested schema.
Do not return markdown.
Do not wrap the JSON in code fences.`;

function buildPrompt(input: AskDocumentsInput) {
  const chunks = input.retrievedChunks.map(({ chunk, score }) => ({
    chunkId: chunk.id,
    documentId: chunk.documentId,
    sectionTitle: chunk.sectionTitle,
    evidenceLevel: chunk.evidenceLevel,
    score,
    text: chunk.text
  }));
  const documents = input.documents.map((document) => ({
    id: document.id,
    filename: document.filename,
    status: document.status
  }));

  return `Question:
${input.question}

Uploaded documents:
${JSON.stringify(documents, null, 2)}

Retrieved private document chunks:
${JSON.stringify(chunks, null, 2)}

Return exactly one JSON object:
{
  "question": "${input.question}",
  "answer": "answer grounded only in uploaded chunks, or a clear refusal if unsupported",
  "confidence": "low|medium|high",
  "notAnswerableFromDocuments": false,
  "evidenceSnippets": [
    {
      "id": "evidence_1",
      "sourceType": "user_document",
      "sourceId": "document_id",
      "documentId": "document_id",
      "chunkId": "chunk_id",
      "text": "short evidence snippet from the chunk",
      "sectionTitle": null,
      "evidenceLevel": "uploaded_document_supported",
      "supportRelation": "supports|partially_supports|contradicts|contextual|weak"
    }
  ],
  "citedDocumentIds": ["document_id"],
  "limitations": ["short limitation if evidence is partial"],
  "followUpQuestions": ["optional follow-up question"]
}

If the answer is not supported by the uploaded chunks, return:
{
  "question": "${input.question}",
  "answer": "The uploaded documents do not contain enough evidence to answer this question.",
  "confidence": "low",
  "notAnswerableFromDocuments": true,
  "evidenceSnippets": [],
  "citedDocumentIds": [],
  "limitations": ["No supporting uploaded document chunk was retrieved."],
  "followUpQuestions": []
}`;
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length > 3);
}

function hasOverlap(snippet: string, chunk: UserDocumentChunk) {
  const snippetTokens = new Set(tokenize(snippet));
  const chunkTokens = new Set(tokenize(chunk.text));

  if (!snippetTokens.size || !chunkTokens.size) {
    return false;
  }

  const overlap = [...snippetTokens].filter((token) => chunkTokens.has(token));
  return overlap.length >= Math.min(2, snippetTokens.size);
}

export function validateDocumentAnswerGrounding(
  answer: AskDocumentsAnswer,
  chunks: UserDocumentChunk[]
) {
  const chunksById = new Map(chunks.map((chunk) => [chunk.id, chunk]));
  const documentIds = new Set(chunks.map((chunk) => chunk.documentId));

  if (answer.notAnswerableFromDocuments) {
    if (answer.evidenceSnippets.length) {
      throw new Error("Unsupported document answers must not include evidence.");
    }
    return;
  }

  for (const id of answer.citedDocumentIds) {
    if (!documentIds.has(id)) {
      throw new Error(`Document answer cites unknown documentId: ${id}`);
    }
  }

  for (const evidence of answer.evidenceSnippets) {
    const chunk = chunksById.get(evidence.chunkId);

    if (!chunk) {
      throw new Error(`Document answer cites unknown chunkId: ${evidence.chunkId}`);
    }

    if (evidence.documentId !== chunk.documentId) {
      throw new Error(`Document answer evidence documentId does not match chunk.`);
    }

    if (evidence.evidenceLevel !== "uploaded_document_supported") {
      throw new Error("Document answer must use uploaded_document_supported evidence.");
    }

    if (!hasOverlap(evidence.text, chunk)) {
      throw new Error("Document answer evidence is not supported by the cited chunk.");
    }
  }
}

function unsupportedAnswer(question: string): AskDocumentsAnswer {
  return AskDocumentsAnswerSchema.parse({
    question,
    answer:
      "The uploaded documents do not contain enough evidence to answer this question.",
    confidence: "low",
    notAnswerableFromDocuments: true,
    evidenceSnippets: [],
    citedDocumentIds: [],
    limitations: ["No supporting uploaded document chunk was retrieved."],
    followUpQuestions: []
  });
}

export async function askDocuments(
  input: AskDocumentsInput,
  dependencies: AskDocumentsDependencies = {}
) {
  if (!input.retrievedChunks.length) {
    return unsupportedAnswer(input.question);
  }

  const generateStructured =
    dependencies.generateStructured ??
    ((request) => createAIProvider().generateStructured(request));
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const raw = await generateStructured({
        schemaName: "AskDocumentsAnswer",
        systemPrompt,
        userPrompt: buildPrompt(input)
      });
      const parsed = AskDocumentsAnswerSchema.parse({
        ...(raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}),
        question: input.question
      });

      validateDocumentAnswerGrounding(
        parsed,
        input.retrievedChunks.map((item) => item.chunk)
      );
      return parsed;
    } catch (error) {
      if (error instanceof AIConfigurationError || error instanceof AIProviderError) {
        throw error;
      }
      lastError = error;
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : "Document answer validation failed.";
  throw new Error(`Could not generate a valid grounded document answer: ${message}`);
}
