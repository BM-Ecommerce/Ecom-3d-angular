/**
 * Microsoft Teams notifier — Simple & user friendly Adaptive Card
 */

const axios = require('axios');

function statusEmoji(status) {
  return status === 'pass' ? '✅ Passed' : '❌ Failed';
}

function overallStatus(statuses) {
  return Object.values(statuses).some((s) => s === 'fail') ? '❌ Build Failed' : '✅ Build Passed';
}

function headerColor(statuses) {
  return Object.values(statuses).some((s) => s === 'fail') ? 'Attention' : 'Good';
}

async function sendTeamsNotification(context, statuses, _outputs, results) {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
  if (!webhookUrl) return;

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

            // ── 1. Title ───────────────────────────────────────
            {
              type: 'TextBlock',
              text: `Ecom 3D Angular — ${overallStatus(statuses)}`,
              weight: 'Bolder',
              size: 'Large',
              color: headerColor(statuses),
              wrap: true,
            },

            // ── 2. Push Info ───────────────────────────────────
            {
              type: 'FactSet',
              spacing: 'Small',
              facts: [
                { title: '👤 Developer', value: context.actor },
                { title: '🌿 Branch',    value: context.branch },
                { title: '📝 Commit',    value: context.commitSha },
                { title: '💬 Message',   value: context.commitMsg || '—' },
              ],
            },

            { type: 'separator' },

            // ── 3. Pipeline Step Results ───────────────────────
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
                { title: '🔨 Build',      value: statusEmoji(statuses.build) },
                { title: '🧪 Unit Tests', value: statusEmoji(statuses.test) },
                { title: '🔍 SonarQube', value: statusEmoji(statuses.sonar) },
              ],
            },

            { type: 'separator' },

            // ── 4. AI Summary (only shown if something failed) ─
            ...(aiSummary
              ? [
                  {
                    type: 'TextBlock',
                    text: '🤖 What Went Wrong (AI Analysis)',
                    weight: 'Bolder',
                    size: 'Medium',
                    spacing: 'Medium',
                  },
                  {
                    type: 'TextBlock',
                    text: aiSummary,
                    wrap: true,
                    size: 'Small',
                    spacing: 'Small',
                  },
                ]
              : [
                  {
                    type: 'TextBlock',
                    text: '🤖 AI Review: No issues found. Great work! 🎉',
                    wrap: true,
                    size: 'Small',
                    color: 'Good',
                    spacing: 'Medium',
                  },
                ]),
          ],

          // ── 5. Action Buttons ────────────────────────────────
          actions: [
            {
              type: 'Action.OpenUrl',
              title: '🔍 View Pipeline Logs',
              url: context.runUrl || `https://github.com/${context.repo}/actions`,
            },
            {
              type: 'Action.OpenUrl',
              title: '📂 Open Repository',
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
 * Extract only the most important line from each AI analyzer
 */
function buildShortSummary(results, statuses) {
  const anyFail = Object.values(statuses).some((s) => s === 'fail');
  if (!anyFail) return null;

  const bullets = [];

  if (results.incident) {
    const match = results.incident.match(/ROOT CAUSE[:\s]+(.+)/i);
    if (match) bullets.push(`🔴 Root Cause: ${match[1].trim()}`);
  }

  if (results.security) {
    const match = results.security.match(/CRITICAL[^•\n]*[•\-]\s*(.+)/i);
    if (match) bullets.push(`🔒 Security: ${match[1].trim()}`);
  }

  if (results.testGap) {
    const match = results.testGap.match(/COVERAGE SUMMARY[:\s]+(.+)/i);
    if (match) bullets.push(`🧪 Coverage: ${match[1].trim()}`);
  }

  if (results.performance) {
    const match = results.performance.match(/BIGGEST ISSUE[:\s]+(.+)/i);
    if (match) bullets.push(`📦 Bundle: ${match[1].trim()}`);
  }

  return bullets.length > 0 ? bullets.join('\n\n') : null;
}

module.exports = { sendTeamsNotification };
