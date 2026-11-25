import { Email, Mailbox, User, CalendarEvent, CalendarInfo } from '../types';

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

export const DEMO_USER: User = {
  id: 'demo-user',
  email: 'you@mailman.app',
  displayName: 'Alex Morgan',
  role: 'admin',
  hasPassword: true,
  google: false,
  microsoft: false,
};

export const DEMO_MAILBOX: Mailbox = {
  id: 'demo',
  email: 'you@mailman.app',
  displayName: 'Alex Morgan',
  type: 'imap',
  authType: 'password',
  connected: true,
};

type Seed = Omit<Email, 'accountId' | 'to' | 'labels' | 'attachments' | 'isImportant' | 'folder'> &
  Partial<Pick<Email, 'labels' | 'attachments' | 'isImportant' | 'folder' | 'to'>>;

const seeds: Seed[] = [
  {
    id: 'd1',
    subject: 'Welcome to Mailman ✨',
    from: 'hello@mailman.app',
    fromName: 'Mailman',
    date: ago(4),
    preview: 'Your inbox, beautifully simple. Here are a few tips to get the most out of Mailman.',
    body: '',
    html: `<h2 style="margin:0 0 12px">Your inbox, beautifully simple.</h2>
<p>Thanks for trying Mailman! A few things to try:</p>
<ul>
  <li>Hover a message to <b>archive</b>, <b>delete</b> or mark it read.</li>
  <li>Tap the ⭐ to keep important threads close.</li>
  <li>Toggle <b>dark mode</b> from the sidebar.</li>
  <li>Press <kbd>C</kbd> to compose and <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to send.</li>
</ul>
<p>Happy mailing,<br/>The Mailman team</p>`,
    isRead: false,
    isStarred: true,
    isImportant: true,
    labels: ['welcome'],
  },
  {
    id: 'd2',
    subject: 'Design review moved to Thursday',
    from: 'priya@studio.design',
    fromName: 'Priya Shah',
    date: ago(38),
    preview: 'Hey! Quick heads-up — we pushed the design review to Thursday at 2pm so the team can finish the prototype.',
    body: '',
    html: `<p>Hey!</p><p>Quick heads-up — we pushed the design review to <b>Thursday at 2pm</b> so the team can finish the prototype. I attached the latest deck.</p><p>Let me know if that time doesn't work.</p><p>— Priya</p>`,
    isRead: false,
    isStarred: false,
    isImportant: true,
    labels: ['work'],
    attachments: [{ id: 'a1', name: 'Prototype-v3.pdf', size: 2_480_000, mimeType: 'application/pdf' }],
  },
  {
    id: 'd3',
    subject: 'Your order has shipped 📦',
    from: 'orders@northwind.shop',
    fromName: 'Northwind',
    date: ago(160),
    preview: 'Good news! Your order #48213 is on its way and should arrive by Friday.',
    body: '',
    html: `<p>Good news! Your order <b>#48213</b> is on its way and should arrive by <b>Friday</b>.</p><p><a href="https://example.com/track">Track your package</a></p>`,
    isRead: true,
    isStarred: false,
    labels: ['shopping'],
  },
  {
    id: 'd4',
    subject: 'Weekend hike? 🏔️',
    from: 'sam@example.com',
    fromName: 'Sam Rivera',
    date: ago(60 * 7),
    preview: 'Weather looks perfect for Saturday. Thinking the ridge trail, leaving around 8. You in?',
    body: '',
    html: `<p>Weather looks perfect for Saturday. Thinking the ridge trail, leaving around 8.</p><p>You in?</p>`,
    isRead: false,
    isStarred: false,
    labels: ['personal'],
  },
  {
    id: 'd5',
    subject: 'Q3 metrics are in',
    from: 'analytics@company.io',
    fromName: 'Company Analytics',
    date: ago(60 * 26),
    preview: 'Active users grew 18% quarter over quarter. Full dashboard inside.',
    body: '',
    html: `<p>Active users grew <b>18%</b> quarter over quarter, with retention up 4 points.</p><p>The full dashboard is available in the analytics portal.</p>`,
    isRead: true,
    isStarred: true,
    labels: ['work'],
  },
  {
    id: 'd6',
    subject: 'This week in open source',
    from: 'digest@devweekly.dev',
    fromName: 'Dev Weekly',
    date: ago(60 * 50),
    preview: 'New releases, a deep dive on IMAP IDLE, and the best talks from this month’s conferences.',
    body: '',
    html: `<p>New releases, a deep dive on IMAP IDLE, and the best talks from this month’s conferences.</p>`,
    isRead: true,
    isStarred: false,
    labels: ['newsletter'],
  },
  {
    id: 'd7',
    subject: 'Re: Apartment viewing',
    from: 'you@mailman.app',
    fromName: 'Alex Morgan',
    to: 'lee@homes.example',
    date: ago(60 * 30),
    preview: 'Saturday at 11 works great for me, see you there!',
    body: 'Saturday at 11 works great for me, see you there!',
    isRead: true,
    isStarred: false,
    folder: 'sent',
  },
  {
    id: 'd8',
    subject: 'Trip itinerary — Lisbon',
    from: 'trips@travelbuddy.example',
    fromName: 'TravelBuddy',
    date: ago(60 * 24 * 9),
    preview: 'Your flights and hotel for Lisbon are confirmed. Boa viagem!',
    body: '',
    html: `<p>Your flights and hotel for Lisbon are confirmed. <i>Boa viagem!</i></p>`,
    isRead: true,
    isStarred: false,
    labels: ['travel'],
    folder: 'archive',
  },
];

export const DEMO_EMAILS: Email[] = seeds.map((s) => ({
  accountId: DEMO_MAILBOX.id,
  to: DEMO_MAILBOX.email,
  labels: [],
  attachments: [],
  isImportant: false,
  folder: 'inbox',
  ...s,
}));

/** Demo calendars around today, so the calendar view has something to show. */
export function demoCalendar(): { calendars: CalendarInfo[]; events: CalendarEvent[] } {
  const calendars: CalendarInfo[] = [
    { id: 'demo::work', mailboxId: DEMO_MAILBOX.id, mailbox: DEMO_MAILBOX.email, name: 'Work', color: '#6366F1', primary: true },
    { id: 'demo::home', mailboxId: DEMO_MAILBOX.id, mailbox: DEMO_MAILBOX.email, name: 'Personal', color: '#EC4899', primary: false },
  ];
  const day = (offset: number, hour: number, minute = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };
  const allDay = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T00:00:00.000Z`;
  };
  const e = (id: string, calendarId: string, title: string, start: string, end: string, extra: Partial<CalendarEvent> = {}): CalendarEvent => ({
    id,
    calendarId,
    mailboxId: DEMO_MAILBOX.id,
    title,
    start,
    end,
    allDay: false,
    ...extra,
  });
  const events: CalendarEvent[] = [
    e('d1', 'demo::work', 'Design review', day(0, 10), day(0, 11), { location: 'Room Aegean', organizer: 'Maria' }),
    e('d2', 'demo::work', 'Weekly sync', day(1, 9, 30), day(1, 10)),
    e('d3', 'demo::home', 'Gym', day(1, 19), day(1, 20)),
    e('d4', 'demo::work', 'Launch day', allDay(3), allDay(4), { allDay: true }),
    e('d5', 'demo::home', 'Dinner with Nikos', day(4, 21), day(4, 23), { location: 'Psiri' }),
    e('d6', 'demo::work', 'Quarterly planning', day(7, 14), day(7, 16)),
    e('d7', 'demo::home', 'Dentist', day(-2, 17), day(-2, 18)),
    e('d8', 'demo::work', 'Conference', allDay(10), allDay(13), { allDay: true, location: 'Thessaloniki' }),
  ];
  return { calendars, events };
}
