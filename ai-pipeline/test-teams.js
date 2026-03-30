/**
 * Quick Teams webhook test — bypasses all AI analysis
 * Run: node ai-pipeline/test-teams.js
 */

require('dotenv').config();
const axios = require('axios');

async function testTeams() {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error('❌ TEAMS_WEBHOOK_URL is not set in .env');
    process.exit(1);
  }

  console.log('📨 Sending test message to Teams...');

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
            {
              type: 'TextBlock',
              text: '✅ Teams Webhook Test — Working!',
              weight: 'Bolder',
              size: 'Large',
              color: 'Good',
            },
            {
              type: 'TextBlock',
              text: 'If you see this in Teams, the webhook is connected correctly.',
              wrap: true,
              size: 'Small',
            },
          ],
        },
      },
    ],
  };

  try {
    const response = await axios.post(webhookUrl, card);
    console.log('✅ Success! Status:', response.status);
    console.log('Check your Teams channel now.');
  } catch (err) {
    console.error('❌ Failed to send:', err.response?.status, err.response?.data || err.message);
  }
}

testTeams();
