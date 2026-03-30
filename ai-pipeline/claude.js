/**
 * Claude API wrapper using @anthropic-ai/sdk
 */

const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

/**
 * Ask Claude a question and get a plain text response
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @returns {Promise<string>}
 */
async function ask(systemPrompt, userMessage) {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001', // Fast + cheap for CI pipelines
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  return response.content[0]?.text || '';
}

module.exports = { ask };
