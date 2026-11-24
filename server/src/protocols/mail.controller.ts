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
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MailboxesService } from '../mailboxes/mailboxes.service';
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
    private readonly mailboxes: MailboxesService,
  ) {}

  @Post('send')
  @UseInterceptors(
    FilesInterceptor('attachments', 10, { limits: { fileSize: MAX_ATTACHMENT_BYTES } }),
  )
  async send(
    @CurrentUser() userId: string,
    @Body() body: { accountId?: string; to?: string; subject?: string; body?: string; html?: string },
    @UploadedFiles() files: UploadedAttachment[] = [],
  ) {
    if (!body.to?.trim()) {
      throw new BadRequestException('A recipient is required');
    }
    // The From mailbox; optional when the user has exactly one
    let accountId = body.accountId;
    if (!accountId) {
      const mine = await this.mailboxes.list(userId);
      if (mine.length !== 1) throw new BadRequestException('Choose which mailbox to send from');
      accountId = mine[0].id;
    }
    await this.mailboxes.owned(userId, accountId);

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
  async sync(@CurrentUser() userId: string, @Body() body: { accountId?: string } = {}) {
    return this.mailboxes.sync(userId, body?.accountId);
  }
}
