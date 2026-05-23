const fs = require('fs');
const path = require('path');

// Read Bot Token from .env
const envPath = path.join(__dirname, '..', '.env');
let botToken = '';

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const tokenMatch = envContent.match(/TELEGRAM_BOT_TOKEN\s*=\s*(.*)/);
  if (tokenMatch && tokenMatch[1]) {
    botToken = tokenMatch[1].trim();
  }
} catch (err) {
  console.error("Error reading .env file:", err.message);
  process.exit(1);
}

if (!botToken) {
  console.error("TELEGRAM_BOT_TOKEN is not configured in your .env file!");
  process.exit(1);
}

// Get webhook URL from CLI arguments
const webhookUrlInput = process.argv[2];

if (!webhookUrlInput) {
  console.log("\nUsage: node scripts/set-webhook.js <YOUR_PUBLIC_HTTPS_URL>");
  console.log("Example: node scripts/set-webhook.js https://my-ngrok-subdomain.ngrok-free.app");
  console.log("Example: node scripts/set-webhook.js https://aegis-stadium-os-xyz-uc.a.run.app");
  console.log("\nIf debugging locally, expose port 3002 via ngrok or cloudflared first, then use its HTTPS URL.\n");
  process.exit(1);
}

const cleanUrl = webhookUrlInput.endsWith('/') ? webhookUrlInput.slice(0, -1) : webhookUrlInput;
const webhookFullUrl = `${cleanUrl}/api/telegram/webhook`;

console.log(`Setting Telegram Bot Webhook to: ${webhookFullUrl}`);

const setWebhookUrl = `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookFullUrl)}`;

fetch(setWebhookUrl)
  .then(res => res.json())
  .then(data => {
    if (data.ok) {
      console.log("\n=======================================================");
      console.log(" 🎉 SUCCESS: Telegram Bot Webhook registered successfully!");
      console.log(` Target Webhook URL: ${webhookFullUrl}`);
      console.log(" Try sending a message, picture, or voice note to your Telegram bot!");
      console.log("=======================================================\n");
    } else {
      console.error("\n❌ FAILED to register webhook:", data.description);
      console.log("=======================================================\n");
    }
  })
  .catch(err => {
    console.error("\n❌ Connection error:", err.message);
  });
