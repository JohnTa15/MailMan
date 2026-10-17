import { Injectable, Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { MailmanPlugin, AccountInfo } from '../plugin.interface';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Built-in Audit Log Plugin
 *
 * Records all significant actions (logins, sends, account creation)
 * to a local audit log file. Free, no external service needed.
 */
@Injectable()
export class AuditLogPlugin implements MailmanPlugin {
  private readonly logger = new Logger(AuditLogPlugin.name);
  private logFile: string;

  id = 'mailman-plugin-audit-log';
  name = 'Audit Log';
  version = '1.0.0';
  description = 'Logs all authentication events, email sends, and account changes to a local file.';
  author = 'Mailman Contributors';

  async onInit(_app: INestApplication) {
    const logDir = process.env.AUDIT_LOG_DIR || path.join(process.cwd(), 'data', 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    this.logFile = path.join(logDir, 'audit.log');
    this.logger.log(`Audit log writing to ${this.logFile}`);
  }

  private write(event: string, data: Record<string, unknown>) {
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      event,
      ...data,
    });
    fs.appendFileSync(this.logFile, entry + '\n');
  }

  async onUserLogin(account: AccountInfo) {
    this.write('user_login', { accountId: account.id, email: account.email });
  }

  async onAccountCreated(account: AccountInfo) {
    this.write('account_created', { accountId: account.id, email: account.email, type: account.type });
  }

  async afterSendEmail(result: { accountId: string; messageId: string; to: string; timestamp: Date }) {
    this.write('email_sent', {
      accountId: result.accountId,
      messageId: result.messageId,
      to: result.to,
    });
  }

  getClientConfig() {
    return { enabled: true, features: ['login-tracking', 'send-tracking', 'account-events'] };
  }
}
