import { FC, FormEvent, useMemo, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { ArrowRight, AtSign, ChevronDown, Eye, EyeOff, Lock, Server, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { emailService } from '../../services/emailService';
import { apiErrorMessage } from '../../lib/api';
import { useAppStore } from '../../store/appStore';
import { DEMO_ACCOUNT, DEMO_EMAILS } from '../../data/mockData';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { LogoMark } from '../ui/Logo';
import { ThemeToggle } from '../ui/ThemeToggle';

const GOOGLE_SVG = (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path
      fill="currentColor"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="currentColor"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="currentColor"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="currentColor"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const FACEBOOK_SVG = (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path
      fill="currentColor"
      d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
    />
  </svg>
);

const PROVIDERS: Record<string, string> = {
  'gmail.com': 'Gmail',
  'googlemail.com': 'Gmail',
  'outlook.com': 'Outlook',
  'hotmail.com': 'Outlook',
  'live.com': 'Outlook',
  'yahoo.com': 'Yahoo Mail',
  'icloud.com': 'iCloud',
  'me.com': 'iCloud',
};

const FEATURES = [
  { icon: Zap, title: 'Lightning fast', text: 'A focused inbox that keeps up with you.' },
  { icon: ShieldCheck, title: 'Private by design', text: 'Credentials are encrypted at rest.' },
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

export const LoginScreen: FC = () => {
  const signIn = useAppStore((s) => s.signIn);
  const startDemo = useAppStore((s) => s.startDemo);
  const shake = useAnimationControls();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [server, setServer] = useState({
    imapHost: '',
    imapPort: '993',
    smtpHost: '',
    smtpPort: '587',
    secure: true,
  });

  const provider = useMemo(() => PROVIDERS[email.split('@')[1]?.toLowerCase() ?? ''], [email]);

  const fail = (message: string) => {
    setError(message);
    shake.start({ x: [0, -10, 10, -6, 6, 0], transition: { duration: 0.4 } });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      fail('Enter your email address and password.');
      return;
    }

    setIsConnecting(true);
    try {
      const advanced = showAdvanced && server.imapHost
        ? {
            imapHost: server.imapHost,
            imapPort: Number(server.imapPort) || undefined,
            imapSecure: server.secure,
            smtpHost: server.smtpHost || server.imapHost.replace(/^imap\./, 'smtp.'),
            smtpPort: Number(server.smtpPort) || undefined,
            smtpSecure: server.secure && Number(server.smtpPort) === 465,
          }
        : {};
      const { access_token, account } = await emailService.login({ email, password, ...advanced });
      signIn(access_token, account);
      toast.success(`Welcome, ${account.displayName || account.email}!`);
    } catch (err) {
      const message = apiErrorMessage(err, 'Could not sign in.');
      if (/server settings|detect/i.test(message)) setShowAdvanced(true);
      fail(message);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden px-4 py-10">
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
            Connect any IMAP account in seconds. Fast, private and open source.
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
          <motion.div animate={shake} className="glass rounded-3xl p-8 shadow-float">
            <div className="mb-7 text-center lg:text-left">
              <LogoMark className="mx-auto mb-5 h-14 w-14 lg:hidden" animate />
              <h2 className="text-2xl font-bold tracking-tight">Sign in to your inbox</h2>
              <p className="mt-1.5 text-sm text-ink-500 dark:text-ink-400">Use your email account's password or app password.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-300">
                  Email address
                </label>
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
                  trailing={
                    <AnimatePresence>
                      {provider && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.8, x: 6 }}
                          animate={{ opacity: 1, scale: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="mr-1 block whitespace-nowrap rounded-lg bg-primary-50 px-2 py-1 text-[11px] font-semibold text-primary-700 dark:bg-primary-500/15 dark:text-primary-300"
                        >
                          {provider}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  }
                  className={provider ? 'pr-24' : undefined}
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-300">
                  Password
                </label>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(v) => {
                    setPassword(v);
                    setError(null);
                  }}
                  placeholder="••••••••"
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
              </div>

              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-300 dark:hover:text-primary-200"
                aria-expanded={showAdvanced}
              >
                <Server className="h-4 w-4" />
                Server settings
                <motion.span animate={{ rotate: showAdvanced ? 180 : 0 }}>
                  <ChevronDown className="h-4 w-4" />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {showAdvanced && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 rounded-2xl bg-ink-100/70 p-4 dark:bg-white/5">
                      <div className="grid grid-cols-[1fr_5.5rem] gap-3">
                        <Input
                          aria-label="IMAP host"
                          value={server.imapHost}
                          onChange={(v) => setServer({ ...server, imapHost: v })}
                          placeholder="imap.example.com"
                        />
                        <Input
                          aria-label="IMAP port"
                          inputMode="numeric"
                          value={server.imapPort}
                          onChange={(v) => setServer({ ...server, imapPort: v })}
                          placeholder="993"
                        />
                      </div>
                      <div className="grid grid-cols-[1fr_5.5rem] gap-3">
                        <Input
                          aria-label="SMTP host"
                          value={server.smtpHost}
                          onChange={(v) => setServer({ ...server, smtpHost: v })}
                          placeholder="smtp.example.com"
                        />
                        <Input
                          aria-label="SMTP port"
                          inputMode="numeric"
                          value={server.smtpPort}
                          onChange={(v) => setServer({ ...server, smtpPort: v })}
                          placeholder="587"
                        />
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
                  </motion.div>
                )}
              </AnimatePresence>

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

              <Button type="submit" size="lg" loading={isConnecting} className="group w-full">
                {isConnecting ? 'Connecting…' : 'Sign in'}
                {!isConnecting && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-ink-400">
              <span className="h-px flex-1 bg-ink-200 dark:bg-white/10" />
              or
              <span className="h-px flex-1 bg-ink-200 dark:bg-white/10" />
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => (window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/google`)}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50 dark:border-white/10 dark:bg-ink-900 dark:text-ink-100 dark:hover:bg-ink-800"
              >
                {GOOGLE_SVG}
                <span>Continue with Google</span>
              </button>

              <button
                type="button"
                onClick={() => (window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/facebook`)}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50 dark:border-white/10 dark:bg-ink-900 dark:text-ink-100 dark:hover:bg-ink-800"
              >
                {FACEBOOK_SVG}
                <span>Continue with Facebook</span>
              </button>
            </div>

            <div className="space-y-3 mt-4">
              <button
                type="button"
                onClick={() => {
                  fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/app-version/check`)
                    .then(response => response.json())
                    .then(data => {
                      toast.success(`App version ${data.version} available`);
                      if (data.needsUpdate) {
                        toast('New features and bug fixes available! Click OK to update.', {
                          duration: 10000,
                          action: {
                            label: 'Update Now',
                            onClick: () => {
                              window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/app-version/update`;
                            }
                          }
                        });
                      }
                    })
                    .catch(error => {
                      console.error('Failed to check app version:', error);
                      toast.error('Could not check for updates');
                    });
                }}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100 dark:border-primary-500/30 dark:bg-primary-900/50 dark:text-primary-300 dark:hover:bg-primary-800/50"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.316 2A8.001 8.001 0 008.002 12h1.5m-1.5-1.5H20v5h-5.5M4 9h3m13-6h5a2 2 0 012 2v10a2 2 0 01-2 2h-5M4 5h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2z" />
                </svg>
                <span>Check for App Updates</span>
              </button>
            </div>

            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => {
                startDemo(DEMO_ACCOUNT, DEMO_EMAILS);
                toast('Exploring the demo inbox', { icon: '✨' });
              }}
            >
              <Sparkles className="h-4 w-4 text-primary-500" />
              Try the demo
            </Button>
          </motion.div>

          <p className="mt-6 text-center text-xs text-ink-500 dark:text-ink-400">
            Supports IMAP & SMTP · Gmail · Outlook · iCloud · Yahoo
          </p>
        </motion.div>
      </div>
    </div>
  );
};
