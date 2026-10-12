import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { EmailService } from './emails.service';
import { Email } from '../../database/entities/email.entity';

@Controller('emails')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Get()
  async findAll(@Query() query: any): Promise<Email[]> {
    return this.emailService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Email | null> {
    return this.emailService.findOne(id);
  }

  @Post()
  async create(@Body() createEmailDto: Partial<Email>): Promise<Email> {
    return this.emailService.create(createEmailDto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateEmailDto: Partial<Email>,
  ): Promise<Email | null> {
    return this.emailService.update(id, updateEmailDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.emailService.remove(id);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Body('read') isRead: boolean): Promise<void> {
    await this.emailService.markAsRead(id, isRead);
  }

  @Patch(':id/star')
  async toggleStar(@Param('id') id: string): Promise<void> {
    await this.emailService.toggleStar(id);
  }
}
