# Mailman Plugin Development Guide

Mailman is 100% free and open source (MIT license). The plugin system lets you extend every part of the email pipeline without modifying core code.

## Quick Start

Create a new plugin in the `plugins/` directory:

```
plugins/
  my-plugin/
    package.json
    index.js
```

### `package.json`
```json
{
  "name": "mailman-plugin-my-feature",
  "version": "1.0.0",
  "main": "index.js",
  "description": "My custom Mailman plugin"
}
```

### `index.js`
```javascript
class MyPlugin {
  id = 'mailman-plugin-my-feature';
  name = 'My Feature';
  version = '1.0.0';
  description = 'Does something awesome with emails.';
  author = 'Your Name';

  async onInit(app) {
    console.log('My plugin initialized!');
    // app is the NestJS INestApplication instance
    // You can register routes, access services, etc.
  }

  async beforeSendEmail(ctx) {
    // Modify the email before it's sent
    ctx.headers['X-Custom-Header'] = 'added-by-my-plugin';
    return ctx;
  }

  async onEmailSynced(email) {
    // Process incoming emails
    if (email.subject.includes('urgent')) {
      email.flags.push('$Important');
    }
    return email;
  }

  getClientConfig() {
    // Sent to the React frontend so it can adapt its UI
    return { enabled: true, features: ['custom-header', 'urgent-flag'] };
  }

  async onDestroy() {
    console.log('Cleaning up...');
  }
}

module.exports = MyPlugin;
```

Drop the folder into `plugins/` and restart the server. It loads automatically.

## Available Hooks

| Hook | When | Use Case |
|------|------|----------|
| `onInit(app)` | Server startup | Register routes, initialize DB connections |
| `onReady(app)` | After all plugins init | Cross-plugin communication |
| `onDestroy()` | Server shutdown | Cleanup resources |
| `beforeSendEmail(ctx)` | Before SMTP send | Encrypt, modify headers, cancel sending |
| `afterSendEmail(result)` | After successful send | Logging, notifications, analytics |
| `onEmailSynced(email)` | After IMAP fetch | Spam scoring, auto-tagging, filtering |
| `onAccountCreated(account)` | New account | Welcome emails, provisioning |
| `onUserLogin(account)` | Authentication | Audit logging, MFA enforcement |
| `registerRoutes(app)` | During init | Add custom REST endpoints |
| `getClientConfig()` | On request | Send feature flags to the React UI |

## Built-in Plugins (Free)

These ship with Mailman out of the box:

| Plugin | ID | Description |
|--------|----|-------------|
| **PGP Encryption** | `mailman-plugin-pgp` | End-to-end OpenPGP encryption using openpgp.js |
| **Spam Filter** | `mailman-plugin-spam-filter` | Local heuristic spam detection with blocklists |
| **Email Templates** | `mailman-plugin-templates` | Save/reuse templates with `{{variable}}` substitution |
| **Audit Log** | `mailman-plugin-audit-log` | JSON audit trail for logins, sends, account changes |
| **Auto Reply** | `mailman-plugin-auto-reply` | Vacation / out-of-office automatic replies |

## Plugin Ideas (Community)

Build any of these as external plugins:

- **AI Email Summarizer** - Use local Ollama to summarize long threads
- **Calendar Integration** - Extract dates from emails, create .ics files
- **Contact Management** - Auto-build address book from email history
- **Translation** - Translate incoming emails via LibreTranslate
- **Sieve Rules** - User-defined email filtering rules engine
- **Read Receipts** - Track when recipients open your emails
- **Email Scheduling** - Queue emails for future delivery
- **DKIM Signing** - Sign outgoing emails with DKIM
- **RSS to Email** - Convert RSS feeds to email digests
- **Webhook Notifications** - POST events to external URLs
- **Custom Themes** - Inject CSS variables into the client UI
- **Two-Factor Auth** - TOTP-based 2FA for login

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `PLUGINS_DIR` | Custom plugins directory (default: `./plugins`) |
| `SPAM_BLOCKED_DOMAINS` | Comma-separated domains for spam filter |
| `SPAM_BLOCKED_KEYWORDS` | Comma-separated keywords for spam filter |
| `TEMPLATES_DIR` | Template storage path |
| `AUDIT_LOG_DIR` | Audit log file directory |

## API Endpoints

Once running, plugins are accessible at:

- `GET /api/plugins` - List all installed plugins
- `GET /api/plugins/config` - Get client-side plugin configs
- `DELETE /api/plugins/:id` - Disable a plugin at runtime

Plugins can also register their own routes under `/api/plugins/<pluginId>/`.
