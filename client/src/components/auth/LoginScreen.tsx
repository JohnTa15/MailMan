import { FC, FormEvent, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import {
  ArrowRight,
  AtSign,
  Check,
  Crown,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  Lock,
  Pencil,
  ShieldCheck,
  Sparkles,
  Ticket,
  User as UserIcon,
  Zap,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { authService, Session } from '../../services/authService';
import { apiErrorMessage, isNativeApp, normalizeServerUrl, serverOrigin } from '../../lib/api';
import { runOAuth } from '../../lib/oauth';
import { useAppStore } from '../../store/appStore';
import { useServerStatus } from '../../hooks/useServerStatus';
import { DEMO_EMAILS, DEMO_MAILBOX, DEMO_USER } from '../../data/mockData';
import { OAuthProviderId } from '../../types';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { LogoMark } from '../ui/Logo';
import { ThemeToggle } from '../ui/ThemeToggle';
import { UpdateButton } from '../ui/UpdateButton';
import { GoogleLogo, MicrosoftLogo } from '../mailboxes/ProviderLogos';

const FEATURES = [
  { icon: Zap, title: 'All your inboxes', text: 'Gmail, Outlook, iCloud and any IMAP account in one place.' },
  { icon: ShieldCheck, title: 'Private by design', text: 'Your own server, invite-only, credentials encrypted.' },
  { icon: Sparkles, title: 'Delightful', text: 'Thoughtful motion, light and dark themes.' },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } },
};

type Mode = 'signin' | 'signup';

export const LoginScreen: FC = () => {
  const signIn = useAppStore((s) => s.signIn);
  const startDemo = useAppStore((s) => s.startDemo);
  const pendingInvite = useAppStore((s) => s.pendingInvite);
  const setPendingInvite = useAppStore((s) => s.setPendingInvite);
  const { status, error: serverError, loading: statusLoading, reload } = useServerStatus();
  const shake = useAnimationControls();

  const [mode, setMode] = useState<Mode>(pendingInvite ? 'signup' : 'signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [invite, setInvite] = useState(pendingInvite || '');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState<OAuthProviderId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const firstUser = status?.hasUsers === false;
  const providers = (['google', 'microsoft'] as const).filter((p) => status?.providers[p]);

  // A brand-new server has nobody to sign in as
  useEffect(() => {
    if (firstUser) setMode('signup');
  }, [firstUser]);

  // An invite link opened while this screen is showing
  useEffect(() => {
    if (!pendingInvite) return;
    setInvite(pendingInvite);
    setMode('signup');
  }, [pendingInvite]);

  const fail = (message: string) => {
    setError(message);
    shake.start({ x: [0, -10, 10, -6, 6, 0], transition: { duration: 0.4 } });
  };

  const welcome = (session: Session, note?: string) => {
    setPendingInvite(null);
    signIn(session.access_token, session.user);
    toast.success(`Welcome, ${session.user.displayName || session.user.email}!`);
    if (note) toast.error(note, { duration: 8000 });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) return fail('Enter your email address and password.');
    if (mode === 'signup' && password.length < 8) return fail('Use a password of at least 8 characters.');
    if (mode === 'signup' && !firstUser && !invite.trim()) return fail('Enter the invite code you received.');

    setBusy(true);
    try {
      welcome(
        mode === 'signin'
          ? await authService.login(email, password)
          : await authService.signup({ email, password, displayName: name || undefined, invite: invite.trim() || undefined })
      );
    } catch (err) {
      fail(apiErrorMessage(err, mode === 'signin' ? 'Could not sign in.' : 'Could not create the account.'));
    } finally {
      setBusy(false);
    }
  };

  const continueWith = async (provider: OAuthProviderId) => {
    setError(null);
    if (mode === 'signup' && !firstUser && !invite.trim()) {
      return fail('Enter your invite code first, then continue.');
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setWaiting(provider);
    try {
      const result = await runOAuth(provider, 'signin', { invite: invite.trim() || undefined, signal: controller.signal });
      if (result.access_token && result.user) {
        welcome({ access_token: result.access_token, user: result.user }, result.mailboxError);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') fail(apiErrorMessage(err, 'Sign-in did not complete.'));
    } finally {
      setWaiting(null);
    }
  };

  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden px-4 pb-10 pt-20 lg:py-10">
      {/* Animated backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] animate-blob rounded-full bg-primary-400/40 blur-3xl dark:bg-primary-600/30" />
        <div className="absolute -right-24 top-1/4 h-[26rem] w-[26rem] animate-blob rounded-full bg-fuchsia-400/30 blur-3xl [animation-delay:-6s] dark:bg-fuchsia-600/20" />
        <div className="absolute -bottom-40 left-1/3 h-[30rem] w-[30rem] animate-blob rounded-full bg-sky-300/40 blur-3xl [animation-delay:-12s] dark:bg-sky-600/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(99,102,241,0.12)_1px,transparent_0)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)]" />
      </div>

      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle className="glass rounded-full p-2.5" />
      </div>

      <div className="relative z-10 grid w-full max-w-5xl items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
        {/* Hero */}
        <motion.div variants={container} initial="hidden" animate="show" className="hidden lg:block">
          <motion.div variants={item} className="mb-8 flex items-center gap-3">
            <LogoMark className="h-12 w-12" animate />
            <span className="text-2xl font-bold tracking-tight">Mailman</span>
          </motion.div>
          <motion.h1 variants={item} className="text-5xl font-extrabold leading-[1.05] tracking-tight">
            Email that feels <span className="text-gradient">effortless.</span>
          </motion.h1>
          <motion.p variants={item} className="mt-5 max-w-md text-lg text-ink-500 dark:text-ink-400">
            One home for every inbox. Fast, private and open source.
          </motion.p>
          <div className="mt-10 space-y-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <motion.div key={title} variants={item} className="flex items-center gap-4">
                <div className="glass flex h-11 w-11 items-center justify-center rounded-xl text-primary-600 dark:text-primary-300">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-ink-500 dark:text-ink-400">{text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
          className="mx-auto w-full max-w-md"
        >
          <motion.div animate={shake} className="glass relative overflow-hidden rounded-3xl p-8 shadow-float">
            <LogoMark className="mx-auto mb-5 h-14 w-14 lg:hidden" animate />

            {(isNativeApp() || serverError) && <ServerPicker error={serverError} loading={statusLoading} onChanged={reload} />}

            {/* Sign in / Create account */}
            {!firstUser && (
              <div className="mb-6 grid grid-cols-2 rounded-2xl bg-ink-100/80 p-1 dark:bg-white/5">
                {(['signin', 'signup'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMode(m);
                      setError(null);
                    }}
                    className={cn(
                      'relative rounded-xl py-2 text-sm font-semibold transition-colors',
                      mode === m ? 'text-ink-900 dark:text-white' : 'text-ink-500 hover:text-ink-700 dark:text-ink-400 dark:hover:text-ink-200'
                    )}
                  >
                    {mode === m && (
                      <motion.span
                        layoutId="auth-mode"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                        className="absolute inset-0 rounded-xl bg-white shadow-card dark:bg-white/10"
                      />
                    )}
                    <span className="relative">{m === 'signin' ? 'Sign in' : 'Create account'}</span>
                  </button>
                ))}
              </div>
            )}

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: mode === 'signup' ? 16 : -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mode === 'signup' ? -16 : 16 }}
                transition={{ duration: 0.18 }}
              >
                <div className="mb-6 text-center lg:text-left">
                  <h2 className="text-2xl font-bold tracking-tight">
                    {mode === 'signin' ? 'Welcome back' : firstUser ? 'Set up your server' : 'Create your account'}
                  </h2>
                  <p className="mt-1.5 text-sm text-ink-500 dark:text-ink-400">
                    {mode === 'signin'
                      ? 'Sign in to Mailman to see all your inboxes.'
                      : firstUser
                        ? 'You are the first person here, so this account becomes the admin.'
                        : 'You need an invite from the admin of this server.'}
                  </p>
                </div>

                {firstUser && (
                  <div className="mb-5 flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                    <Crown className="h-5 w-5 shrink-0" />
                    Admins invite everyone else from Settings.
                  </div>
                )}

                <form onSubmit={submit} className="space-y-4" noValidate>
                  {mode === 'signup' && !firstUser && (
                    <Field label="Invite code">
                      <Input
                        aria-label="Invite code"
                        value={invite}
                        onChange={(v) => {
                          setInvite(v);
                          setError(null);
                        }}
                        placeholder="Paste your invite code"
                        icon={<Ticket className="h-4 w-4" />}
                        trailing={
                          pendingInvite && invite === pendingInvite ? (
                            <span className="mr-1 flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                              <Check className="h-3 w-3" /> From link
                            </span>
                          ) : undefined
                        }
                        className={pendingInvite && invite === pendingInvite ? 'pr-28' : undefined}
                      />
                    </Field>
                  )}
                  {mode === 'signup' && (
                    <Field label="Your name">
                      <Input aria-label="Your name" autoComplete="name" value={name} onChange={setName} placeholder="Alex Morgan" icon={<UserIcon className="h-4 w-4" />} />
                    </Field>
                  )}
                  <Field label="Email address">
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      autoFocus
                      value={email}
                      onChange={(v) => {
                        setEmail(v);
                        setError(null);
                      }}
                      placeholder="you@example.com"
                      icon={<AtSign className="h-4 w-4" />}
                    />
                  </Field>
                  <Field label="Password">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(v) => {
                        setPassword(v);
                        setError(null);
                      }}
                      placeholder={mode === 'signin' ? '••••••••' : 'At least 8 characters'}
                      icon={<Lock className="h-4 w-4" />}
                      trailing={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-white/5 dark:hover:text-white"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      }
                    />
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => {
                          toast('Contact your server admin to reset your password using the CLI tool.', { duration: 6000 });
                        }}
                        className="mt-2 text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline dark:text-primary-400 dark:hover:text-primary-300"
                      >
                        Forgot password?
                      </button>
                    )}
                  </Field>

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

                  <Button type="submit" size="lg" loading={busy} disabled={!!waiting} className="group w-full">
                    {busy ? (mode === 'signin' ? 'Signing in…' : 'Creating account…') : mode === 'signin' ? 'Sign in' : 'Create account'}
                    {!busy && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
                  </Button>
                </form>

                {providers.length > 0 && (
                  <>
                    <Divider />
                    <div className="space-y-2.5">
                      {providers.map((p) => (
                        <ProviderButton key={p} provider={p} waiting={waiting === p} disabled={!!waiting || busy} onClick={() => continueWith(p)} />
                      ))}
                    </div>
                    <AnimatePresence>
                      {waiting && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <p className="mt-3 text-center text-sm text-ink-500 dark:text-ink-400">
                            Finish in the window that opened.{' '}
                            <button type="button" className="font-medium text-primary-600 hover:underline dark:text-primary-300" onClick={() => abortRef.current?.abort()}>
                              Cancel
                            </button>
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            <Divider />
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => {
                startDemo(DEMO_USER, [DEMO_MAILBOX], DEMO_EMAILS);
                toast('Exploring the demo inbox', { icon: '✨' });
              }}
            >
              <Sparkles className="h-4 w-4 text-primary-500" />
              Try the demo
            </Button>
          </motion.div>

          <p className="mt-6 text-center text-xs text-ink-500 dark:text-ink-400">
            Gmail · Outlook · Office 365 · iCloud · Yahoo · any IMAP
          </p>
          <UpdateButton autoCheck className="mt-4" />
        </motion.div>
      </div>
    </div>
  );
};

const Field: FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <span className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-300">{label}</span>
    {children}
  </div>
);

const Divider: FC = () => (
  <div className="my-6 flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-ink-400">
    <span className="h-px flex-1 bg-ink-200 dark:bg-white/10" />
    or
    <span className="h-px flex-1 bg-ink-200 dark:bg-white/10" />
  </div>
);

const ProviderButton: FC<{ provider: OAuthProviderId; waiting: boolean; disabled: boolean; onClick: () => void }> = ({
  provider,
  waiting,
  disabled,
  onClick,
}) => (
  <motion.button
    type="button"
    onClick={onClick}
    disabled={disabled}
    whileHover={disabled ? undefined : { y: -1 }}
    whileTap={disabled ? undefined : { scale: 0.98 }}
    className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-white text-sm font-semibold text-ink-800 shadow-sm ring-1 ring-ink-200 transition-colors hover:bg-ink-50 disabled:opacity-60 dark:bg-white/5 dark:text-ink-100 dark:ring-white/10 dark:hover:bg-white/10"
  >
    {waiting ? <Loader2 className="h-5 w-5 animate-spin" /> : provider === 'google' ? <GoogleLogo /> : <MicrosoftLogo />}
    Continue with {provider === 'google' ? 'Google' : 'Microsoft'}
  </motion.button>
);

/** Which Mailman server the desktop/Android app uses. */
const ServerPicker: FC<{ error: string | null; loading: boolean; onChanged: () => void }> = ({ error, loading, onChanged }) => {
  const serverUrl = useAppStore((s) => s.serverUrl);
  const setServerUrl = useAppStore((s) => s.setServerUrl);
  const [editing, setEditing] = useState(!serverUrl && isNativeApp());
  const [value, setValue] = useState(serverUrl);
  const host = serverOrigin().replace(/^https?:\/\//, '');

  const save = (e: FormEvent) => {
    e.preventDefault();
    setServerUrl(normalizeServerUrl(value));
    setEditing(false);
    setTimeout(onChanged, 0);
  };

  return (
    <div className="mb-6">
      <AnimatePresence mode="wait" initial={false}>
        {editing ? (
          <motion.form key="edit" onSubmit={save} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
            <span className="block text-sm font-medium text-ink-700 dark:text-ink-300">Mailman server</span>
            <div className="flex gap-2">
              <Input aria-label="Mailman server address" value={value} onChange={setValue} placeholder="mail.example.com" icon={<Globe className="h-4 w-4" />} wrapperClassName="flex-1" autoFocus />
              <Button type="submit" variant="secondary" disabled={!value.trim()}>Connect</Button>
            </div>
            <p className="text-xs text-ink-500 dark:text-ink-400">The address of the server where Mailman runs.</p>
          </motion.form>
        ) : (
          <motion.button
            key="view"
            type="button"
            onClick={() => setEditing(true)}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs ring-1',
              error ? 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20' : 'bg-ink-100/70 text-ink-600 ring-transparent dark:bg-white/5 dark:text-ink-300'
            )}
          >
            <span className={cn('h-2 w-2 shrink-0 rounded-full', loading ? 'animate-pulse bg-ink-400' : error ? 'bg-rose-500' : 'bg-emerald-500')} />
            <span className="min-w-0 flex-1 truncate">{error ? `Can't reach ${host}` : host}</span>
            <Pencil className="h-3.5 w-3.5 shrink-0" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};
