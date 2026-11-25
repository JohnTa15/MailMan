import { FC, FormEvent, ReactNode, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, AtSign, ChevronRight, ExternalLink, KeyRound, Loader2, Plug, Server } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { mailboxService } from '../../services/authService';
import { apiErrorMessage } from '../../lib/api';
import { runOAuth } from '../../lib/oauth';
import { useAppStore } from '../../store/appStore';
import { useServerStatus } from '../../hooks/useServerStatus';
import { useMail } from '../../hooks/useMail';
import { Mailbox, OAuthProviderId } from '../../types';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { GoogleLogo, ICloudLogo, ImapLogo, MicrosoftLogo, YahooLogo } from './ProviderLogos';

type Choice = 'google' | 'microsoft' | 'yahoo' | 'icloud' | 'other';
/** A provider whose own sign-in page this server cannot use yet */
type Unavailable = 'google-setup' | 'microsoft-setup';

interface PasswordHelp {
  title: string;
  placeholder: string;
  passwordLabel: string;
  help?: { text: string; url: string };
}

const PASSWORD_HELP: Record<Exclude<Choice, 'microsoft'>, PasswordHelp> = {
  google: {
    title: 'Gmail',
    placeholder: 'you@gmail.com',
    passwordLabel: 'App password',
    help: { text: 'Turn on 2-Step Verification, then create an app password', url: 'https://myaccount.google.com/apppasswords' },
  },
  yahoo: {
    title: 'Yahoo Mail',
    placeholder: 'you@yahoo.com',
    passwordLabel: 'App password',
    help: { text: 'Create an app password in Yahoo account security', url: 'https://login.yahoo.com/myaccount/security/app-password' },
  },
  icloud: {
    title: 'iCloud Mail',
    placeholder: 'you@icloud.com',
    passwordLabel: 'App-specific password',
    help: { text: 'Create one under Sign-In and Security → App-Specific Passwords', url: 'https://account.apple.com/account/manage' },
  },
  other: { title: 'Other email (IMAP)', placeholder: 'you@example.com', passwordLabel: 'Password' },
};

const slide = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
  transition: { duration: 0.18 },
};

/** Connects a mailbox: Google/Microsoft through their sign-in, others with an (app) password. */
export const AddMailbox: FC<{ onDone?: (mailbox: Mailbox) => void }> = ({ onDone }) => {
  const { status } = useServerStatus();
  const { refresh, loadSession } = useMail();
  const [choice, setChoice] = useState<Choice | Unavailable | null>(null);
  const [waiting, setWaiting] = useState<OAuthProviderId | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const finished = async (mailbox: Mailbox) => {
    toast.success(`Connected ${mailbox.email}`);
    await loadSession();
    setChoice(null);
    onDone?.(mailbox);
    // The server pulls the inbox in the background; fetch it shortly after
    setTimeout(() => refresh(), 4000);
  };

  const connectOAuth = async (provider: OAuthProviderId) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setWaiting(provider);
    try {
      const result = await runOAuth(provider, 'connect', { signal: controller.signal });
      if (result.mailbox) await finished(result.mailbox);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') toast.error(apiErrorMessage(err, 'Could not connect the mailbox'));
    } finally {
      setWaiting(null);
    }
  };

  // Google and Microsoft: their own sign-in page (email, password, 2FA), like "Sign in with Google" anywhere
  const pick = (c: Choice) => {
    if (c === 'google') return status?.providers.google ? connectOAuth('google') : setChoice('google-setup');
    if (c === 'microsoft') return status?.providers.microsoft ? connectOAuth('microsoft') : setChoice('microsoft-setup');
    setChoice(c);
  };

  if (waiting) {
    return (
      <motion.div {...slide} className="flex flex-col items-center px-4 py-10 text-center">
        <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-card ring-1 ring-ink-200/70 dark:bg-ink-800 dark:ring-white/10">
          {waiting === 'google' ? <GoogleLogo className="h-8 w-8" /> : <MicrosoftLogo className="h-8 w-8" />}
          <Loader2 className="absolute -bottom-2 -right-2 h-6 w-6 animate-spin rounded-full bg-white p-1 text-primary-500 shadow-card dark:bg-ink-900" />
        </div>
        <p className="font-semibold">Waiting for {waiting === 'google' ? 'Google' : 'Microsoft'}…</p>
        <p className="mt-1 max-w-xs text-sm text-ink-500 dark:text-ink-400">
          Finish signing in in the window that opened, then come back here.
        </p>
        <Button variant="ghost" size="sm" className="mt-5" onClick={() => abortRef.current?.abort()}>
          Cancel
        </Button>
      </motion.div>
    );
  }

  if (choice === 'google-setup' || choice === 'microsoft-setup') {
    return (
      <SignInNotSetUp
        provider={choice === 'google-setup' ? 'google' : 'microsoft'}
        onBack={() => setChoice(null)}
        onAppPassword={() => setChoice('google')}
      />
    );
  }

  if (choice && choice !== 'microsoft') {
    return <PasswordForm choice={choice} onBack={() => setChoice(null)} onConnected={finished} />;
  }

  const options: { id: Choice; title: string; subtitle: string; logo: ReactNode }[] = [
    {
      id: 'google',
      title: 'Google',
      subtitle: status?.providers.google ? 'Sign in with Google: Gmail and Workspace' : 'Gmail and Google Workspace',
      logo: <GoogleLogo className="h-6 w-6" />,
    },
    {
      id: 'microsoft',
      title: 'Microsoft',
      subtitle: status?.providers.microsoft ? 'Sign in with Microsoft: Outlook and Office 365' : 'Outlook.com and Office 365',
      logo: <MicrosoftLogo className="h-6 w-6" />,
    },
    { id: 'yahoo', title: 'Yahoo', subtitle: 'With an app password', logo: <YahooLogo className="h-6 w-6" /> },
    { id: 'icloud', title: 'iCloud', subtitle: 'With an app-specific password', logo: <ICloudLogo className="h-6 w-6" /> },
    { id: 'other', title: 'Other email', subtitle: 'Any IMAP and SMTP server', logo: <ImapLogo className="h-6 w-6" /> },
  ];

  return (
    <motion.div {...slide} className="grid gap-2">
      {options.map((o, i) => (
        <motion.button
          key={o.id}
          type="button"
          onClick={() => pick(o.id)}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }}
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'group flex items-center gap-4 rounded-2xl bg-white px-4 py-3.5 text-left shadow-card ring-1 ring-ink-200/70 transition-colors hover:ring-primary-300 dark:bg-ink-800/60 dark:shadow-none dark:ring-white/10 dark:hover:ring-primary-400/40',
          )}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-50 dark:bg-white/5">{o.logo}</span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{o.title}</span>
            <span className="block truncate text-sm text-ink-500 dark:text-ink-400">{o.subtitle}</span>
          </span>
          <ChevronRight className="h-4 w-4 text-ink-400 transition-transform group-hover:translate-x-0.5" />
        </motion.button>
      ))}
      {status?.providers.google && (
        <button
          type="button"
          onClick={() => setChoice('google')}
          className="mt-1 justify-self-center text-xs font-medium text-ink-500 hover:text-ink-800 hover:underline dark:text-ink-400 dark:hover:text-white"
        >
          Gmail with an app password instead
        </button>
      )}
    </motion.div>
  );
};

/**
 * Google/Microsoft sign-in needs a one-time app registration on the server.
 * The admin gets a shortcut to it; Gmail also works with an app password.
 */
const SignInNotSetUp: FC<{ provider: OAuthProviderId; onBack: () => void; onAppPassword: () => void }> = ({
  provider,
  onBack,
  onAppPassword,
}) => {
  const isAdmin = useAppStore((s) => s.user?.role === 'admin');
  const openSettings = useAppStore((s) => s.openSettings);
  const name = provider === 'google' ? 'Google' : 'Microsoft';
  const Logo = provider === 'google' ? GoogleLogo : MicrosoftLogo;
  return (
    <motion.div {...slide} className="space-y-4">
      <BackButton onClick={onBack} />
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink-50 dark:bg-white/5">
          <Logo className="h-6 w-6" />
        </span>
        <h3 className="text-lg font-semibold">Sign in with {name}</h3>
      </div>
      <p className="text-sm text-ink-600 dark:text-ink-300">
        You sign in on {name}'s own page with your email, password and 2-step code, and Mailman never sees your password.
        {isAdmin
          ? ` Before that works, this server needs a one-time ${name} app registration (about 10 minutes).`
          : ` Your Mailman admin has to turn it on for this server first.`}
      </p>
      {isAdmin && (
        <Button className="w-full" onClick={() => openSettings('integrations')}>
          <Plug className="h-4 w-4" />
          Set up {name} sign-in
        </Button>
      )}
      {provider === 'google' ? (
        <Button variant="secondary" className="w-full" onClick={onAppPassword}>
          <KeyRound className="h-4 w-4" />
          Use a Gmail app password for now
        </Button>
      ) : (
        <p className="rounded-xl bg-ink-100/70 px-3.5 py-3 text-xs text-ink-600 dark:bg-white/5 dark:text-ink-300">
          Outlook and Office 365 accept only Microsoft's sign-in: Microsoft no longer allows passwords or app passwords for
          email apps.
        </p>
      )}
    </motion.div>
  );
};

const BackButton: FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white"
  >
    <ArrowLeft className="h-4 w-4" />
    All providers
  </button>
);

const PasswordForm: FC<{
  choice: Exclude<Choice, 'microsoft'>;
  onBack: () => void;
  onConnected: (mailbox: Mailbox) => void;
}> = ({ choice, onBack, onConnected }) => {
  const help = PASSWORD_HELP[choice];
  const user = useAppStore((s) => s.user);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showServer, setShowServer] = useState(choice === 'other');
  const [server, setServer] = useState({ imapHost: '', imapPort: '993', smtpHost: '', smtpPort: '587', secure: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const custom =
        showServer && server.imapHost
          ? {
              imapHost: server.imapHost,
              imapPort: Number(server.imapPort) || undefined,
              imapSecure: server.secure,
              smtpHost: server.smtpHost || server.imapHost.replace(/^imap\./, 'smtp.'),
              smtpPort: Number(server.smtpPort) || undefined,
              smtpSecure: server.secure && Number(server.smtpPort) === 465,
            }
          : {};
      onConnected(await mailboxService.connect({ email, password, ...custom }));
    } catch (err) {
      const message = apiErrorMessage(err, 'Could not connect the mailbox');
      if (/server settings|detect/i.test(message)) setShowServer(true);
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.form {...slide} onSubmit={submit} className="space-y-4" noValidate>
      <BackButton onClick={onBack} />
      <h3 className="text-lg font-semibold">{help.title}</h3>
      {help.help && (
        <a
          href={help.help.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-2 rounded-xl bg-primary-50 px-3.5 py-3 text-sm text-primary-800 hover:bg-primary-100 dark:bg-primary-500/10 dark:text-primary-200 dark:hover:bg-primary-500/15"
        >
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{help.help.text}</span>
          <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        </a>
      )}
      <Input
        type="email"
        aria-label="Email address"
        autoComplete="off"
        value={email}
        onChange={setEmail}
        placeholder={help.placeholder || user?.email || ''}
        icon={<AtSign className="h-4 w-4" />}
        autoFocus
      />
      <Input
        type="password"
        aria-label={help.passwordLabel}
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        placeholder={help.passwordLabel}
        icon={<KeyRound className="h-4 w-4" />}
      />

      {choice === 'other' || showServer ? (
        <div className="space-y-3 rounded-2xl bg-ink-100/70 p-4 dark:bg-white/5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-500">
            <Server className="h-3.5 w-3.5" /> Server settings
          </p>
          <div className="grid grid-cols-[1fr_5.5rem] gap-3">
            <Input aria-label="IMAP host" value={server.imapHost} onChange={(v) => setServer({ ...server, imapHost: v })} placeholder="imap.example.com" />
            <Input aria-label="IMAP port" inputMode="numeric" value={server.imapPort} onChange={(v) => setServer({ ...server, imapPort: v })} placeholder="993" />
          </div>
          <div className="grid grid-cols-[1fr_5.5rem] gap-3">
            <Input aria-label="SMTP host" value={server.smtpHost} onChange={(v) => setServer({ ...server, smtpHost: v })} placeholder="smtp.example.com" />
            <Input aria-label="SMTP port" inputMode="numeric" value={server.smtpPort} onChange={(v) => setServer({ ...server, smtpPort: v })} placeholder="587" />
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-600 dark:text-ink-300">
            <input
              type="checkbox"
              checked={server.secure}
              onChange={(e) => setServer({ ...server, secure: e.target.checked })}
              className="h-4 w-4 rounded border-ink-300 accent-primary-600"
            />
            Use SSL/TLS
          </label>
        </div>
      ) : (
        <button type="button" onClick={() => setShowServer(true)} className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-300">
          Enter server settings manually
        </button>
      )}

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="alert"
            className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <Button type="submit" className="w-full" loading={busy} disabled={!email || !password}>
        {busy ? 'Checking with your mail server…' : 'Connect mailbox'}
      </Button>
    </motion.form>
  );
};
