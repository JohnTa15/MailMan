import { Injectable, NotFoundException } from '@nestjs/common';
import nodemailer from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer';
import { AccountService } from '../../data/accounts/accounts.service';
import { EmailService } from '../../data/emails/emails.service';
import { decryptSecret } from '../../crypto/secret-box';

@Injectable()
export class SmtpService {
  constructor(
    private readonly accountService: AccountService,
    private readonly emailService: EmailService,
  ) {}

  async sendEmail(
    accountId: string,
    to: string,
    subject: string,
    body: string,
    html?: string,
    attachments?: Mail.Attachment[],
  ) {
    const account = await this.accountService.findOne(accountId);
    if (!account || !account.smtpHost) throw new NotFoundException('Account not found');

    const transporter = nodemailer.createTransport({
      host: account.smtpHost,
      port: account.smtpPort || 587,
      secure: account.smtpSecure,
      auth: {
        user: account.email,
        pass: decryptSecret(account.encryptedPassword),
      },
    });

    const info = await transporter.sendMail({
      from: `"${account.displayName || account.email}" <${account.email}>`,
      to,
      subject,
      text: body,
      html,
      attachments,
    });

    // Keep a copy in the local Sent folder
    await this.emailService.create({
      accountId,
      messageId: info.messageId,
      subject: subject || '(No Subject)',
      from: account.email,
      fromName: account.displayName || '',
      to,
      body,
      html,
      preview: body.replace(/\s+/g, ' ').trim().slice(0, 200),
      date: new Date(),
      isRead: true,
      folder: 'sent',
    });

    return info;
  }
}
