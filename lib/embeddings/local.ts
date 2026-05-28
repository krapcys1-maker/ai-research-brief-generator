import type { EmbeddingProvider } from "@/lib/embeddings/types";

const DIMENSIONS = 192;

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function hash(value: string) {
  let result = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }

  return result >>> 0;
}

function grams(text: string) {
  const normalized = `  ${normalize(text)}  `;
  const output: string[] = [];

  for (let index = 0; index < normalized.length - 2; index += 1) {
    output.push(normalized.slice(index, index + 3));
  }

  return output;
}

function embedOne(text: string) {
  const vector = new Array<number>(DIMENSIONS).fill(0);

  for (const gram of grams(text)) {
    const hashed = hash(gram);
    const index = hashed % DIMENSIONS;
    const sign = hashed % 2 === 0 ? 1 : -1;
    vector[index] += sign;
  }

  const length = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));

  if (!length) {
    return vector;
  }

  return vector.map((value) => value / length);
}

export const localEmbeddingProvider: EmbeddingProvider = {
  name: "local-hash-ngrams",
  async embed(texts: string[]) {
    return texts.map(embedOne);
  }
};

