import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CalendarService } from './calendar.service';

@Controller('calendars')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  /** Every calendar of the user's mailboxes, plus mailboxes whose calendar can't be read */
  @Get()
  list(@CurrentUser() userId: string) {
    return this.calendar.calendars(userId);
  }

  /** Events between `from` and `to` (ISO dates), optionally only `ids` (comma separated) */
  @Get('events')
  events(@CurrentUser() userId: string, @Query('from') from?: string, @Query('to') to?: string, @Query('ids') ids?: string) {
    return this.calendar.events(userId, from, to, ids ? ids.split(',').filter(Boolean) : undefined);
  }
}
