import type { NormalizedPaper, SourceAdapter } from "./types";

export const mockPapers: NormalizedPaper[] = [
  {
    id: "paper_rag_med_001",
    title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
    abstract:
      "This paper introduces retrieval-augmented generation as a method for conditioning sequence generation on retrieved evidence, improving factuality and knowledge access in language tasks.",
    authors: ["Patrick Lewis", "Ethan Perez", "Aleksandra Piktus"],
    year: 2020,
    publishedAt: "2020-05-22",
    doi: "10.48550/arXiv.2005.11401",
    arxivId: "2005.11401",
    semanticScholarId: "rag-knowledge-intensive",
    openAlexId: null,
    sourceUrls: ["https://arxiv.org/abs/2005.11401"],
    pdfUrl: "https://arxiv.org/pdf/2005.11401",
    venue: "NeurIPS",
    citationCount: 6700,
    influentialCitationCount: 900,
    source: "mock"
  },
  {
    id: "paper_medqa_002",
    title: "Large Language Models Encode Clinical Knowledge",
    abstract:
      "The study evaluates large language models on clinical question answering and discusses performance, uncertainty, and limits for medical decision support.",
    authors: ["Karan Singhal", "Shekoofeh Azizi", "Tao Tu"],
    year: 2023,
    publishedAt: "2023-07-12",
    doi: "10.1038/s41586-023-06291-2",
    arxivId: null,
    semanticScholarId: "llm-clinical-knowledge",
    openAlexId: null,
    sourceUrls: ["https://www.nature.com/articles/s41586-023-06291-2"],
    pdfUrl: null,
    venue: "Nature",
    citationCount: 1800,
    influentialCitationCount: 260,
    source: "mock"
  },
  {
    id: "paper_medrag_003",
    title: "Retrieval-Augmented Generation for Large Language Models in Healthcare",
    abstract:
      "This review summarizes how retrieval systems can ground language models in clinical references, guidelines, and biomedical literature while reducing unsupported answers.",
    authors: ["Yunxiang Li", "Zihan Li", "Kai Zhang"],
    year: 2024,
    publishedAt: "2024-02-14",
    doi: null,
    arxivId: "2402.09485",
    semanticScholarId: "healthcare-rag-review",
    openAlexId: null,
    sourceUrls: ["https://arxiv.org/abs/2402.09485"],
    pdfUrl: "https://arxiv.org/pdf/2402.09485",
    venue: "arXiv",
    citationCount: 180,
    influentialCitationCount: 25,
    source: "mock"
  },
  {
    id: "paper_hallucination_004",
    title: "Survey of Hallucination in Natural Language Generation",
    abstract:
      "The paper surveys hallucination causes, detection methods, and mitigation strategies in natural language generation, including retrieval grounding and human evaluation.",
    authors: ["Ziwei Ji", "Nayeon Lee", "Rita Frieske"],
    year: 2023,
    publishedAt: "2023-01-05",
    doi: "10.1145/3571730",
    arxivId: null,
    semanticScholarId: "hallucination-survey",
    openAlexId: null,
    sourceUrls: ["https://dl.acm.org/doi/10.1145/3571730"],
    pdfUrl: null,
    venue: "ACM Computing Surveys",
    citationCount: 3200,
    influentialCitationCount: 480,
    source: "mock"
  },
  {
    id: "paper_citation_llm_005",
    title: "Evaluating Verifiability in Generative Search Engines",
    abstract:
      "This work studies whether generated answers are supported by cited sources and introduces evaluation criteria for citation precision and answer support.",
    authors: ["Nelson F. Liu", "Tianyi Zhang", "Percy Liang"],
    year: 2023,
    publishedAt: "2023-04-18",
    doi: null,
    arxivId: "2304.09848",
    semanticScholarId: "verifiability-generative-search",
    openAlexId: null,
    sourceUrls: ["https://arxiv.org/abs/2304.09848"],
    pdfUrl: "https://arxiv.org/pdf/2304.09848",
    venue: "arXiv",
    citationCount: 520,
    influentialCitationCount: 70,
    source: "mock"
  },
  {
    id: "paper_agents_se_006",
    title: "SWE-bench: Can Language Models Resolve Real-World GitHub Issues?",
    abstract:
      "SWE-bench evaluates language models and agents on real software engineering issues, showing gaps between benchmark performance and practical issue resolution.",
    authors: ["Carlos E. Jimenez", "John Yang", "Alexander Wettig"],
    year: 2024,
    publishedAt: "2024-01-08",
    doi: "10.48550/arXiv.2310.06770",
    arxivId: "2310.06770",
    semanticScholarId: "swe-bench",
    openAlexId: null,
    sourceUrls: ["https://arxiv.org/abs/2310.06770"],
    pdfUrl: "https://arxiv.org/pdf/2310.06770",
    venue: "ICLR",
    citationCount: 1200,
    influentialCitationCount: 170,
    source: "mock"
  },
  {
    id: "paper_graph_drug_007",
    title: "Graph Neural Networks for Drug Discovery",
    abstract:
      "The review covers molecular graph representation learning, property prediction, virtual screening, and the limitations of graph neural networks in drug discovery.",
    authors: ["Yue Wang", "Jian Tang", "Fei Guo"],
    year: 2022,
    publishedAt: "2022-06-20",
    doi: "10.1093/bib/bbac082",
    arxivId: null,
    semanticScholarId: "gnn-drug-discovery",
    openAlexId: null,
    sourceUrls: ["https://academic.oup.com/bib/article/23/4/bbac082/6540914"],
    pdfUrl: null,
    venue: "Briefings in Bioinformatics",
    citationCount: 980,
    influentialCitationCount: 130,
    source: "mock"
  },
  {
    id: "paper_privacy_health_008",
    title: "Federated Learning for Healthcare Informatics",
    abstract:
      "This paper reviews federated learning in healthcare, focusing on privacy-preserving model training, data heterogeneity, governance, and clinical deployment barriers.",
    authors: ["Qiang Yang", "Yang Liu", "Tianjian Chen"],
    year: 2019,
    publishedAt: "2019-12-01",
    doi: "10.1145/3298981",
    arxivId: null,
    semanticScholarId: "federated-healthcare",
    openAlexId: null,
    sourceUrls: ["https://dl.acm.org/doi/10.1145/3298981"],
    pdfUrl: null,
    venue: "ACM Transactions on Intelligent Systems and Technology",
    citationCount: 4100,
    influentialCitationCount: 640,
    source: "mock"
  },
  {
    id: "paper_med_rag_eval_009",
    title: "Benchmarking Retrieval-Augmented Generation in Biomedical Question Answering",
    abstract:
      "The benchmark compares retrieval-augmented biomedical question answering systems and finds that retrieval quality strongly affects answer faithfulness and coverage.",
    authors: ["Maria Antoniak", "David Mimno", "Anna Rogers"],
    year: 2024,
    publishedAt: "2024-05-10",
    doi: null,
    arxivId: null,
    semanticScholarId: "biomedical-rag-benchmark",
    openAlexId: "Wmock009",
    sourceUrls: ["https://example.org/biomedical-rag-benchmark"],
    pdfUrl: null,
    venue: "Mock Biomedical NLP",
    citationCount: 75,
    influentialCitationCount: 10,
    source: "mock"
  },
  {
    id: "paper_clinical_safety_010",
    title: "Safety and Reliability Challenges for Clinical Large Language Models",
    abstract:
      "The article discusses risk management, evaluation, dataset shift, calibration, and human oversight requirements for clinical language model deployments.",
    authors: ["Irene Y. Chen", "Marzyeh Ghassemi", "Sendhil Mullainathan"],
    year: 2024,
    publishedAt: "2024-03-04",
    doi: "10.1056/AIclinicalLLMmock",
    arxivId: null,
    semanticScholarId: "clinical-llm-safety",
    openAlexId: null,
    sourceUrls: ["https://example.org/clinical-llm-safety"],
    pdfUrl: null,
    venue: "Mock Medical AI Review",
    citationCount: 210,
    influentialCitationCount: 35,
    source: "mock"
  },
  {
    id: "paper_duplicate_title_011",
    title: "Retrieval-Augmented Generation for Large Language Models in Healthcare",
    abstract:
      "A duplicate mock record used to validate title-based deduplication for healthcare retrieval-augmented generation papers.",
    authors: ["Yunxiang Li", "Zihan Li", "Kai Zhang"],
    year: 2024,
    publishedAt: "2024-02-14",
    doi: null,
    arxivId: "2402.09485",
    semanticScholarId: "healthcare-rag-review-duplicate",
    openAlexId: null,
    sourceUrls: ["https://arxiv.org/abs/2402.09485"],
    pdfUrl: "https://arxiv.org/pdf/2402.09485",
    venue: "arXiv",
    citationCount: 180,
    influentialCitationCount: 25,
    source: "mock"
  }
];

export const mockSourceAdapter: SourceAdapter = {
  name: "mock",
  async searchPapers(input) {
    const queryTerms = input.query
      .toLowerCase()
      .split(/\W+/)
      .filter((term) => term.length > 2);

    const filtered = mockPapers.filter((paper) => {
      const yearMatches =
        (!input.fromYear || (paper.year ?? 0) >= input.fromYear) &&
        (!input.toYear || (paper.year ?? 9999) <= input.toYear);

      if (!yearMatches) {
        return false;
      }

      const haystack = `${paper.title} ${paper.abstract ?? ""} ${paper.venue ?? ""}`
        .toLowerCase()
        .replace(/\s+/g, " ");

      return queryTerms.length === 0 || queryTerms.some((term) => haystack.includes(term));
    });

    const result = filtered.length >= 5 ? filtered : mockPapers;
    return result.slice(0, Math.max(input.maxResults, 10));
  }
};
