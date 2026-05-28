const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  ""
);
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS ?? 180000);
const query =
  process.env.SMOKE_QUERY ??
  "Jak retrieval augmented generation ogranicza halucynacje w medycznych systemach AI?";
const question =
  process.env.SMOKE_QUESTION ??
  "Dlaczego te artykuly zostaly wybrane?";
const sources = (process.env.SMOKE_SOURCES ?? "mock")
  .split(",")
  .map((source) => source.trim())
  .filter(Boolean);
const maxPapers = Number(process.env.SMOKE_MAX_PAPERS ?? 10);
const skipAi = process.env.SMOKE_SKIP_AI === "true";

const results = [];

function pass(name, detail) {
  results.push({ status: "pass", name, detail });
  console.log(`PASS ${name}${detail ? ` - ${detail}` : ""}`);
}

function fail(name, detail) {
  results.push({ status: "fail", name, detail });
  throw new Error(`${name}: ${detail}`);
}

function assert(condition, name, detail) {
  if (!condition) {
    fail(name, detail);
  }
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(`${baseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers
      }
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function readJson(response, name) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    fail(name, `Expected JSON response, got: ${text.slice(0, 300)}`);
  }
}

async function expectOk(response, name) {
  if (response.ok) {
    return;
  }

  const text = await response.text();
  fail(name, `HTTP ${response.status}: ${text.slice(0, 500)}`);
}

function validateBriefRecord(record) {
  assert(record?.brief?.id, "brief record", "Missing brief.id");
  assert(record.brief.outputLanguage === "pl", "brief language", "Expected outputLanguage=pl");
  assert(
    Array.isArray(record.papers) && record.papers.length > 0,
    "brief papers",
    "Expected selected papers"
  );
  assert(
    record.brief.searchSummary?.totalUsedInBrief === record.papers.length,
    "brief source count",
    "totalUsedInBrief should match selected papers length"
  );

  const paperIds = new Set(record.papers.map((paper) => paper.id));
  const groundedItems = [
    record.brief.executiveSummary,
    ...(record.brief.keyFindings ?? []),
    ...(record.brief.majorThemes ?? []),
    ...(record.brief.researchGaps ?? []),
    ...(record.brief.controversiesOrUncertainties ?? [])
  ];

  for (const item of groundedItems) {
    assert(
      Array.isArray(item.sourcePaperIds) && item.sourcePaperIds.length > 0,
      "brief grounding",
      "Every major brief item should have sourcePaperIds"
    );

    for (const paperId of item.sourcePaperIds) {
      assert(paperIds.has(paperId), "brief grounding", `Unknown sourcePaperId ${paperId}`);
    }
  }
}

async function main() {
  console.log(`Deployment smoke target: ${baseUrl}`);

  const sourceHealthBefore = await request("/api/source-cache");
  await expectOk(sourceHealthBefore, "source health before");
  const sourceHealthPayload = await readJson(sourceHealthBefore, "source health before");
  assert(sourceHealthPayload.persistence, "source health before", "Missing persistence status");
  pass(
    "source health before",
    `storage=${sourceHealthPayload.persistence.mode ?? "unknown"}`
  );

  const preflightResponse = await request("/api/briefs/preflight", {
    method: "POST",
    body: JSON.stringify({ query, maxPapers, sources })
  });
  await expectOk(preflightResponse, "preflight");
  const preflight = await readJson(preflightResponse, "preflight");
  assert(preflight.status === "completed", "preflight", "Expected completed status");
  assert(preflight.qualityGate?.canSynthesize, "preflight", "Quality gate blocked synthesis");
  assert(
    Array.isArray(preflight.papers) && preflight.papers.length > 0,
    "preflight",
    "Expected candidate papers"
  );
  pass(
    "preflight",
    `${preflight.papers.length} selected candidate(s), coverage=${preflight.qualityGate.coverage}`
  );

  if (skipAi) {
    pass("AI-backed smoke steps", "Skipped because SMOKE_SKIP_AI=true");
    return;
  }

  const createResponse = await request("/api/briefs", {
    method: "POST",
    body: JSON.stringify({ query, maxPapers, sources })
  });
  await expectOk(createResponse, "generate brief");
  const createPayload = await readJson(createResponse, "generate brief");
  assert(createPayload.briefId, "generate brief", "Missing briefId");
  pass("generate brief", createPayload.briefId);

  const briefResponse = await request(`/api/briefs/${createPayload.briefId}`);
  await expectOk(briefResponse, "fetch brief API");
  const briefRecord = await readJson(briefResponse, "fetch brief API");
  validateBriefRecord(briefRecord);
  pass("fetch brief API", `${briefRecord.papers.length} paper(s)`);

  const pageResponse = await request(`/briefs/${createPayload.briefId}`);
  await expectOk(pageResponse, "brief page");
  const pageHtml = await pageResponse.text();
  assert(pageHtml.includes(briefRecord.brief.title), "brief page", "Rendered page missing brief title");
  assert(pageHtml.includes("Ask This Brief"), "brief page", "Rendered page missing Q&A panel");
  pass("brief page", "rendered");

  const questionResponse = await request(`/api/briefs/${createPayload.briefId}/questions`, {
    method: "POST",
    body: JSON.stringify({ question })
  });
  await expectOk(questionResponse, "brief Q&A");
  const questionPayload = await readJson(questionResponse, "brief Q&A");
  assert(questionPayload.status === "completed", "brief Q&A", "Expected completed status");
  assert(questionPayload.answer?.outputLanguage === "pl", "brief Q&A", "Expected Polish answer");
  assert(
    questionPayload.answer.notAnswerableFromSources ||
      (Array.isArray(questionPayload.answer.claims) &&
        questionPayload.answer.claims.length > 0),
    "brief Q&A",
    "Answer should be sourced or explicitly not answerable"
  );
  pass("brief Q&A", `confidence=${questionPayload.answer.confidence}`);

  const exportResponse = await request(`/api/export/${createPayload.briefId}?format=markdown`);
  await expectOk(exportResponse, "markdown export");
  const markdown = await exportResponse.text();
  assert(markdown.includes(`# ${briefRecord.brief.title}`), "markdown export", "Missing title");
  assert(markdown.includes("## Bibliography"), "markdown export", "Missing bibliography");
  assert(markdown.includes("## Source Quality"), "markdown export", "Missing source quality");
  pass("markdown export", `${markdown.length} chars`);

  const sourceHealthAfter = await request("/api/source-cache");
  await expectOk(sourceHealthAfter, "source health after");
  const sourceHealthAfterPayload = await readJson(sourceHealthAfter, "source health after");
  assert(sourceHealthAfterPayload.sourceHealth, "source health after", "Missing sourceHealth");
  pass("source health after", "available");

  console.log(`Deployment smoke completed: ${results.length} checks passed.`);
}

main().catch((error) => {
  console.error(`FAIL deployment smoke: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
