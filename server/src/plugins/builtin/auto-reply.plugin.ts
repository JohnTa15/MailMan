import { Injectable, Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { MailmanPlugin, SyncedEmail } from '../plugin.interface';

/**
 * Built-in Auto-Reply Plugin
 *
 * Sends automatic out-of-office replies based on user-configured rules.
 */
@Injectable()
export class AutoReplyPlugin implements MailmanPlugin {
  private readonly logger = new Logger(AutoReplyPlugin.name);

  id = 'mailman-plugin-auto-reply';
  name = 'Auto Reply / Vacation';
  version = '1.0.0';
  description = 'Automatic out-of-office and vacation replies with customizable messages per account.';
  author = 'Mailman Contributors';

  async onInit(_app: INestApplication) {
    this.logger.log('Auto-reply plugin initialized');
  }

  async onEmailSynced(email: SyncedEmail): Promise<SyncedEmail> {
    // Tag emails that match auto-reply conditions so the SMTP service can respond
    const autoReplyEnabled = email.metadata['autoReplyEnabled'];
    if (autoReplyEnabled && !email.flags.includes('$AutoReplied')) {
      email.metadata['needsAutoReply'] = true;
      email.metadata['autoReplyMessage'] = email.metadata['autoReplyMessage'] || 'I am currently out of office.';
    }
    return email;
  }

  getClientConfig() {
    return {
      enabled: true,
      features: ['vacation-mode', 'custom-message', 'date-range', 'per-account'],
    };
  }
}
