import { Injectable } from '@nestjs/common';
import Imap from 'imap';
import { EmailService } from '../data/emails/emails.service';
import { AccountService } from '../data/accounts/accounts.service';

@Injectable()
export class ImapSyncService {
  constructor(
    private readonly emailService: EmailService,
    private readonly accountService: AccountService,
  ) {}

  async syncAccount(accountId: string) {
    const account = await this.accountService.findOne(accountId);
    if (!account || !account.connected) return;

    const imap = new Imap({
      user: account.email,
      password: account.encryptedPassword || '',
      host: account.imapHost,
      port: parseInt(account.imapPort || '993'),
      tls: account.imapSecure,
      tlsOptions: { rejectUnauthorized: false },
    });

    await new Promise<void>((resolve, reject) => {
      imap.openBox('INBOX', true, (err, box) => {
        if (err) return reject(err);
        
        const fetch = imap.fetch('1:100', { bodies: '', struct: true });
        const emails: any[] = [];

        fetch.on('message', (mailBox, seqNo) => {
          mailBox.on('body', (stream, info) => {
            let buffer = '';
            stream.on('data', (chunk) => (buffer += chunk.toString('utf8')));
            stream.on('end', () => {
              emails.push({
                accountId,
                subject: info.subject || '(No Subject)',
                from: info.textIds?.[0]?.from || '',
                date: info.date || new Date(),
                body: buffer,
                folder: 'inbox',
              });
            });
          });
        });

        fetch.on('end', () => {
          resolve();
        });
      });
    });

    // Save emails to database
    for (const email of emails) {
      await this.emailService.create(email);
    }
  }
}
