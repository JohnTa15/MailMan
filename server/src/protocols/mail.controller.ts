import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CurrentAccount, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ImapSyncService } from './imap/imap.sync.service';
import { SmtpService } from './smtp/smtp.service';

interface UploadedAttachment {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

@Controller('mail')
@UseGuards(JwtAuthGuard)
export class MailController {
  constructor(
    private readonly smtpService: SmtpService,
    private readonly imapSyncService: ImapSyncService,
  ) {}

  @Post('send')
  @UseInterceptors(
    FilesInterceptor('attachments', 10, { limits: { fileSize: MAX_ATTACHMENT_BYTES } }),
  )
  async send(
    @CurrentAccount() accountId: string,
    @Body() body: { to?: string; subject?: string; body?: string; html?: string },
    @UploadedFiles() files: UploadedAttachment[] = [],
  ) {
    if (!body.to?.trim()) {
      throw new BadRequestException('A recipient is required');
    }

    const info = await this.smtpService.sendEmail(
      accountId,
      body.to,
      body.subject || '',
      body.body || '',
      body.html,
      files.map((f) => ({ filename: f.originalname, contentType: f.mimetype, content: f.buffer })),
    );
    return { messageId: info.messageId };
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async sync(@CurrentAccount() accountId: string) {
    const added = await this.imapSyncService.syncAccount(accountId);
    return { added };
  }
}
