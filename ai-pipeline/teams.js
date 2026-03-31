/**
 * Microsoft Teams notifier — Simple & user friendly Adaptive Card
 */

const axios = require('axios');

function statusEmoji(status) {
  return status === 'pass' ? '✅ Passed' : '❌ Failed';
}

function overallStatus(statuses) {
  if (statuses.build === 'fail') return '❌ Build Failed';
  if (statuses.test === 'fail') return '❌ Unit Tests Failed';
  if (statuses.e2e === 'fail') return '❌ E2E Tests Failed';
  if (statuses.lighthouse === 'fail') return '⚠️ Performance Issues';
  if (statuses.sonar === 'fail') return '❌ Code Quality Failed';
  return '✅ All Checks Passed';
}

function headerColor(statuses) {
  return Object.values(statuses).some((s) => s === 'fail') ? 'Attention' : 'Good';
}

function statusLabel(val) {
  if (val === null || val === undefined) return '⏭️ Skipped';
  return statusEmoji(val);
}

async function sendTeamsNotification(context, statuses, _outputs, results) {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('⚠️ TEAMS_WEBHOOK_URL not set');
    return;
  }

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

            // ── 3. Pipeline Step Results ───────────────────────
            {
              type: 'TextBlock',
              text: 'Pipeline Results',
              weight: 'Bolder',
              size: 'Medium',
              spacing: 'Medium',
              separator: true,
            },
            {
              type: 'FactSet',
              facts: [
                { title: '🔨 Build',        value: statusEmoji(statuses.build) },
                { title: '🧪 Unit Tests',   value: statusEmoji(statuses.test) },
                { title: '🎭 E2E Tests',    value: statusLabel(statuses.e2e) },
                { title: '🏎️ Lighthouse',  value: statusLabel(statuses.lighthouse) },
                { title: '🔍 SonarQube',   value: statusEmoji(statuses.sonar) },
              ],
            },

            // ── 4. AI Summary ──────────────────────────────────
            {
              type: 'TextBlock',
              text: aiSummary
                ? '🤖 What Went Wrong (AI Analysis)'
                : '🤖 AI Review',
              weight: 'Bolder',
              size: 'Medium',
              spacing: 'Medium',
              separator: true,
            },
            {
              type: 'TextBlock',
              text: aiSummary || '✅ No issues found. Great work! 🎉',
              wrap: true,
              size: 'Small',
              spacing: 'Small',
              color: aiSummary ? 'Attention' : 'Good',
            },
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

  try {
    const response = await axios.post(webhookUrl, card);
    console.log('✅ Teams notification sent. Status:', response.status);
  } catch (err) {
    console.error('❌ Teams notification failed:', err.response?.status, err.response?.data || err.message);
    throw err;
  }
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
