/**
 * AI PR Review Bot
 * Fetches the PR diff from GitHub API → Claude reviews the Angular code changes
 * Posts review comments back on the PR + includes summary in Teams message
 */

const axios = require('axios');
const { ask } = require('../claude');

const SYSTEM_PROMPT = `You are a senior Angular developer reviewing a Pull Request for an Angular 14
ecommerce 3D visualizer app. The app uses Three.js, Karma+Jasmine, and communicates
with the BlindMatrix ecommerce API.

Review the git diff and respond in this format (max 200 words):
🔴 BUGS (block merge):
  • [file:line] — [issue and fix]
⚠️  WARNINGS (fix this sprint):
  • [file:line] — [issue]
💡 SUGGESTIONS (optional improvements):
  • [suggestion]
✅ VERDICT: [Approve / Request Changes] — [one line reason]`;

async function analyzePR(context) {
  const { repo, prNumber } = context;
  if (!prNumber) return null;

  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) return null;

  try {
    // Fetch PR diff from GitHub API
    const response = await axios.get(
      `https://api.github.com/repos/${repo}/pulls/${prNumber}/files`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    const files = response.data;
    if (!files.length) return null;

    // Only review TypeScript/HTML files, skip assets/styles
    const relevantFiles = files
      .filter((f) => /\.(ts|html)$/.test(f.filename) && !f.filename.includes('spec.ts'))
      .slice(0, 10); // Max 10 files to keep tokens low

    if (!relevantFiles.length) return null;

    const diff = relevantFiles
      .map((f) => `--- ${f.filename} (${f.status}, +${f.additions}/-${f.deletions})\n${f.patch || ''}`)
      .join('\n\n')
      .slice(0, 4000); // Limit diff size

    const review = await ask(SYSTEM_PROMPT, `PR #${prNumber} diff:\n\n${diff}`);

    // Post review comment on the PR
    if (review && githubToken) {
      await postPRComment(repo, prNumber, review, githubToken);
    }

    return review;
  } catch (err) {
    console.warn('PR review skipped:', err.message);
    return null;
  }
}

async function postPRComment(repo, prNumber, review, token) {
  await axios.post(
    `https://api.github.com/repos/${repo}/issues/${prNumber}/comments`,
    { body: `## 🤖 AI Code Review\n\n${review}\n\n---\n*Powered by Claude AI*` },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  );
}

module.exports = { analyzePR };
