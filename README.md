# Chronos-Diff Agent

> A high-precision conversational agent with **one tool: web search**, built on Node.js and TypeScript. Designed for deterministic temporal recall, batched live web verification, and zero-hallucination delta diffing.

---

## Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Add your GEMINI_API_KEY (from https://aistudio.google.com - 100% Free)
# Add your TAVILY_API_KEY (from https://tavily.com - 1,000 Free searches/mo)

# 3. Start development server
npm run dev

# 4. Open in browser
# http://localhost:3000
```

*Note: The agent includes a deterministic offline grounded provider, allowing you to run, test, and evaluate the full benchmark suite immediately even before adding API keys.*

---

## Automated Architectural Evaluation Suite

Run the full automated test suite covering temporal resolution, single-tool parallel fan-out, and end-to-end delta verification:

```bash
npm test
```

Expected output:
```text
======================================================
🧪 RUNNING CHRONOS-DIFF ARCHITECTURAL EVALUATION SUITE
======================================================
📦 1. Testing Temporal Reference Resolution... (PASS)
📦 2. Testing Immutable Event Ledger & State Projection... (PASS)
📦 3. Testing Single Tool: Batched Web Search Execution... (PASS)
📦 4. Testing End-to-End Conversational Grounding... (PASS)
======================================================
EVALUATION COMPLETE: 23 PASSED, 0 FAILED
======================================================
```

---

## Dataset Benchmark Questions Handled

Try these directly in the web UI via the one-click **Dataset Quick Tests** buttons:

1. **"On Monday we shortlisted 5 CRM tools for a 20-person sales team. Has any of them changed pricing or shipped something big since?"**
   - Projects Monday's 5 CRM entities (*HubSpot, Pipedrive, Close, Attio, Folk*) and baseline prices.
   - Fans out 5 concurrent web searches in 1 tool invocation (<1.5s).
   - Accurately identifies that **Attio** shipped *Autonomous Contact Enrichment 2.0* and confirms all other pricing remains unchanged.

2. **"What did I ask you on 3 November? Is your answer still correct today?"**
   - Resolves absolute date *3 November 2026*.
   - Recalls the Postgres vector search recommendation (*pgvector with HNSW*).
   - Confirms the technical recommendation remains valid today without hallucinated drift.

3. **"Last Tuesday I asked you about Postgres hosting. Has any pricing changed since then?"**
   - Resolves *Last Tuesday* relative to the evaluation date.
   - Recalls managed Postgres hosting providers (*Supabase, Neon, AWS RDS Aurora Serverless v2, Crunchy Bridge*).
   - Confirms entry and compute tier pricing remains steady.

---

## Architecture Overview

See [`DESIGN.md`](./DESIGN.md) for the complete 1-page architectural breakdown:
- **Event-Sourced Memory Ledger**: Replaces vector databases with deterministic timestamped state replay.
- **Batched Single Tool**: 1 tool call executes $N$ parallel HTTP queries with in-memory TTL caching.
- **3-Way Epistemic Delta Contract**: Categorizes deltas into *Confirmed Changed*, *Confirmed Unchanged*, or *Unverifiable Delta*.
- **Rejected Alternatives & Roadmap**: Full discussion of what was rejected and next-stage enhancements.
