export type PageRange = {
  startPage: number;
  endPage: number;
};

export function parsePageRange(value: string | null | undefined): PageRange | null {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  const match = normalized.match(/^(\d+)(?:\s*-\s*(\d+))?$/);

  if (!match) {
    throw new Error(`Invalid page range "${normalized}". Use "N" or "N-M".`);
  }

  const startPage = Number(match[1]);
  const endPage = Number(match[2] ?? match[1]);

  if (
    !Number.isInteger(startPage) ||
    !Number.isInteger(endPage) ||
    startPage < 1 ||
    endPage < 1
  ) {
    throw new Error("Page range pages must be positive integers.");
  }

  if (endPage < startPage) {
    throw new Error("Page range end must be greater than or equal to start.");
  }

  return { startPage, endPage };
}

export function selectPageTexts(
  pageTexts: string[],
  range: PageRange | null | undefined
) {
  if (!range) {
    return {
      pageTexts,
      pageStart: pageTexts.length ? 1 : null,
      pageEnd: pageTexts.length ? pageTexts.length : null
    };
  }

  if (range.startPage > pageTexts.length) {
    throw new Error(
      `Page range starts at ${range.startPage}, but extracted text has only ${pageTexts.length} page(s).`
    );
  }

  const endPage = Math.min(range.endPage, pageTexts.length);

  return {
    pageTexts: pageTexts.slice(range.startPage - 1, endPage),
    pageStart: range.startPage,
    pageEnd: endPage
  };
}
