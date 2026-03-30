/**
 * Microsoft Teams notifier — Short & concise Adaptive Card
 */

const axios = require('axios');

function statusEmoji(status) {
  return status === 'pass' ? '✅' : '❌';
}

function statusColor(statuses) {
  return Object.values(statuses).some((s) => s === 'fail') ? 'attention' : 'good';
}

async function sendTeamsNotification(context, statuses, outputs, results) {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
  if (!webhookUrl) return;

  const color = statusColor(statuses);
  const overallStatus = color === 'good' ? '✅ ALL PASSED' : '❌ FAILED';

  // Build one compact AI summary from all results
  const aiSummary = buildShortSummary(results, statuses);

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
            // ── Header ─────────────────────────────────────────
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
                { title: 'Branch', value: `${context.branch}` },
                { title: 'By', value: context.actor },
                { title: 'Commit', value: `${context.commitSha} — ${context.commitMsg || ''}` },
              ],
            },
            { type: 'separator' },

            // ── Pipeline Results (one line each) ───────────────
            {
              type: 'ColumnSet',
              columns: [
                {
                  type: 'Column',
                  width: 'stretch',
                  items: [
                    { type: 'TextBlock', text: `${statusEmoji(statuses.build)} Build`, size: 'Small', weight: 'Bolder' },
                    { type: 'TextBlock', text: `${statusEmoji(statuses.test)} Unit Tests`, size: 'Small', weight: 'Bolder' },
                    { type: 'TextBlock', text: `${statusEmoji(statuses.sonar)} SonarQube`, size: 'Small', weight: 'Bolder' },
                  ],
                },
              ],
            },
            { type: 'separator' },

            // ── AI Summary (short, only key points) ───────────
            ...(aiSummary
              ? [
                  {
                    type: 'TextBlock',
                    text: '🤖 AI Summary',
                    weight: 'Bolder',
                    size: 'Small',
                    spacing: 'Small',
                  },
                  {
                    type: 'TextBlock',
                    text: aiSummary,
                    wrap: true,
                    size: 'Small',
                    color: 'Attention',
                  },
                ]
              : []),
          ],
          actions: [
            {
              type: 'Action.OpenUrl',
              title: '🔍 View Pipeline',
              url: context.runUrl || `https://github.com/${context.repo}/actions`,
            },
            {
              type: 'Action.OpenUrl',
              title: '📂 Repository',
              url: `https://github.com/${context.repo}`,
            },
          ],
        },
      },
    ],
  };

  await axios.post(webhookUrl, card);
}

/**
 * Build a short 3-5 bullet summary from all AI results
 */
function buildShortSummary(results, statuses) {
  const bullets = [];

  // Only show AI summary if something failed
  const anyFail = Object.values(statuses).some((s) => s === 'fail');
  if (!anyFail) return '✅ Everything looks good!';

  if (results.incident) {
    // Extract just the ROOT CAUSE line
    const rootCause = results.incident.match(/ROOT CAUSE[:\s]+(.+)/i);
    if (rootCause) bullets.push(`🔴 ${rootCause[1].trim()}`);
  }

  if (results.security) {
    const critical = results.security.match(/CRITICAL[^•\n]*[•\-]\s*(.+)/i);
    if (critical) bullets.push(`🔒 ${critical[1].trim()}`);
  }

  if (results.testGap) {
    const coverage = results.testGap.match(/COVERAGE SUMMARY[:\s]+(.+)/i);
    if (coverage) bullets.push(`🧪 ${coverage[1].trim()}`);
  }

  if (results.performance) {
    const issue = results.performance.match(/ISSUES?[^•\n]*[•\-]\s*(.+)/i);
    if (issue) bullets.push(`📦 ${issue[1].trim()}`);
  }

  return bullets.length > 0 ? bullets.join('\n') : null;
}

module.exports = { sendTeamsNotification };
