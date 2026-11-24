import { FC, FormEvent, useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Check, Copy, KeyRound, LogOut, Mail, Plug, Plus, Send, Trash2, User as UserIcon, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { SettingsTab, useAppStore } from '../../store/appStore';
import { authService, inviteService, mailboxService } from '../../services/authService';
import { apiErrorMessage, serverOrigin } from '../../lib/api';
import { Invite, Mailbox } from '../../types';
import { cn } from '../../lib/cn';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button, IconButton } from '../ui/Button';
import { Input } from '../ui/Input';
import { AddMailbox } from '../mailboxes/AddMailbox';
import { GoogleLogo, MailboxTypeLogo, MicrosoftLogo } from '../mailboxes/ProviderLogos';
import { Section } from './shared';
import { IntegrationsTab } from './IntegrationsTab';
import { AiTab } from './AiTab';

const TABS: { id: SettingsTab; label: string; icon: typeof UserIcon; adminOnly?: boolean }[] = [
  { id: 'account', label: 'Account', icon: UserIcon },
  { id: 'mailboxes', label: 'Mailboxes', icon: Mail },
  { id: 'ai', label: 'AI access', icon: Bot },
  { id: 'invites', label: 'Invites', icon: Send, adminOnly: true },
  { id: 'integrations', label: 'Integrations', icon: Plug, adminOnly: true },
];

/** "Synced 2 min ago", or that older mail is still on its way. */
function syncStatus(m: Mailbox): string {
  if (!m.lastSyncAt) return 'Waiting for first sync';
  const minutes = Math.round((Date.now() - new Date(m.lastSyncAt).getTime()) / 60000);
  const when = minutes < 1 ? 'just now' : minutes < 60 ? `${minutes} min ago` : new Date(m.lastSyncAt).toLocaleString();
  return m.syncComplete === false ? `Downloading older mail (synced ${when})` : `Synced ${when}`;
}

export const SettingsModal: FC<{ tab: SettingsTab }> = ({ tab }) => {
  const user = useAppStore((s) => s.user);
  const openSettings = useAppStore((s) => s.openSettings);
  const closeSettings = useAppStore((s) => s.closeSettings);
  const tabs = TABS.filter((t) => !t.adminOnly || user?.role === 'admin');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" onKeyDown={(e) => e.key === 'Escape' && closeSettings()}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeSettings} className="absolute inset-0 bg-ink-950/30 backdrop-blur-[2px]" />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97, transition: { duration: 0.18 } }}
        transition={{ type: 'spring', stiffness: 360, damping: 32 }}
        className="relative flex h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-ink-50 shadow-float ring-1 ring-ink-200/70 dark:bg-ink-900 dark:ring-white/10 sm:h-[min(680px,88vh)] sm:max-w-3xl sm:flex-row sm:rounded-3xl"
      >
        <nav className="flex shrink-0 gap-1 border-b border-ink-200/70 p-3 dark:border-white/10 sm:w-52 sm:flex-col sm:border-b-0 sm:border-r sm:p-4">
          <p className="hidden px-3 pb-3 pt-1 text-lg font-bold sm:block">Settings</p>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => openSettings(id)}
              className={cn(
                'relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                tab === id ? 'text-primary-700 dark:text-white' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-white/5'
              )}
            >
              {tab === id && (
                <motion.span layoutId="settings-tab" className="absolute inset-0 rounded-xl bg-white shadow-card ring-1 ring-ink-200/70 dark:bg-white/10 dark:shadow-none dark:ring-white/10" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
              )}
              <Icon className="relative h-4 w-4" />
              <span className="relative">{label}</span>
            </button>
          ))}
          <IconButton label="Close settings" onClick={closeSettings} className="ml-auto sm:hidden">
            <X className="h-5 w-5" />
          </IconButton>
        </nav>
        <div className="relative min-h-0 flex-1 overflow-y-auto p-5 sm:p-8">
          <IconButton label="Close settings" onClick={closeSettings} className="absolute right-4 top-4 hidden sm:inline-flex">
            <X className="h-5 w-5" />
          </IconButton>
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.16 }}>
              {tab === 'account' && <AccountTab />}
              {tab === 'mailboxes' && <MailboxesTab />}
              {tab === 'ai' && <AiTab />}
              {tab === 'invites' && user?.role === 'admin' && <InvitesTab />}
              {tab === 'integrations' && user?.role === 'admin' && <IntegrationsTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};


const AccountTab: FC = () => {
  const user = useAppStore((s) => s.user);
  const isDemo = useAppStore((s) => s.isDemo);
  const setUser = useAppStore((s) => s.setUser);
  const signOut = useAppStore((s) => s.signOut);
  const [name, setName] = useState(user?.displayName || '');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState<'name' | 'password' | null>(null);
  if (!user) return null;

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    if (isDemo) return setUser({ ...user, displayName: name });
    setBusy('name');
    try {
      setUser(await authService.updateMe({ displayName: name }));
      toast.success('Name saved');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save'));
    } finally {
      setBusy(null);
    }
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (isDemo) return toast('Not in the demo', { icon: '✨' });
    setBusy('password');
    try {
      setUser(await authService.updateMe({ currentPassword: current, newPassword: next }));
      setCurrent('');
      setNext('');
      toast.success('Password changed');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not change the password'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-center gap-4">
        <Avatar name={user.displayName || user.email} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{user.displayName || user.email}</p>
          <p className="flex items-center gap-2 truncate text-sm text-ink-500 dark:text-ink-400">
            {user.email}
            {user.role === 'admin' && <Badge variant="primary">Admin</Badge>}
          </p>
        </div>
      </div>

      <Section title="Name">
        <form onSubmit={saveName} className="flex gap-2">
          <Input aria-label="Display name" value={name} onChange={setName} wrapperClassName="flex-1" />
          <Button type="submit" variant="secondary" loading={busy === 'name'}>Save</Button>
        </form>
      </Section>

      <Section title={user.hasPassword ? 'Change password' : 'Set a password'} description={user.hasPassword ? undefined : 'You sign in with Google or Microsoft. A password lets you sign in without them too.'}>
        <form onSubmit={savePassword} className="space-y-3">
          {user.hasPassword && (
            <Input type="password" aria-label="Current password" autoComplete="current-password" placeholder="Current password" value={current} onChange={setCurrent} icon={<KeyRound className="h-4 w-4" />} />
          )}
          <Input type="password" aria-label="New password" autoComplete="new-password" placeholder="New password (8+ characters)" value={next} onChange={setNext} icon={<KeyRound className="h-4 w-4" />} />
          <Button type="submit" variant="secondary" loading={busy === 'password'} disabled={next.length < 8}>
            {user.hasPassword ? 'Change password' : 'Set password'}
          </Button>
        </form>
      </Section>

      <Section title="Sign-in methods">
        <div className="flex flex-wrap gap-2">
          <SignInMethod on={user.hasPassword} label="Password" icon={<KeyRound className="h-4 w-4" />} />
          <SignInMethod on={user.google} label="Google" icon={<GoogleLogo className="h-4 w-4" />} />
          <SignInMethod on={user.microsoft} label="Microsoft" icon={<MicrosoftLogo className="h-4 w-4" />} />
        </div>
        <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">Connecting a Google or Microsoft mailbox also lets you sign in with it.</p>
      </Section>

      <Button variant="danger" onClick={signOut}>
        <LogOut className="h-4 w-4" /> Sign out
      </Button>
    </div>
  );
};

const SignInMethod: FC<{ on: boolean; label: string; icon: React.ReactNode }> = ({ on, label, icon }) => (
  <span className={cn('inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm ring-1', on ? 'bg-white ring-ink-200 dark:bg-white/5 dark:ring-white/10' : 'text-ink-400 opacity-60 ring-ink-200/60 dark:ring-white/5')}>
    {icon} {label} {on && <Check className="h-3.5 w-3.5 text-emerald-500" />}
  </span>
);

const MailboxesTab: FC = () => {
  const mailboxes = useAppStore((s) => s.mailboxes);
  const isDemo = useAppStore((s) => s.isDemo);
  const setMailboxes = useAppStore((s) => s.setMailboxes);
  const [adding, setAdding] = useState(mailboxes.length === 0);
  const [removing, setRemoving] = useState<string | null>(null);

  const remove = async (m: Mailbox) => {
    if (!window.confirm(`Remove ${m.email}? Its emails are deleted from Mailman (not from your provider).`)) return;
    if (isDemo) return setMailboxes(mailboxes.filter((x) => x.id !== m.id));
    setRemoving(m.id);
    try {
      await mailboxService.remove(m.id);
      setMailboxes(mailboxes.filter((x) => x.id !== m.id));
      useAppStore.getState().setEmails(useAppStore.getState().emails.filter((e) => e.accountId !== m.id));
      toast.success(`Removed ${m.email}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not remove the mailbox'));
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div>
      <Section title="Mailboxes" description="Every connected email account shows up in your inbox.">
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {mailboxes.map((m) => (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -30, height: 0 }}
                className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-card ring-1 ring-ink-200/70 dark:bg-ink-800/60 dark:shadow-none dark:ring-white/10"
              >
                <MailboxTypeLogo type={m.type} className="h-6 w-6" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{m.email}</p>
                  <p className="text-xs text-ink-500 dark:text-ink-400">
                    {m.authType === 'oauth2' ? 'Signed in with ' + (m.type === 'gmail' ? 'Google' : 'Microsoft') : 'Password'}
                    {' · '}
                    {syncStatus(m)}
                  </p>
                  {m.syncError && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-rose-600 dark:text-rose-400" title={m.syncError}>
                      {m.syncError}
                    </p>
                  )}
                </div>
                <IconButton label={`Remove ${m.email}`} tone="danger" onClick={() => remove(m)} disabled={removing === m.id}>
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </Section>

      <AnimatePresence mode="wait">
        {adding ? (
          <motion.div key="add" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <h2 className="mb-4 text-base font-semibold">Add a mailbox</h2>
            {isDemo ? (
              <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">Connecting real mailboxes isn't available in the demo.</p>
            ) : (
              <AddMailbox onDone={() => setAdding(false)} />
            )}
          </motion.div>
        ) : (
          <motion.div key="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Button variant="secondary" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" /> Add mailbox
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const InvitesTab: FC = () => {
  const isDemo = useAppStore((s) => s.isDemo);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [note, setNote] = useState('');
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [fresh, setFresh] = useState<Invite | null>(null);

  const load = useCallback(async () => {
    if (isDemo) return;
    try {
      setInvites(await inviteService.list());
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not load invites'));
    }
  }, [isDemo]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (isDemo) return toast('Not in the demo', { icon: '✨' });
    setBusy(true);
    try {
      const invite = await inviteService.create(note, days);
      setFresh(invite);
      setNote('');
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not create the invite'));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (invite: Invite) => {
    try {
      await inviteService.remove(invite.id);
      if (fresh?.id === invite.id) setFresh(null);
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not revoke the invite'));
    }
  };

  return (
    <div>
      <Section title="Invite someone" description="Only people with an invite can create an account on this server. Each invite works once.">
        <form onSubmit={create} className="flex flex-col gap-2 sm:flex-row">
          <Input aria-label="Who is it for" placeholder="Who is it for? (optional)" value={note} onChange={setNote} wrapperClassName="flex-1" />
          <select
            aria-label="Valid for"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="h-11 rounded-xl border border-ink-200 bg-white/80 px-3 text-sm dark:border-white/10 dark:bg-ink-900/60"
          >
            {[1, 3, 7, 14, 30].map((d) => (
              <option key={d} value={d}>{d === 1 ? '1 day' : `${d} days`}</option>
            ))}
          </select>
          <Button type="submit" loading={busy}>
            <Plus className="h-4 w-4" /> Create invite
          </Button>
        </form>
        <AnimatePresence>{fresh && <InviteLink key={fresh.id} invite={fresh} />}</AnimatePresence>
      </Section>

      <Section title="Invites">
        {invites.length === 0 ? (
          <p className="text-sm text-ink-500 dark:text-ink-400">No invites yet.</p>
        ) : (
          <div className="space-y-2">
            {invites.map((i) => (
              <div key={i.id} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-card ring-1 ring-ink-200/70 dark:bg-ink-800/60 dark:shadow-none dark:ring-white/10">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{i.note || 'Invite'}</p>
                  <p className="text-xs text-ink-500 dark:text-ink-400">
                    {i.status === 'used' && i.usedAt
                      ? `Used ${format(new Date(i.usedAt), 'MMM d')}`
                      : i.status === 'expired'
                        ? `Expired ${format(new Date(i.expiresAt), 'MMM d')}`
                        : `Expires in ${formatDistanceToNowStrict(new Date(i.expiresAt))}`}
                  </p>
                </div>
                <Badge variant={i.status === 'active' ? 'success' : 'default'}>{i.status}</Badge>
                {i.status === 'active' && (
                  <IconButton label="Revoke invite" tone="danger" onClick={() => revoke(i)}>
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
};

const InviteLink: FC<{ invite: Invite }> = ({ invite }) => {
  const link = `${serverOrigin()}/?invite=${encodeURIComponent(invite.code)}`;
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copy failed. Select the link and copy it.');
    }
  };
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
      <div className="mt-4 rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-500/10">
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Send this link. It works once{invite.note ? `, for ${invite.note}` : ''}.</p>
        <div className="mt-3 flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-3 py-2 text-xs dark:bg-ink-900" title={link}>{link}</code>
          <Button size="sm" variant="secondary" onClick={copy}>
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <p className="mt-2 text-xs text-emerald-700/80 dark:text-emerald-300/70">Invite code: <span className="font-mono">{invite.code}</span></p>
      </div>
    </motion.div>
  );
};
