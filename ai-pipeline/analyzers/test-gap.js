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

Respond in max 2 lines:
⚠️ COVERAGE SUMMARY: [overall % — statements/branches/functions]
🎯 TOP RISK: [highest risk uncovered file and why in one line]`;

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
