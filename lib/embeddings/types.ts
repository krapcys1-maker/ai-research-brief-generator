export type EmbeddingProvider = {
  name: string;
  embed(texts: string[]): Promise<number[][]>;
};

