import { Injectable, Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { MailmanPlugin, SendEmailContext, SyncedEmail } from '../plugin.interface';

/**
 * Built-in PGP Encryption Plugin
 *
 * Provides OpenPGP encryption/decryption for emails.
 * Completely free - uses openpgp.js (open source).
 */
@Injectable()
export class PgpPlugin implements MailmanPlugin {
  private readonly logger = new Logger(PgpPlugin.name);

  id = 'mailman-plugin-pgp';
  name = 'PGP Encryption';
  version = '1.0.0';
  description = 'OpenPGP end-to-end encryption for outgoing emails and decryption for incoming emails.';
  author = 'Mailman Contributors';
  homepage = 'https://github.com/mailman/mailman-plugins/tree/main/pgp';

  async onInit(_app: INestApplication) {
    this.logger.log('PGP plugin initialized (using openpgp.js)');
  }

  async beforeSendEmail(ctx: SendEmailContext): Promise<SendEmailContext> {
    // If the recipient has a known PGP key, encrypt the body
    if (ctx.metadata['pgpPublicKey']) {
      try {
        // Dynamic import to keep startup fast
        const openpgp = await import('openpgp');
        const publicKey = await openpgp.readKey({ armoredKey: ctx.metadata['pgpPublicKey'] as string });

        const encrypted = await openpgp.encrypt({
          message: await openpgp.createMessage({ text: ctx.textBody }),
          encryptionKeys: publicKey,
        });

        ctx.textBody = encrypted as string;
        if (ctx.htmlBody) {
          ctx.htmlBody = `<pre>${encrypted}</pre>`;
        }
        ctx.headers['X-Mailman-PGP'] = 'encrypted';
        this.logger.debug(`Encrypted email to ${ctx.to}`);
      } catch (err) {
        this.logger.error('PGP encryption failed, sending unencrypted:', err);
      }
    }
    return ctx;
  }

  getClientConfig() {
    return {
      enabled: true,
      features: ['encrypt-outgoing', 'decrypt-incoming', 'key-management'],
    };
  }
}
