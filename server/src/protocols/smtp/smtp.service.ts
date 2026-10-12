import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { AccountService } from '../../data/accounts/accounts.service';

@Injectable()
export class SmtpService {
  constructor(private readonly accountService: AccountService) {}

  async sendEmail(
    accountId: string,
    to: string,
    subject: string,
    body: string,
    html?: string,
    attachments?: any[],
  ) {
    const account = await this.accountService.findOne(accountId);
    if (!account) throw new Error('Account not found');

    const transporter = nodemailer.createTransport({
      host: account.smtpHost || 'smtp.example.com',
      port: parseInt(account.smtpPort || '587'),
      secure: account.smtpSecure,
      auth: {
        user: account.email,
        pass: account.encryptedPassword || '',
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

    return info;
  }
}
