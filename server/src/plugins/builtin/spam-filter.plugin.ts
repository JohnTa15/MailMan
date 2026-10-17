import { Injectable, Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { MailmanPlugin, SendEmailContext, SyncedEmail } from '../plugin.interface';

/**
 * Built-in Spam Filter Plugin
 *
 * Uses heuristics + custom rules to detect spam.
 * Free, no external API required.
 */
@Injectable()
export class SpamFilterPlugin implements MailmanPlugin {
  private readonly logger = new Logger(SpamFilterPlugin.name);
  private blockedDomains: Set<string> = new Set();
  private blockedKeywords: string[] = [];

  id = 'mailman-plugin-spam-filter';
  name = 'Spam Filter';
  version = '1.0.0';
  description = 'Local heuristic spam filter with custom blocklists. No external API needed.';
  author = 'Mailman Contributors';

  async onInit(_app: INestApplication) {
    // Load default blocklist from env or config
    const domains = process.env.SPAM_BLOCKED_DOMAINS || '';
    const keywords = process.env.SPAM_BLOCKED_KEYWORDS || '';
    this.blockedDomains = new Set(domains.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean));
    this.blockedKeywords = keywords.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean);
    this.logger.log(`Spam filter loaded: ${this.blockedDomains.size} domains, ${this.blockedKeywords.length} keywords`);
  }

  async onEmailSynced(email: SyncedEmail): Promise<SyncedEmail> {
    let spamScore = 0;
    const fromLower = email.from.toLowerCase();

    // Check blocked domains
    for (const domain of this.blockedDomains) {
      if (fromLower.includes(domain)) {
        spamScore += 5;
        break;
      }
    }

    // Check keywords in subject and body
    const textToCheck = `${email.subject} ${email.body}`.toLowerCase();
    for (const kw of this.blockedKeywords) {
      if (textToCheck.includes(kw)) {
        spamScore += 2;
      }
    }

    // Heuristic checks
    if (email.subject === email.subject.toUpperCase() && email.subject.length > 10) {
      spamScore += 1; // ALL CAPS subject
    }
    if (email.attachments.length > 5) {
      spamScore += 1; // Many attachments
    }

    email.metadata['spamScore'] = spamScore;
    if (spamScore >= 5) {
      email.flags.push('$Junk');
    }

    return email;
  }

  getClientConfig() {
    return {
      enabled: true,
      features: ['domain-blocklist', 'keyword-filter', 'heuristic-scoring'],
    };
  }
}
