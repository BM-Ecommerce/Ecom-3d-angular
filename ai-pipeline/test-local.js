/**
 * Local test runner — simulates the GitHub Actions pipeline locally
 * Run: node test-local.js
 *
 * This lets you test the AI analyzers without pushing to GitHub
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { analyzeIncident } = require('./analyzers/incident');
const { analyzeTestGap } = require('./analyzers/test-gap');
const { analyzeSecurity } = require('./analyzers/security');
const { analyzePerformance } = require('./analyzers/performance');
const { sendTeamsNotification } = require('./teams');

// ─── Sample CI outputs for local testing ──────────────────────
const SAMPLE_OUTPUTS = {
  build: `
✔ Browser application bundle generation complete.
Initial Chunk Files           | Names         |  Raw Size | Estimated Transfer Size
main.efb5.js                  | main          |   4.21 MB |               1.12 MB
polyfills.js                  | polyfills     | 318.02 kB |              92.33 kB
styles.css                    | styles        |  62.14 kB |               9.68 kB
Build at: 2026-03-30T10:00:00.000Z - Hash: abc123 - Time: 18432ms
WARNING in budget Initial exceeded maximum budget. Budget 10.00 MB was not met by 4.21 MB.
  `,

  test: `
SUMMARY:
√ configurator component > should create (42ms)
√ app component > should create (18ms)
✗ three service > should load model (timeout)

=============================== Coverage summary ===============================
Statements   : 68.5% ( 274/400 )
Branches     : 55.2% ( 71/129 )
Functions    : 60.0% ( 48/80  )
Lines        : 69.1% ( 271/392 )
================================================================================

Uncovered files:
  src/app/services/three.service.ts        | 0%
  src/app/services/configurator.service.ts | 42%
  src/app/services/api.service.ts          | 71%
  `,

  sonar: `
INFO: SonarQube server 9.9
INFO: Load project repositories
INFO: 1 file had no CPD blocks
WARN: 3 issues found
  [MAJOR] three.service.ts:89 - Null pointer dereference
  [MINOR] configurator.service.ts:145 - Cognitive complexity too high
  [INFO]  app.component.ts:23 - Remove this commented-out code
INFO: Quality Gate: FAILED
  `,

  bundle: `
4.3M  dist/visualizer/main.efb5.js
312K  dist/visualizer/polyfills.js
 62K  dist/visualizer/styles.css
  8K  dist/visualizer/runtime.js
4.7M  dist/visualizer  (total)
  `,
};

async function runLocalTest() {
  console.log('\n🚀 Starting local AI Pipeline test...\n');
  console.log('─'.repeat(50));

  // Override statuses to simulate a failure scenario
  process.env.BUILD_STATUS = '0'; // pass
  process.env.TEST_STATUS = '1';  // fail — one test timed out
  process.env.SONAR_STATUS = '1'; // fail — quality gate failed

  const context = {
    repo: 'BM-Ecommerce/Ecom-3d-angular',
    branch: 'feature/3d-color-fix',
    actor: 'Praveen',
    commitSha: 'abc1234',
    commitMsg: 'Added natural language color config to 3D visualizer',
    prNumber: '',
    runUrl: 'http://localhost/test-run',
  };

  const statuses = {
    build: process.env.BUILD_STATUS === '0' ? 'pass' : 'fail',
    test: process.env.TEST_STATUS === '0' ? 'pass' : 'fail',
    sonar: process.env.SONAR_STATUS === '0' ? 'pass' : 'fail',
  };

  console.log('📊 Simulated pipeline statuses:', statuses);
  console.log('\n🤖 Running AI analyzers...\n');

  // ─── Run analyzers ──────────────────────────────────────────
  const [incidentResult, testGapResult, securityResult, performanceResult] = await Promise.allSettled([
    analyzeIncident(SAMPLE_OUTPUTS, statuses),
    analyzeTestGap(SAMPLE_OUTPUTS.test),
    analyzeSecurity(SAMPLE_OUTPUTS),
    analyzePerformance(SAMPLE_OUTPUTS.bundle),
  ]);

  const results = {
    incident: incidentResult.status === 'fulfilled' ? incidentResult.value : `Error: ${incidentResult.reason?.message}`,
    testGap: testGapResult.status === 'fulfilled' ? testGapResult.value : `Error: ${testGapResult.reason?.message}`,
    security: securityResult.status === 'fulfilled' ? securityResult.value : `Error: ${securityResult.reason?.message}`,
    performance: performanceResult.status === 'fulfilled' ? performanceResult.value : `Error: ${performanceResult.reason?.message}`,
    pr: null,
  };

  // ─── Print results to console ───────────────────────────────
  console.log('─'.repeat(50));
  console.log('🔴 INCIDENT ANALYSIS:\n', results.incident || 'No incidents');
  console.log('─'.repeat(50));
  console.log('🔒 SECURITY:\n', results.security || 'No issues');
  console.log('─'.repeat(50));
  console.log('🧪 TEST GAP:\n', results.testGap || 'No gaps found');
  console.log('─'.repeat(50));
  console.log('📦 PERFORMANCE:\n', results.performance || 'No data');
  console.log('─'.repeat(50));

  // ─── Send to Teams ──────────────────────────────────────────
  if (process.env.TEAMS_WEBHOOK_URL) {
    console.log('\n📨 Sending to Microsoft Teams...');
    await sendTeamsNotification(context, statuses, SAMPLE_OUTPUTS, results);
    console.log('✅ Teams notification sent! Check your channel.');
  } else {
    console.log('\n⚠️  TEAMS_WEBHOOK_URL not set — skipping Teams notification');
    console.log('   Add it to ai-pipeline/.env to test Teams integration');
  }

  console.log('\n✅ Local test complete!\n');
}

runLocalTest().catch((err) => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
