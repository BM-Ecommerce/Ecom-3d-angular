/**
 * Microsoft Teams notifier using Adaptive Cards
 */

const axios = require('axios');

function statusEmoji(status) {
  return status === 'pass' ? '✅' : '❌';
}

function statusColor(statuses) {
  const anyFail = Object.values(statuses).some((s) => s === 'fail');
  return anyFail ? 'attention' : 'good';
}

/**
 * Send full pipeline report to Microsoft Teams channel
 */
async function sendTeamsNotification(context, statuses, outputs, results) {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('⚠️  TEAMS_WEBHOOK_URL not set — skipping notification');
    return;
  }

  const color = statusColor(statuses);
  const overallStatus = color === 'good' ? '✅ PASSED' : '❌ FAILED';

  // ─── Build AI Analysis section ──────────────────────────────
  const aiSections = buildAISections(results);

  const card = {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            // Header
            {
              type: 'Container',
              style: color,
              items: [
                {
                  type: 'TextBlock',
                  text: `🚀 Ecom-3D-Angular | ${overallStatus}`,
                  weight: 'Bolder',
                  size: 'Large',
                  color: color === 'good' ? 'Good' : 'Attention',
                },
                {
                  type: 'FactSet',
                  facts: [
                    { title: 'Branch', value: context.branch },
                    { title: 'Pushed by', value: context.actor },
                    { title: 'Commit', value: context.commitSha },
                    { title: 'Message', value: context.commitMsg || '—' },
                  ],
                },
              ],
            },
            // Pipeline Results
            {
              type: 'Container',
              items: [
                {
                  type: 'TextBlock',
                  text: 'Pipeline Results',
                  weight: 'Bolder',
                  size: 'Medium',
                  spacing: 'Medium',
                },
                {
                  type: 'FactSet',
                  facts: [
                    { title: `${statusEmoji(statuses.build)} Build`, value: statuses.build === 'pass' ? 'PASSED' : 'FAILED' },
                    { title: `${statusEmoji(statuses.test)} Unit Tests`, value: statuses.test === 'pass' ? 'PASSED' : 'FAILED' },
                    { title: `${statusEmoji(statuses.sonar)} SonarQube`, value: statuses.sonar === 'pass' ? 'PASSED' : 'FAILED' },
                  ],
                },
              ],
            },
            // AI Analysis
            ...aiSections,
          ],
          actions: [
            {
              type: 'Action.OpenUrl',
              title: '🔍 View Pipeline Run',
              url: context.runUrl || `https://github.com/${context.repo}/actions`,
            },
            {
              type: 'Action.OpenUrl',
              title: '📂 View Repository',
              url: `https://github.com/${context.repo}`,
            },
          ],
        },
      },
    ],
  };

  await axios.post(webhookUrl, card);
}

function buildAISections(results) {
  const sections = [];

  if (results.incident) {
    sections.push({
      type: 'Container',
      style: 'attention',
      items: [
        { type: 'TextBlock', text: '🤖 AI Incident Analysis', weight: 'Bolder', size: 'Medium', spacing: 'Medium' },
        { type: 'TextBlock', text: results.incident, wrap: true, size: 'Small' },
      ],
    });
  }

  if (results.security) {
    sections.push({
      type: 'Container',
      style: 'attention',
      items: [
        { type: 'TextBlock', text: '🔒 Security Findings', weight: 'Bolder', size: 'Medium', spacing: 'Medium' },
        { type: 'TextBlock', text: results.security, wrap: true, size: 'Small' },
      ],
    });
  }

  if (results.testGap) {
    sections.push({
      type: 'Container',
      items: [
        { type: 'TextBlock', text: '🧪 Test Gap Analysis', weight: 'Bolder', size: 'Medium', spacing: 'Medium' },
        { type: 'TextBlock', text: results.testGap, wrap: true, size: 'Small' },
      ],
    });
  }

  if (results.performance) {
    sections.push({
      type: 'Container',
      items: [
        { type: 'TextBlock', text: '📦 Performance / Bundle', weight: 'Bolder', size: 'Medium', spacing: 'Medium' },
        { type: 'TextBlock', text: results.performance, wrap: true, size: 'Small' },
      ],
    });
  }

  if (results.pr) {
    sections.push({
      type: 'Container',
      items: [
        { type: 'TextBlock', text: '👁️ PR Review Summary', weight: 'Bolder', size: 'Medium', spacing: 'Medium' },
        { type: 'TextBlock', text: results.pr, wrap: true, size: 'Small' },
      ],
    });
  }

  return sections;
}

module.exports = { sendTeamsNotification };
