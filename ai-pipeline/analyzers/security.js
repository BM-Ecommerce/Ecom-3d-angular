/**
 * AI Security Scanner
 * Dynamically scans actual CI build/test output for security issues
 */

const { ask } = require('../claude');

const SYSTEM_PROMPT = `You are a security engineer reviewing CI pipeline output for an Angular 14 app.
Analyze ONLY what is present in the provided output — do not mention issues that are not visible.

Respond in this format (max 150 words):
🔴 CRITICAL (fix before merge):
  • [issue found in output]: [fix]
⚠️  WARNING (fix this sprint):
  • [issue found in output]: [explanation]
✅ SAFE: [what looks good based on the output]

If no issues found, respond: ✅ No security issues detected in this run.
Do NOT mention or remind about issues not present in the provided output.`;

async function analyzeSecurity(outputs) {
  const combinedOutput = Object.values(outputs)
    .filter(Boolean)
    .join('\n')
    .slice(0, 3000);

  if (!combinedOutput.trim()) return null;

  return await ask(
    SYSTEM_PROMPT,
    `CI pipeline output to scan for security issues:\n\n${combinedOutput}`
  );
}

module.exports = { analyzeSecurity };
