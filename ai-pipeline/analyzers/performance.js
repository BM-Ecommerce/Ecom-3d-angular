/**
 * AI Performance / Bundle Size Analyzer
 * Reads bundle output → flags Three.js weight, lazy loading, large chunks
 */

const { ask } = require('../claude');

const SYSTEM_PROMPT = `You are a performance engineer reviewing an Angular 14 bundle.
The app uses Three.js (3D graphics) which is inherently large (~600KB minified).
Output path: dist/visualizer/

Respond in max 2 lines:
📦 BUNDLE SUMMARY: [total size — status vs budget]
⚠️ BIGGEST ISSUE: [top one issue and fix in one line]
If no data: respond "📦 Bundle report unavailable."`;

// Angular 14 budget thresholds from angular.json
const BUDGETS = {
  initialWarning: 10 * 1024 * 1024, // 10MB
  initialError: 20 * 1024 * 1024,   // 20MB
};

async function analyzePerformance(bundleOutput) {
  if (!bundleOutput || bundleOutput.includes('not found')) {
    return '📦 Bundle report unavailable — build may have failed or dist/visualizer was not generated.';
  }

  return await ask(
    SYSTEM_PROMPT,
    `Angular bundle size report for dist/visualizer:\n\n${bundleOutput}\n\nAngular budget thresholds: Warning at 10MB, Error at 20MB.`
  );
}

module.exports = { analyzePerformance };
