import { resolveTemporalReference } from '../src/temporal/resolver.js';
import { EventLedger } from '../src/memory/ledger.js';
import { WebSearchEngine } from '../src/tools/search.js';
import { AgentOrchestrator } from '../src/agent/loop.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

async function runAllTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING CHRONOS-DIFF ARCHITECTURAL EVALUATION SUITE');
  console.log('======================================================\n');

  // Benchmark anchor: Wednesday, November 11, 2026
  const anchorDate = new Date('2026-11-11T12:00:00Z');

  // -----------------------------------------------------------------
  // 1. TEMPORAL RESOLUTION TESTS
  // -----------------------------------------------------------------
  console.log('📦 1. Testing Temporal Reference Resolution...');
  
  const mondayRes = resolveTemporalReference('On Monday we shortlisted 5 CRM tools', anchorDate);
  assert(mondayRes !== null, 'Resolves relative date "On Monday"');
  assert(mondayRes?.isPastReference === true, '"On Monday" flagged as past reference');
  assert(mondayRes?.startDate.getDay() === 1, 'Resolved start date is a Monday');

  const nov3Res = resolveTemporalReference('What did I ask you on 3 November?', anchorDate);
  assert(nov3Res !== null, 'Resolves absolute date "3 November"');
  assert(nov3Res?.startDate.getDate() === 3, 'Resolved start date is day 3');
  assert(nov3Res?.startDate.getMonth() === 10, 'Resolved month is November (index 10)');

  const lastTueRes = resolveTemporalReference('Last Tuesday I asked you about Postgres hosting', anchorDate);
  assert(lastTueRes !== null, 'Resolves "Last Tuesday"');
  assert(lastTueRes?.startDate.getDay() === 2, 'Resolved start date is a Tuesday');

  // -----------------------------------------------------------------
  // 2. EVENT LEDGER & STATE PROJECTION TESTS
  // -----------------------------------------------------------------
  console.log('\n📦 2. Testing Immutable Event Ledger & State Projection...');
  const ledger = new EventLedger();
  ledger.load();

  const sessions = ledger.listSessions();
  assert(sessions.length >= 3, `Loaded seeded baseline sessions (count: ${sessions.length})`);

  // Project Monday state
  const mondayStart = new Date('2026-11-09T00:00:00Z').getTime();
  const mondayEnd = new Date('2026-11-09T23:59:59Z').getTime();
  const mondayProjection = ledger.projectStateAt(mondayStart, mondayEnd);

  assert(mondayProjection.snapshots.length > 0, 'Projected Monday snapshot');
  const snap = mondayProjection.snapshots[0];
  assert(snap?.entities?.length === 5, 'Monday snapshot contains all 5 shortlisted CRM entities');
  assert(snap?.entities?.some(e => e.name === 'HubSpot' && e.baselinePrice?.includes('$90')), 'HubSpot baseline price recalled ($90)');
  assert(snap?.entities?.some(e => e.name === 'Attio' && e.baselinePrice?.includes('$39')), 'Attio baseline price recalled ($39)');

  // -----------------------------------------------------------------
  // 3. SINGLE TOOL BATCHED SEARCH TESTS
  // -----------------------------------------------------------------
  console.log('\n📦 3. Testing Single Tool: Batched Web Search Execution...');
  const searchEngine = new WebSearchEngine();

  const tStart = Date.now();
  const results = await searchEngine.execute([
    { query: 'HubSpot pricing changelog', entity: 'HubSpot' },
    { query: 'Attio pricing changelog', entity: 'Attio' },
    { query: 'Pipedrive pricing changelog', entity: 'Pipedrive' },
    { query: 'Close CRM pricing changelog', entity: 'Close' },
    { query: 'Folk CRM pricing changelog', entity: 'Folk' }
  ]);
  const duration = Date.now() - tStart;

  assert(results.length === 5, 'Batched tool resolved all 5 queries in 1 execution');
  assert(duration < 3000, `Parallel fan-out completed under 3s budget (${duration}ms)`);

  // Test TTL cache
  const cachedResults = await searchEngine.execute([
    { query: 'HubSpot pricing changelog', entity: 'HubSpot' }
  ]);
  assert(cachedResults[0]?.cached === true, 'Repeated query served instantly from in-memory TTL cache');

  // -----------------------------------------------------------------
  // 4. END-TO-END CONVERSATIONAL TURN EVALUATION
  // -----------------------------------------------------------------
  console.log('\n📦 4. Testing End-to-End Conversational Grounding...');
  const orchestrator = new AgentOrchestrator(ledger, searchEngine);

  // Test 1: 5 CRM Shortlist Delta
  const turn1Response = await orchestrator.handleTurn(
    'eval-crm',
    'On Monday we shortlisted 5 CRM tools for a 20-person sales team. Has any of them changed pricing or shipped something big since?',
    {},
    anchorDate
  );
  assert(turn1Response.includes('HubSpot') && turn1Response.includes('Attio'), 'Turn 1 recalls shortlisted entities');
  assert(turn1Response.toLowerCase().includes('unchanged'), 'Turn 1 confirms baseline pricing unchanged');
  assert(turn1Response.includes('Attio') && (turn1Response.includes('Enrichment') || turn1Response.includes('update') || turn1Response.includes('shipped')), 'Turn 1 detects Attio shipped update');

  // Test 2: Nov 3 Question Recall
  const turn2Response = await orchestrator.handleTurn(
    'eval-nov3',
    'What did I ask you on 3 November? Is your answer still correct today?',
    {},
    anchorDate
  );
  assert(turn2Response.toLowerCase().includes('vector') || turn2Response.toLowerCase().includes('pgvector'), 'Turn 2 recalls Nov 3 vector search question');
  assert(turn2Response.toLowerCase().includes('still correct'), 'Turn 2 confirms recommendation remains correct');

  // Test 3: Postgres Hosting Delta
  const turn3Response = await orchestrator.handleTurn(
    'eval-postgres',
    'Last Tuesday I asked you about Postgres hosting. Has any pricing changed since then?',
    {},
    anchorDate
  );
  assert(turn3Response.includes('Supabase') && turn3Response.includes('Neon'), 'Turn 3 recalls Postgres hosting providers');
  assert(turn3Response.toLowerCase().includes('unchanged'), 'Turn 3 confirms hosting pricing unchanged');

  // -----------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`EVALUATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
