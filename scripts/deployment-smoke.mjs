const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  ""
);
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS ?? 180000);
const query =
  process.env.SMOKE_QUERY ??
  "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks";
const question =
  process.env.SMOKE_QUESTION ??
  "Why were these papers selected?";
const sources = (process.env.SMOKE_SOURCES ?? "mock")
  .split(",")
  .map((source) => source.trim())
  .filter(Boolean);
const compareSources = (process.env.SMOKE_COMPARE_SOURCES ?? "mock")
  .split(",")
  .map((source) => source.trim())
  .filter(Boolean);
const maxPapers = Number(process.env.SMOKE_MAX_PAPERS ?? 10);
const skipAi = process.env.SMOKE_SKIP_AI === "true";
const expectedLanguage = process.env.SMOKE_EXPECT_LANGUAGE ?? "en";
const compareText =
  process.env.SMOKE_COMPARE_TEXT ??
  "RAG reduces hallucinations in clinical AI systems. RAG does not eliminate unsupported claims in clinical AI systems.";

const results = [];
const cookieJar = new Map();

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
  const cookieHeader = [...cookieJar.entries()]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    ...options.headers
  };

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers
    });

    storeCookies(response);
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function storeCookies(response) {
  const setCookieHeaders =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);

  for (const header of setCookieHeaders) {
    const [cookie] = header.split(";");
    const separator = cookie.indexOf("=");

    if (separator <= 0) {
      continue;
    }

    cookieJar.set(cookie.slice(0, separator), cookie.slice(separator + 1));
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

async function waitForBriefJob(jobId) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const response = await request(`/api/briefs/jobs/${jobId}`);
    await expectOk(response, "poll brief job");
    const job = await readJson(response, "poll brief job");

    if (job.status === "completed") {
      assert(job.briefId, "poll brief job", "Completed job is missing briefId");
      return job.briefId;
    }

    if (
      job.status === "failed" ||
      job.status === "configuration_error" ||
      job.status === "quality_gate_failed"
    ) {
      fail("poll brief job", `${job.status}: ${job.error ?? "no error message"}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  fail("poll brief job", `Timed out after ${timeoutMs} ms`);
}

function validateBriefRecord(record) {
  assert(record?.brief?.id, "brief record", "Missing brief.id");
  assert(
    record.brief.outputLanguage === expectedLanguage,
    "brief language",
    `Expected outputLanguage=${expectedLanguage}`
  );
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

async function smokeDocumentsAndCompare() {
  const documentsPageResponse = await request("/documents");
  await expectOk(documentsPageResponse, "documents page");
  const documentsHtml = await documentsPageResponse.text();
  assert(
    documentsHtml.includes("Ask My Documents"),
    "documents page",
    "Rendered page missing title"
  );
  assert(
    documentsHtml.includes("Upload documents"),
    "documents page",
    "Rendered page missing upload panel"
  );
  pass("documents page", "rendered");

  const documentsApiResponse = await request("/api/documents");
  await expectOk(documentsApiResponse, "documents API");
  assert(
    documentsApiResponse.headers.get("cache-control")?.includes("no-store"),
    "documents API",
    "Expected private no-store cache header"
  );
  const documentsPayload = await readJson(documentsApiResponse, "documents API");
  assert(
    Array.isArray(documentsPayload.documents),
    "documents API",
    "Expected documents array"
  );
  assert(
    documentsPayload.privacy?.privacyScope === "session",
    "documents API",
    "Expected session privacy scope"
  );
  pass("documents API", `${documentsPayload.documents.length} document(s)`);

  const comparePageResponse = await request("/compare");
  await expectOk(comparePageResponse, "compare page");
  const compareHtml = await comparePageResponse.text();
  assert(
    compareHtml.includes("Compare With Science"),
    "compare page",
    "Rendered page missing title"
  );
  assert(
    compareHtml.includes("Extract claims"),
    "compare page",
    "Rendered page missing extraction control"
  );
  pass("compare page", "rendered");

  const extractResponse = await request("/api/claim-check/extract", {
    method: "POST",
    body: JSON.stringify({ text: compareText })
  });
  await expectOk(extractResponse, "claim extraction");
  const extraction = await readJson(extractResponse, "claim extraction");
  assert(extraction.status === "completed", "claim extraction", "Expected completed status");
  assert(
    Array.isArray(extraction.claims) && extraction.claims.length > 0,
    "claim extraction",
    "Expected extracted claims"
  );
  const checkableClaim =
    extraction.claims.find((claim) => claim.checkable)?.claimText ??
    extraction.claims[0].claimText;
  pass("claim extraction", `${extraction.claims.length} claim(s)`);

  const compareResponse = await request("/api/claim-check", {
    method: "POST",
    body: JSON.stringify({
      claims: [checkableClaim],
      sources: compareSources,
      maxPapers: 5
    })
  });
  await expectOk(compareResponse, "claim comparison");
  const comparison = await readJson(compareResponse, "claim comparison");
  assert(comparison.status === "completed", "claim comparison", "Expected completed status");
  assert(
    Array.isArray(comparison.report?.items) && comparison.report.items.length > 0,
    "claim comparison",
    "Expected comparison report items"
  );
  pass("claim comparison", `${comparison.report.items.length} item(s)`);
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

  await smokeDocumentsAndCompare();

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
  assert(
    createPayload.briefId || createPayload.jobId,
    "generate brief",
    "Missing briefId or jobId"
  );
  const briefId =
    createPayload.briefId ?? (await waitForBriefJob(createPayload.jobId));
  pass("generate brief", briefId);

  const briefResponse = await request(`/api/briefs/${briefId}`);
  await expectOk(briefResponse, "fetch brief API");
  const briefRecord = await readJson(briefResponse, "fetch brief API");
  validateBriefRecord(briefRecord);
  pass("fetch brief API", `${briefRecord.papers.length} paper(s)`);

  const pageResponse = await request(`/briefs/${briefId}`);
  await expectOk(pageResponse, "brief page");
  const pageHtml = await pageResponse.text();
  assert(pageHtml.includes(briefRecord.brief.title), "brief page", "Rendered page missing brief title");
  assert(pageHtml.includes("Ask This Brief"), "brief page", "Rendered page missing Q&A panel");
  pass("brief page", "rendered");

  const questionResponse = await request(`/api/briefs/${briefId}/questions`, {
    method: "POST",
    body: JSON.stringify({ question })
  });
  await expectOk(questionResponse, "brief Q&A");
  const questionPayload = await readJson(questionResponse, "brief Q&A");
  assert(questionPayload.status === "completed", "brief Q&A", "Expected completed status");
  assert(
    questionPayload.answer?.outputLanguage === expectedLanguage,
    "brief Q&A",
    `Expected ${expectedLanguage} answer`
  );
  assert(
    questionPayload.answer.notAnswerableFromSources ||
      (Array.isArray(questionPayload.answer.claims) &&
        questionPayload.answer.claims.length > 0),
    "brief Q&A",
    "Answer should be sourced or explicitly not answerable"
  );
  pass("brief Q&A", `confidence=${questionPayload.answer.confidence}`);

  const exportResponse = await request(`/api/export/${briefId}?format=markdown`);
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
