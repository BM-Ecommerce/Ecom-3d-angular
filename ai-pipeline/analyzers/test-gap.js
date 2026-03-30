/**
 * AI Test Gap Analyzer
 * Reads Karma coverage output → identifies HIGH RISK uncovered functions
 * Focuses on key files: three.service.ts, configurator.service.ts, api.service.ts
 */

const { ask } = require('../claude');

const SYSTEM_PROMPT = `You are a QA lead reviewing test coverage for an Angular 14 3D visualizer app.
Key high-risk files to prioritize:
- three.service.ts (74KB) — handles all 3D model rendering with Three.js
- configurator.service.ts (44KB) — manages product configuration
- api.service.ts — communicates with BlindMatrix ecommerce API

Analyze the coverage report and respond in this format (max 150 words):
⚠️ COVERAGE SUMMARY: [overall % if visible]
🎯 HIGH RISK GAPS:
  • [filename]: [uncovered function] — [why it's risky]
  • [repeat for top 3 gaps]
✅ SUGGESTION: [one actionable next step]`;

async function analyzeTestGap(testOutput) {
  if (!testOutput) return null;

  // Extract coverage section from Karma output
  const coverageStart = testOutput.indexOf('Coverage summary');
  const coverageSection =
    coverageStart !== -1 ? testOutput.slice(coverageStart, coverageStart + 2000) : testOutput.slice(-2000);

  if (!coverageSection.trim()) return null;

  return await ask(
    SYSTEM_PROMPT,
    `Karma test coverage output:\n\n${coverageSection}`
  );
}

module.exports = { analyzeTestGap };
