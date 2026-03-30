/**
 * AI Incident Analyzer
 * When any CI step fails → Claude reads the error and gives root cause + fix
 */

const { ask } = require('../claude');

const SYSTEM_PROMPT = `You are a senior DevOps engineer analyzing CI/CD pipeline failures
for an Angular 14 ecommerce 3D visualizer app (Ecom-3d-angular).
The app uses: Angular 14, Three.js, Karma+Jasmine tests, SonarQube, Docker+Nginx.

Respond in max 3 lines total:
🔴 ROOT CAUSE: [one line]
🔧 FIX: [one line fix]
🛡️ PREVENT: [one line]`;

async function analyzeIncident(outputs, statuses) {
  const failedSteps = Object.entries(statuses)
    .filter(([, status]) => status === 'fail')
    .map(([step]) => step);

  if (failedSteps.length === 0) return null;

  const errorContext = failedSteps
    .map((step) => {
      const output = outputs[step] || '';
      // Only send last 100 lines to save tokens
      const lines = output.split('\n').slice(-100).join('\n');
      return `=== ${step.toUpperCase()} FAILURE ===\n${lines}`;
    })
    .join('\n\n');

  return await ask(
    SYSTEM_PROMPT,
    `The following CI steps failed: ${failedSteps.join(', ')}\n\n${errorContext}`
  );
}

module.exports = { analyzeIncident };
