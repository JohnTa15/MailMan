/**
 * Example External Plugin: Webhook Notifications
 *
 * Demonstrates how to build a third-party Mailman plugin.
 * Drop this folder into `plugins/webhook-example/` and restart the server.
 *
 * Configure via environment variables:
 *   WEBHOOK_URL=https://your-server.com/hook
 */

const https = require('https');
const http = require('http');

class WebhookPlugin {
  id = 'mailman-plugin-webhook';
  name = 'Webhook Notifications';
  version = '1.0.0';
  description = 'Sends HTTP webhook notifications when emails are sent or received.';
  author = 'Mailman Community';
  homepage = 'https://github.com/mailman/openwebmail';

  webhookUrl = process.env.WEBHOOK_URL || '';

  async onInit(_app) {
    if (!this.webhookUrl) {
      console.warn('[webhook-plugin] WEBHOOK_URL not set, plugin will be inactive.');
    } else {
      console.log(`[webhook-plugin] Webhooks will be sent to ${this.webhookUrl}`);
    }
  }

  async afterSendEmail(result) {
    await this.sendWebhook('email.sent', {
      accountId: result.accountId,
      messageId: result.messageId,
      to: result.to,
      timestamp: result.timestamp,
    });
  }

  async onUserLogin(account) {
    await this.sendWebhook('user.login', {
      accountId: account.id,
      email: account.email,
    });
  }

  async onEmailSynced(email) {
    await this.sendWebhook('email.received', {
      subject: email.subject,
      from: email.from,
      date: email.date,
      folder: email.folder,
    });
    return email; // Always return the email unchanged
  }

  getClientConfig() {
    return {
      enabled: !!this.webhookUrl,
      features: ['send-notifications', 'receive-notifications', 'login-notifications'],
    };
  }

  /* ---- Internal helper ---- */

  async sendWebhook(event, data) {
    if (!this.webhookUrl) return;
    const payload = JSON.stringify({ event, data, plugin: this.id, timestamp: new Date().toISOString() });
    const url = new URL(this.webhookUrl);
    const lib = url.protocol === 'https:' ? https : http;

    return new Promise((resolve) => {
      const req = lib.request(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            'X-Mailman-Event': event,
          },
        },
        (res) => {
          res.resume();
          resolve();
        }
      );
      req.on('error', () => resolve()); // Don't crash on webhook failure
      req.write(payload);
      req.end();
    });
  }
}

module.exports = WebhookPlugin;
