/**
 * AI Pipeline Orchestrator
 * Reads all CI step outputs → runs AI analyzers → posts to Teams
 */

const fs = require('fs');
const path = require('path');
const { analyzeIncident } = require('./analyzers/incident');
const { analyzeTestGap } = require('./analyzers/test-gap');
const { analyzeSecurity } = require('./analyzers/security');
const { analyzePerformance } = require('./analyzers/performance');
const { analyzePR } = require('./analyzers/pr-review');
const { sendTeamsNotification } = require('./teams');

// ─── Read CI outputs ───────────────────────────────────────────
function readFile(filePath) {
  try {
    return fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf8');
  } catch {
    return '';
  }
}

function getStatus(envVar) {
  const val = process.env[envVar];
  return val === '0' || val === undefined || val === '' ? 'pass' : 'fail';
}

// ─── Main ──────────────────────────────────────────────────────
async function main() {
  console.log('🤖 AI Pipeline Analysis starting...');

  const context = {
    repo: process.env.REPO || 'BM-Ecommerce/Ecom-3d-angular',
    branch: process.env.BRANCH || 'main',
    actor: process.env.ACTOR || 'unknown',
    commitSha: (process.env.COMMIT_SHA || '').slice(0, 7),
    commitMsg: process.env.COMMIT_MSG || '',
    prNumber: process.env.PR_NUMBER || '',
    runUrl: process.env.RUN_URL || '',
  };

  const outputs = {
    build: readFile('build-output.txt'),
    test: readFile('test-output.txt'),
    sonar: readFile('sonar-output.txt'),
    bundle: readFile('bundle-output.txt'),
    e2e: readFile('e2e-output.txt'),
    lighthouse: readFile('lhci-output.txt'),
  };

  const statuses = {
    build: getStatus('BUILD_STATUS'),
    test: getStatus('TEST_STATUS'),
    e2e: process.env.E2E_STATUS !== undefined && process.env.E2E_STATUS !== '' ? getStatus('E2E_STATUS') : null,
    sonar: getStatus('SONAR_STATUS'),
  };

  console.log('📊 Pipeline statuses:', statuses);

  // ─── Run all AI analyzers in parallel ─────────────────────────
  const [incidentAnalysis, testGapAnalysis, securityAnalysis, performanceAnalysis, prAnalysis] =
    await Promise.allSettled([
      analyzeIncident(outputs, statuses),
      analyzeTestGap(outputs.test),
      analyzeSecurity(outputs),
      analyzePerformance(outputs.bundle),
      context.prNumber ? analyzePR(context) : Promise.resolve(null),
    ]);

  const results = {
    incident: incidentAnalysis.status === 'fulfilled' ? incidentAnalysis.value : null,
    testGap: testGapAnalysis.status === 'fulfilled' ? testGapAnalysis.value : null,
    security: securityAnalysis.status === 'fulfilled' ? securityAnalysis.value : null,
    performance: performanceAnalysis.status === 'fulfilled' ? performanceAnalysis.value : null,
    pr: prAnalysis.status === 'fulfilled' ? prAnalysis.value : null,
  };

  console.log('✅ AI analysis complete. Sending Teams notification...');

  // ─── Send to Teams ─────────────────────────────────────────────
  await sendTeamsNotification(context, statuses, outputs, results);

  console.log('📨 Teams notification sent!');
}

main().catch((err) => {
  console.error('❌ AI Pipeline failed:', err.message);
  process.exit(1);
});
