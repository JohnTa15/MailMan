import { Account, Email } from '../types';

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

export const DEMO_ACCOUNT: Account = {
  id: 'demo',
  email: 'you@mailman.app',
  displayName: 'Alex Morgan',
  type: 'imap',
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
  accountId: DEMO_ACCOUNT.id,
  to: DEMO_ACCOUNT.email,
  labels: [],
  attachments: [],
  isImportant: false,
  folder: 'inbox',
  ...s,
}));
