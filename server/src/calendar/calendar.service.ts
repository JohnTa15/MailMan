import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createDAVClient, DAVCalendar } from 'tsdav';
import * as ical from 'node-ical';
import { Account } from '../database/entities/account.entity';
import { AccountService } from '../data/accounts/accounts.service';
import { decryptSecret } from '../crypto/secret-box';
import { MailCredentialsService, ReconnectNeededError } from '../oauth/mail-credentials.service';
import { googleCalendarApi, microsoftGraphApi } from '../oauth/providers';

export interface CalendarInfo {
  /** `<mailboxId>::<the provider's calendar id>` */
  id: string;
  mailboxId: string;
  mailbox: string;
  name: string;
  color: string;
  primary: boolean;
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  mailboxId: string;
  title: string;
  /** ISO date-time; for all-day events the date at 00:00 UTC */
  start: string;
  /** Exclusive end */
  end: string;
  allDay: boolean;
  location?: string;
  description?: string;
  organizer?: string;
  url?: string;
}

export interface CalendarProblem {
  mailboxId: string;
  mailbox: string;
  message: string;
  /** Signing in to the mailbox again fixes it */
  reconnect: boolean;
}

/** Where password mailboxes keep their calendars */
const CALDAV_DEFAULTS: Partial<Record<Account['type'], string>> = {
  icloud: 'https://caldav.icloud.com',
  yahoo: 'https://caldav.calendar.yahoo.com',
};

const PALETTE = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#0EA5E9', '#8B5CF6', '#EF4444', '#14B8A6'];

/** Outlook's named calendar colours */
const OUTLOOK_COLORS: Record<string, string> = {
  lightBlue: '#3B82F6',
  lightGreen: '#22C55E',
  lightOrange: '#F97316',
  lightGray: '#64748B',
  lightYellow: '#EAB308',
  lightTeal: '#14B8A6',
  lightPink: '#EC4899',
  lightBrown: '#A16207',
  lightRed: '#EF4444',
  maxColor: '#8B5CF6',
};

const MAX_RANGE_DAYS = 400;
const CALDAV_CACHE_MS = 10 * 60_000;

class CalendarApiError extends Error {}

const text = (v: unknown): string => {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && 'val' in (v as Record<string, unknown>)) return String((v as { val: unknown }).val ?? '');
  return String(v);
};

/** "2026-11-25" → "2026-11-25T00:00:00.000Z" */
const dateOnly = (d: string) => new Date(`${d}T00:00:00Z`).toISOString();

/**
 * Calendars of every connected mailbox, read-only: Google Calendar and
 * Outlook through their APIs with the mailbox's sign-in, iCloud and Yahoo
 * through CalDAV with the mailbox's app password.
 */
@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);
  private readonly davCache = new Map<string, { at: number; client: Awaited<ReturnType<typeof createDAVClient>>; calendars: DAVCalendar[] }>();

  constructor(
    private readonly accounts: AccountService,
    private readonly credentials: MailCredentialsService,
  ) {}

  async calendars(userId: string): Promise<{ calendars: CalendarInfo[]; problems: CalendarProblem[] }> {
    const mailboxes = (await this.accounts.findByUser(userId)).filter((m) => this.source(m));
    const results = await Promise.allSettled(mailboxes.map((m) => this.calendarsOf(m)));
    const calendars: CalendarInfo[] = [];
    const problems: CalendarProblem[] = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') calendars.push(...r.value);
      else problems.push(this.problem(mailboxes[i], r.reason));
    });
    calendars.forEach((c, i) => (c.color ||= PALETTE[i % PALETTE.length]));
    return { calendars, problems };
  }

  async events(
    userId: string,
    fromRaw: string | undefined,
    toRaw: string | undefined,
    ids?: string[],
  ): Promise<{ events: CalendarEvent[]; problems: CalendarProblem[] }> {
    const from = new Date(fromRaw || '');
    const to = new Date(toRaw || '');
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || to <= from) throw new BadRequestException('from and to must be dates, from before to');
    if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * 86_400_000) throw new BadRequestException(`At most ${MAX_RANGE_DAYS} days at a time`);

    const { calendars, problems } = await this.calendars(userId);
    const wanted = ids?.length ? calendars.filter((c) => ids.includes(c.id)) : calendars;
    const mailboxes = new Map((await this.accounts.findByUser(userId)).map((m) => [m.id, m]));
    const results = await Promise.allSettled(
      wanted.map((c) => this.eventsOf(mailboxes.get(c.mailboxId)!, c, from, to)),
    );
    const events: CalendarEvent[] = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') events.push(...r.value);
      else {
        const mailbox = mailboxes.get(wanted[i].mailboxId)!;
        if (!problems.some((p) => p.mailboxId === mailbox.id)) problems.push(this.problem(mailbox, r.reason));
      }
    });
    // Only what overlaps the range, whatever a server sends
    const inRange = events.filter((e) => new Date(e.end) > from && new Date(e.start) < to);
    inRange.sort((a, b) => a.start.localeCompare(b.start));
    return { events: inRange, problems };
  }

  /** How this mailbox's calendars are reached, if at all. */
  private source(m: Account): 'google' | 'graph' | 'caldav' | null {
    if (m.authType === 'oauth2') {
      if (m.parentId) return null; // a shared mailbox's calendar needs its own permission
      return m.type === 'gmail' ? 'google' : m.type === 'outlook' ? 'graph' : null;
    }
    return m.caldavUrl || CALDAV_DEFAULTS[m.type] ? 'caldav' : null;
  }

  private problem(m: Account, err: unknown): CalendarProblem {
    const message = err instanceof Error ? err.message : String(err);
    if (!(err instanceof ReconnectNeededError) && !(err instanceof CalendarApiError)) {
      this.logger.warn(`Calendar of ${m.email} failed: ${message}`);
    }
    return {
      mailboxId: m.id,
      mailbox: m.email,
      message: err instanceof ReconnectNeededError || err instanceof CalendarApiError ? message : `Could not read the calendar of ${m.email}`,
      reconnect: err instanceof ReconnectNeededError,
    };
  }

  private async calendarsOf(m: Account): Promise<CalendarInfo[]> {
    const info = (id: string, name: string, color: string, primary: boolean): CalendarInfo => ({
      id: `${m.id}::${id}`,
      mailboxId: m.id,
      mailbox: m.email,
      name,
      color,
      primary,
    });
    switch (this.source(m)) {
      case 'google': {
        const data = await this.google(m, '/users/me/calendarList?minAccessRole=reader&maxResults=100');
        return (data.items || [])
          .filter((c: { hidden?: boolean }) => !c.hidden)
          .map((c: { id: string; summary?: string; summaryOverride?: string; backgroundColor?: string; primary?: boolean }) =>
            info(c.id, c.summaryOverride || c.summary || c.id, c.backgroundColor || '', !!c.primary),
          );
      }
      case 'graph': {
        const data = await this.graph(m, '/me/calendars?$top=100&$select=id,name,hexColor,color,isDefaultCalendar');
        return (data.value || []).map((c: { id: string; name: string; hexColor?: string; color?: string; isDefaultCalendar?: boolean }) =>
          info(c.id, c.name, c.hexColor || OUTLOOK_COLORS[c.color || ''] || '', !!c.isDefaultCalendar),
        );
      }
      case 'caldav': {
        const { calendars } = await this.dav(m);
        return calendars.map((c, i) =>
          info(c.url, text(c.displayName) || 'Calendar', this.davColor(c.calendarColor), i === 0),
        );
      }
      default:
        return [];
    }
  }

  private async eventsOf(m: Account, cal: CalendarInfo, from: Date, to: Date): Promise<CalendarEvent[]> {
    const remoteId = cal.id.slice(m.id.length + 2);
    const base = { calendarId: cal.id, mailboxId: m.id };
    switch (this.source(m)) {
      case 'google': {
        const events: CalendarEvent[] = [];
        let page: string | undefined;
        for (let i = 0; i < 5; i++) {
          const q = new URLSearchParams({
            timeMin: from.toISOString(),
            timeMax: to.toISOString(),
            singleEvents: 'true',
            orderBy: 'startTime',
            maxResults: '250',
            ...(page ? { pageToken: page } : {}),
          });
          const data = await this.google(m, `/calendars/${encodeURIComponent(remoteId)}/events?${q}`);
          for (const e of data.items || []) {
            if (e.status === 'cancelled' || !e.start) continue;
            const allDay = !!e.start.date;
            events.push({
              ...base,
              id: `${cal.id}::${e.id}`,
              title: e.summary || '(No title)',
              start: allDay ? dateOnly(e.start.date) : new Date(e.start.dateTime).toISOString(),
              end: allDay ? dateOnly(e.end?.date || e.start.date) : new Date(e.end?.dateTime || e.start.dateTime).toISOString(),
              allDay,
              location: e.location || undefined,
              description: e.description || undefined,
              organizer: e.organizer?.displayName || e.organizer?.email || undefined,
              url: e.htmlLink || undefined,
            });
          }
          page = data.nextPageToken;
          if (!page) break;
        }
        return events;
      }
      case 'graph': {
        const events: CalendarEvent[] = [];
        const q = new URLSearchParams({
          startDateTime: from.toISOString(),
          endDateTime: to.toISOString(),
          $top: '250',
          $select: 'id,subject,start,end,isAllDay,isCancelled,location,bodyPreview,webLink,organizer',
        });
        let path: string | undefined = `/me/calendars/${encodeURIComponent(remoteId)}/calendarView?${q}`;
        for (let i = 0; i < 5 && path; i++) {
          const data = await this.graph(m, path);
          for (const e of data.value || []) {
            if (e.isCancelled) continue;
            // Times come back in UTC (Prefer header), without the Z
            const iso = (t: { dateTime: string }) => new Date(`${t.dateTime.replace(/Z$/, '')}Z`).toISOString();
            events.push({
              ...base,
              id: `${cal.id}::${e.id}`,
              title: e.subject || '(No title)',
              start: iso(e.start),
              end: iso(e.end),
              allDay: !!e.isAllDay,
              location: e.location?.displayName || undefined,
              description: e.bodyPreview || undefined,
              organizer: e.organizer?.emailAddress?.name || e.organizer?.emailAddress?.address || undefined,
              url: e.webLink || undefined,
            });
          }
          const next: string | undefined = data['@odata.nextLink'];
          path = next ? next.slice(microsoftGraphApi().length) : undefined;
        }
        return events;
      }
      case 'caldav': {
        const { client, calendars } = await this.dav(m);
        const calendar = calendars.find((c) => c.url === remoteId);
        if (!calendar) return [];
        const objects = await client.fetchCalendarObjects({
          calendar,
          timeRange: { start: from.toISOString(), end: to.toISOString() },
        });
        const events: CalendarEvent[] = [];
        for (const object of objects) {
          if (!object.data) continue;
          let parsed: ical.CalendarResponse;
          try {
            parsed = ical.sync.parseICS(object.data);
          } catch {
            continue;
          }
          for (const component of Object.values(parsed)) {
            if (!component || component.type !== 'VEVENT') continue;
            const vevent = component as ical.VEvent;
            // A RECURRENCE-ID override is applied through its base event
            if (vevent.recurrenceid) continue;
            for (const inst of ical.expandRecurringEvent(vevent, { from, to, expandOngoing: true })) {
              const start = new Date(inst.start);
              const end = inst.end ? new Date(inst.end) : start;
              const ev = inst.event;
              const allDay = inst.isFullDay;
              events.push({
                ...base,
                id: `${cal.id}::${vevent.uid}::${start.toISOString()}`,
                title: text(inst.summary) || '(No title)',
                // node-ical builds full-day dates in local time; keep the calendar date
                start: allDay ? dateOnly(this.localDate(start)) : start.toISOString(),
                end: allDay ? dateOnly(this.localDate(end)) : end.toISOString(),
                allDay,
                location: text(ev.location) || undefined,
                description: text(ev.description) || undefined,
                organizer: text((ev.organizer as { params?: { CN?: string } } | undefined)?.params?.CN) || undefined,
              });
            }
          }
        }
        return events;
      }
      default:
        return [];
    }
  }

  private localDate(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private davColor(color: unknown): string {
    const c = text(color);
    // CalDAV colours are often #RRGGBBAA
    return /^#[0-9a-f]{6}/i.test(c) ? c.slice(0, 7) : '';
  }

  private async dav(m: Account) {
    const cached = this.davCache.get(m.id);
    if (cached && Date.now() - cached.at < CALDAV_CACHE_MS) return cached;
    const serverUrl = m.caldavUrl || CALDAV_DEFAULTS[m.type]!;
    let client;
    try {
      client = await createDAVClient({
        serverUrl,
        credentials: { username: m.email, password: decryptSecret(m.encryptedPassword) },
        authMethod: 'Basic',
        defaultAccountType: 'caldav',
      });
    } catch (err) {
      if (/401|unauthori[sz]ed/i.test(String(err))) {
        throw new CalendarApiError(`${m.email}: the calendar server refused the app password`);
      }
      throw err;
    }
    const calendars = (await client.fetchCalendars()).filter(
      (c) => !c.components || c.components.includes('VEVENT'),
    );
    const entry = { at: Date.now(), client, calendars };
    this.davCache.set(m.id, entry);
    return entry;
  }

  private async google(m: Account, path: string) {
    const token = await this.credentials.accessToken(m);
    const res = await fetch(`${googleCalendarApi()}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, any>;
    if (res.ok) return data;
    const reason = JSON.stringify(data.error || data);
    if (/accessNotConfigured|SERVICE_DISABLED|has not been used/i.test(reason)) {
      throw new CalendarApiError('The server admin needs to enable the Google Calendar API in Google Cloud');
    }
    if (res.status === 401 || res.status === 403) {
      throw new ReconnectNeededError(`Reconnect ${m.email} to allow calendar access`);
    }
    throw new Error(`Google Calendar: HTTP ${res.status} ${reason.slice(0, 200)}`);
  }

  private async graph(m: Account, path: string) {
    const token = await this.credentials.graphToken(m);
    const res = await fetch(`${microsoftGraphApi()}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', Prefer: 'outlook.timezone="UTC"' },
      signal: AbortSignal.timeout(20_000),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, any>;
    if (res.ok) return data;
    if (res.status === 401 || res.status === 403) {
      throw new ReconnectNeededError(`Reconnect ${m.email} to allow calendar access`);
    }
    throw new Error(`Microsoft Graph: HTTP ${res.status} ${JSON.stringify(data.error || data).slice(0, 200)}`);
  }
}
