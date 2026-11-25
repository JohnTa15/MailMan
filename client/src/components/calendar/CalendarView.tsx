import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { AlertTriangle, ChevronLeft, ChevronRight, ExternalLink, MapPin, Menu, RefreshCw, User as UserIcon, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAppStore } from '../../store/appStore';
import { calendarService } from '../../services/calendarService';
import { apiErrorMessage } from '../../lib/api';
import { demoCalendar } from '../../data/mockData';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { CalendarEvent, CalendarInfo, CalendarProblem } from '../../types';
import { cn } from '../../lib/cn';
import { Button, IconButton } from '../ui/Button';

type Mode = 'month' | 'agenda';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_IN_CELL = 3;

/** All-day events carry their calendar date at 00:00 UTC: read it as a local date. */
function eventStart(e: CalendarEvent): Date {
  return e.allDay ? new Date(`${e.start.slice(0, 10)}T00:00:00`) : new Date(e.start);
}
function eventEnd(e: CalendarEvent): Date {
  return e.allDay ? new Date(`${e.end.slice(0, 10)}T00:00:00`) : new Date(e.end);
}

/** Every day an event touches (end is exclusive). */
function daysOf(e: CalendarEvent): Date[] {
  const start = startOfDay(eventStart(e));
  const end = eventEnd(e);
  const last = e.allDay || end.getTime() === startOfDay(end).getTime() ? addDays(startOfDay(end), -1) : startOfDay(end);
  const days: Date[] = [];
  for (let d = start; d <= last && days.length < 60; d = addDays(d, 1)) days.push(d);
  return days.length ? days : [start];
}

const timeLabel = (e: CalendarEvent) => (e.allDay ? 'All day' : format(eventStart(e), 'HH:mm'));

/** Events of every connected calendar: a month grid on large screens, a day-by-day agenda on phones. */
export const CalendarView: FC = () => {
  const isDemo = useAppStore((s) => s.isDemo);
  const hidden = useAppStore((s) => s.hiddenCalendars);
  const toggleCalendar = useAppStore((s) => s.toggleCalendar);
  const setMobileNavOpen = useAppStore((s) => s.setMobileNavOpen);
  const openSettings = useAppStore((s) => s.openSettings);
  const isWide = useMediaQuery('(min-width: 1024px)');
  const [mode, setMode] = useState<Mode>(isWide ? 'month' : 'agenda');
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [calendars, setCalendars] = useState<CalendarInfo[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [problems, setProblems] = useState<CalendarProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState<CalendarEvent | null>(null);
  const [openDay, setOpenDay] = useState<Date | null>(null);

  // The six weeks the month grid shows, Monday first
  const gridStart = useMemo(() => startOfWeek(month, { weekStartsOn: 1 }), [month]);
  const days = useMemo(() => Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)), [gridStart]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (isDemo) {
        const demo = demoCalendar();
        setCalendars(demo.calendars);
        setEvents(demo.events);
        setProblems([]);
        return;
      }
      const [list, range] = await Promise.all([calendarService.calendars(), calendarService.events(gridStart, addDays(gridStart, 42))]);
      setCalendars(list.calendars);
      setEvents(range.events);
      setProblems([...list.problems, ...range.problems.filter((p) => !list.problems.some((q) => q.mailboxId === p.mailboxId))]);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not load your calendars'));
    } finally {
      setLoading(false);
    }
  }, [isDemo, gridStart]);

  useEffect(() => {
    void load();
  }, [load]);

  const colorOf = useMemo(() => new Map(calendars.map((c) => [c.id, c.color])), [calendars]);
  const nameOf = useMemo(() => new Map(calendars.map((c) => [c.id, c.name])), [calendars]);
  const visible = useMemo(() => events.filter((e) => !hidden.includes(e.calendarId)), [events, hidden]);

  // Events per day (yyyy-MM-dd), all-day first, then by time
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of visible) {
      for (const d of daysOf(e)) {
        const key = format(d, 'yyyy-MM-dd');
        map.set(key, [...(map.get(key) || []), e]);
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) => Number(b.allDay) - Number(a.allDay) || eventStart(a).getTime() - eventStart(b).getTime());
    }
    return map;
  }, [visible]);
  const eventsOn = (d: Date) => byDay.get(format(d, 'yyyy-MM-dd')) || [];

  const agendaDays = useMemo(() => {
    // This month: from today on; past days are in the month grid
    const first = isSameMonth(month, new Date()) ? startOfDay(new Date()) : month;
    const count = differenceInCalendarDays(endOfMonth(month), first) + 1;
    return Array.from({ length: count }, (_, i) => addDays(first, i)).filter((d) => eventsOn(d).length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, byDay]);

  // Calendars grouped by the mailbox they belong to
  const groups = useMemo(() => {
    const map = new Map<string, CalendarInfo[]>();
    for (const c of calendars) map.set(c.mailbox, [...(map.get(c.mailbox) || []), c]);
    return [...map.entries()];
  }, [calendars]);

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col" aria-label="Calendar">
      <header className="flex flex-wrap items-center gap-2 border-b border-ink-200/70 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] dark:border-white/5">
        <IconButton label="Open menu" className="-ml-1 lg:hidden" onClick={() => setMobileNavOpen(true)}>
          <Menu className="h-5 w-5" />
        </IconButton>
        <h1 className="mr-auto min-w-0 text-2xl font-bold tracking-tight">{format(month, 'MMMM yyyy')}</h1>
        <div className="flex items-center gap-1">
          <IconButton label="Previous month" onClick={() => setMonth(addMonths(month, -1))}>
            <ChevronLeft className="h-5 w-5" />
          </IconButton>
          <Button size="sm" variant="secondary" onClick={() => setMonth(startOfMonth(new Date()))}>
            Today
          </Button>
          <IconButton label="Next month" onClick={() => setMonth(addMonths(month, 1))}>
            <ChevronRight className="h-5 w-5" />
          </IconButton>
        </div>
        <div className="flex rounded-xl bg-ink-100 p-1 dark:bg-white/5" role="group" aria-label="View">
          {(['month', 'agenda'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                mode === m ? 'bg-white text-ink-900 shadow-sm dark:bg-white/15 dark:text-white' : 'text-ink-500 hover:text-ink-800 dark:text-ink-400'
              )}
            >
              {m}
            </button>
          ))}
        </div>
        <IconButton label="Refresh calendars" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn('h-[18px] w-[18px]', loading && 'animate-spin')} />
        </IconButton>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Calendars */}
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-ink-200/70 p-4 dark:border-white/5 lg:block">
          <CalendarList groups={groups} hidden={hidden} onToggle={toggleCalendar} />
          <Problems problems={problems} onFix={() => openSettings('mailboxes')} />
        </aside>

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          {/* Phones: calendars as chips above the agenda */}
          <div className="space-y-3 p-4 pb-0 lg:hidden">
            {calendars.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {calendars.map((c) => {
                  const on = !hidden.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleCalendar(c.id)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-opacity',
                        on ? 'ring-ink-200 dark:ring-white/15' : 'opacity-50 ring-ink-200/60 dark:ring-white/10'
                      )}
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                      {c.name}
                    </button>
                  );
                })}
              </div>
            )}
            <Problems problems={problems} onFix={() => openSettings('mailboxes')} />
          </div>

          {!loading && calendars.length === 0 ? (
            <NoCalendars onAdd={() => openSettings('mailboxes')} />
          ) : mode === 'month' ? (
            <div className="p-4">
              <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl bg-ink-200/70 ring-1 ring-ink-200/70 dark:bg-white/5 dark:ring-white/5">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="bg-ink-50 px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-ink-500 dark:bg-ink-900 dark:text-ink-400">
                    {d}
                  </div>
                ))}
                {days.map((d) => {
                  const list = eventsOn(d);
                  const inMonth = isSameMonth(d, month);
                  return (
                    <div
                      key={d.toISOString()}
                      className={cn(
                        'flex min-h-[7.5rem] flex-col gap-1 bg-white p-1.5 dark:bg-ink-900/80',
                        !inMonth && 'bg-ink-50/80 dark:bg-ink-950/60'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenDay(d)}
                        aria-label={format(d, 'EEEE d MMMM')}
                        className={cn(
                          'flex h-7 w-7 items-center justify-center self-end rounded-full text-xs font-semibold transition-colors hover:bg-ink-100 dark:hover:bg-white/10',
                          isToday(d) ? 'bg-primary-600 text-white hover:bg-primary-600 dark:hover:bg-primary-600' : inMonth ? 'text-ink-800 dark:text-ink-100' : 'text-ink-400'
                        )}
                      >
                        {format(d, 'd')}
                      </button>
                      {list.slice(0, MAX_IN_CELL).map((e) => (
                        <EventChip key={`${e.id}-${d.getDate()}`} event={e} color={colorOf.get(e.calendarId)} onOpen={setOpened} />
                      ))}
                      {list.length > MAX_IN_CELL && (
                        <button
                          type="button"
                          onClick={() => setOpenDay(d)}
                          className="rounded-md px-1.5 text-left text-[11px] font-semibold text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-white/10"
                        >
                          +{list.length - MAX_IN_CELL} more
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-2xl space-y-6 p-4">
              {loading && agendaDays.length === 0 &&
                Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-16 w-full rounded-2xl" />)}
              {!loading && agendaDays.length === 0 && (
                <p className="py-16 text-center text-sm text-ink-500 dark:text-ink-400">Nothing on the calendar in {format(month, 'MMMM')}.</p>
              )}
              {agendaDays.map((d) => (
                <div key={d.toISOString()}>
                  <p className={cn('mb-2 text-sm font-semibold', isToday(d) ? 'text-primary-600 dark:text-primary-300' : 'text-ink-500 dark:text-ink-400')}>
                    {isToday(d) ? 'Today · ' : ''}
                    {format(d, 'EEEE d MMMM')}
                  </p>
                  <div className="space-y-2">
                    {eventsOn(d).map((e) => (
                      <EventRow key={e.id} event={e} color={colorOf.get(e.calendarId)} calendar={nameOf.get(e.calendarId)} onOpen={setOpened} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {openDay && (
          <Sheet key="day" title={format(openDay, 'EEEE d MMMM')} onClose={() => setOpenDay(null)}>
            {eventsOn(openDay).length === 0 ? (
              <p className="text-sm text-ink-500">Nothing on this day.</p>
            ) : (
              <div className="space-y-2">
                {eventsOn(openDay).map((e) => (
                  <EventRow
                    key={e.id}
                    event={e}
                    color={colorOf.get(e.calendarId)}
                    calendar={nameOf.get(e.calendarId)}
                    onOpen={(ev) => {
                      setOpenDay(null);
                      setOpened(ev);
                    }}
                  />
                ))}
              </div>
            )}
          </Sheet>
        )}
        {opened && (
          <Sheet key="event" title={opened.title} onClose={() => setOpened(null)} color={colorOf.get(opened.calendarId)}>
            <EventDetails event={opened} calendar={nameOf.get(opened.calendarId)} mailbox={calendars.find((c) => c.id === opened.calendarId)?.mailbox} />
          </Sheet>
        )}
      </AnimatePresence>
    </section>
  );
};

const CalendarList: FC<{ groups: [string, CalendarInfo[]][]; hidden: string[]; onToggle: (id: string) => void }> = ({ groups, hidden, onToggle }) => (
  <div className="space-y-5">
    {groups.map(([mailbox, list]) => (
      <div key={mailbox}>
        <p className="mb-1.5 truncate px-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400" title={mailbox}>
          {mailbox}
        </p>
        {list.map((c) => {
          const on = !hidden.includes(c.id);
          return (
            <label key={c.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm hover:bg-ink-100 dark:hover:bg-white/5">
              <input type="checkbox" checked={on} onChange={() => onToggle(c.id)} className="peer sr-only" />
              <span
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-400"
                style={{ borderColor: c.color, background: on ? c.color : 'transparent' }}
                aria-hidden="true"
              >
                {on && (
                  <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="#fff" strokeWidth="2">
                    <path d="M2.5 6.5l2.5 2.5 4.5-5" />
                  </svg>
                )}
              </span>
              <span className={cn('truncate', !on && 'text-ink-400')}>{c.name}</span>
            </label>
          );
        })}
      </div>
    ))}
  </div>
);

const Problems: FC<{ problems: CalendarProblem[]; onFix: () => void }> = ({ problems, onFix }) =>
  problems.length ? (
    <div className="mt-5 space-y-2 lg:mt-6">
      {problems.map((p) => (
        <div key={p.mailboxId} className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div className="min-w-0">
            <p className="break-words">{p.message}</p>
            {p.reconnect && (
              <button type="button" onClick={onFix} className="mt-1 font-semibold underline">
                Reconnect in Settings
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  ) : null;

const NoCalendars: FC<{ onAdd: () => void }> = ({ onAdd }) => (
  <div className="flex flex-col items-center px-8 pt-20 text-center">
    <p className="text-lg font-semibold">No calendars yet</p>
    <p className="mt-1 max-w-sm text-sm text-ink-500 dark:text-ink-400">
      Calendars come with your mailboxes: Google and Microsoft accounts connected with their sign-in, and iCloud or Yahoo with an app
      password.
    </p>
    <Button className="mt-5" onClick={onAdd}>
      Connect a mailbox
    </Button>
  </div>
);

const EventChip: FC<{ event: CalendarEvent; color?: string; onOpen: (e: CalendarEvent) => void }> = ({ event, color = '#6366F1', onOpen }) => (
  <button
    type="button"
    onClick={() => onOpen(event)}
    className="flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left text-[11px] leading-tight hover:bg-ink-100 dark:hover:bg-white/10"
    style={event.allDay ? { background: `${color}26` } : undefined}
    title={`${timeLabel(event)} ${event.title}`}
  >
    {!event.allDay && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />}
    {!event.allDay && <span className="shrink-0 tabular-nums text-ink-500 dark:text-ink-400">{format(eventStart(event), 'HH:mm')}</span>}
    <span className="truncate font-medium text-ink-800 dark:text-ink-100">{event.title}</span>
  </button>
);

const EventRow: FC<{ event: CalendarEvent; color?: string; calendar?: string; onOpen: (e: CalendarEvent) => void }> = ({
  event,
  color = '#6366F1',
  calendar,
  onOpen,
}) => (
  <motion.button
    type="button"
    onClick={() => onOpen(event)}
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex w-full items-stretch gap-3 rounded-2xl bg-white p-3 text-left shadow-card ring-1 ring-ink-200/70 transition-colors hover:ring-primary-300 dark:bg-ink-800/60 dark:shadow-none dark:ring-white/10"
  >
    <span className="w-1 shrink-0 rounded-full" style={{ background: color }} />
    <span className="w-14 shrink-0 text-sm tabular-nums text-ink-500 dark:text-ink-400">
      {timeLabel(event)}
      {!event.allDay && <span className="block text-xs">{format(eventEnd(event), 'HH:mm')}</span>}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate font-semibold">{event.title}</span>
      <span className="block truncate text-xs text-ink-500 dark:text-ink-400">
        {[event.location, calendar].filter(Boolean).join(' · ')}
      </span>
    </span>
  </motion.button>
);

const EventDetails: FC<{ event: CalendarEvent; calendar?: string; mailbox?: string }> = ({ event, calendar, mailbox }) => {
  const start = eventStart(event);
  const end = eventEnd(event);
  const when = event.allDay
    ? differenceInCalendarDays(end, start) > 1
      ? `${format(start, 'EEE d MMM')} – ${format(addDays(end, -1), 'EEE d MMM yyyy')} · all day`
      : `${format(start, 'EEEE d MMMM yyyy')} · all day`
    : isSameDay(start, end)
      ? `${format(start, 'EEEE d MMMM yyyy')} · ${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`
      : `${format(start, 'EEE d MMM HH:mm')} – ${format(end, 'EEE d MMM HH:mm')}`;
  return (
    <div className="space-y-3 text-sm">
      <p className="font-medium">{when}</p>
      {event.location && (
        <p className="flex items-start gap-2 text-ink-600 dark:text-ink-300">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          {event.location}
        </p>
      )}
      {event.organizer && (
        <p className="flex items-start gap-2 text-ink-600 dark:text-ink-300">
          <UserIcon className="mt-0.5 h-4 w-4 shrink-0" />
          {event.organizer}
        </p>
      )}
      {event.description && (
        <p className="max-h-48 overflow-y-auto whitespace-pre-line rounded-xl bg-ink-50 p-3 text-ink-700 dark:bg-white/5 dark:text-ink-300">
          {event.description}
        </p>
      )}
      <p className="text-xs text-ink-500 dark:text-ink-400">{[calendar, mailbox].filter(Boolean).join(' · ')}</p>
      {event.url && /^https:\/\//.test(event.url) && (
        <a
          href={event.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-medium text-primary-600 hover:underline dark:text-primary-300"
        >
          Open in {event.url.includes('google.') ? 'Google Calendar' : 'Outlook'}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
};

const Sheet: FC<{ title: string; color?: string; onClose: () => void; children: React.ReactNode }> = ({ title, color, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-ink-950/30 backdrop-blur-[2px]" />
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 30, scale: 0.97, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-float ring-1 ring-ink-200/70 dark:bg-ink-900 dark:ring-white/10 sm:max-w-md sm:rounded-3xl"
    >
      <div className="mb-4 flex items-start gap-3">
        {color && <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full" style={{ background: color }} />}
        <h2 className="min-w-0 flex-1 break-words text-lg font-semibold">{title}</h2>
        <IconButton label="Close" onClick={onClose} className="-mr-2 -mt-1">
          <X className="h-5 w-5" />
        </IconButton>
      </div>
      {children}
    </motion.div>
  </div>
);
