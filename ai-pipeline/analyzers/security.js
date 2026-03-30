/**
 * AI Security Scanner
 * Scans build/test output for known security issues in the Angular repo
 * Specifically flags the hardcoded API key in environment files
 */

const { ask } = require('../claude');

const SYSTEM_PROMPT = `You are a security engineer reviewing an Angular 14 app for vulnerabilities.
Known issue: environment.ts and environment.prod.ts contain hardcoded API keys on GitHub.

Scan the provided output and respond in this format (max 150 words):
🔴 CRITICAL (fix before merge):
  • [issue]: [file/location] — [fix]
⚠️  WARNING (fix this sprint):
  • [issue]: [explanation]
✅ SAFE: [what looks good]

If no issues found, respond: ✅ No security issues detected.`;

// Known patterns to flag regardless of CI output
const KNOWN_ISSUES = [
  {
    pattern: /apiKey.*['"]\w{8}-\w{4}-\w{4}-\w{4}-\w{12}['"]/,
    message: '🔴 CRITICAL: Hardcoded API key detected in environment files\n  • environment.ts & environment.prod.ts\n  • Fix: Move to GitHub Secrets → replace with process.env.API_KEY in build',
  },
  {
    pattern: /innerHTML/,
    message: '⚠️  WARNING: innerHTML usage detected — potential XSS risk\n  • Use DomSanitizer or Angular binding instead',
  },
];

async function analyzeSecurity(outputs) {
  const combinedOutput = Object.values(outputs).join('\n').slice(0, 3000);

  // Always flag known issues for this specific repo
  const staticFindings = KNOWN_ISSUES
    .filter((issue) => issue.pattern.test(combinedOutput))
    .map((issue) => issue.message);

  if (staticFindings.length > 0) {
    return staticFindings.join('\n\n');
  }

  // If no static findings, ask Claude to analyze
  if (!combinedOutput.trim()) return null;

  return await ask(
    SYSTEM_PROMPT,
    `CI pipeline output to scan for security issues:\n\n${combinedOutput}`
  );
}

module.exports = { analyzeSecurity };
