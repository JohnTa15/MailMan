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
import { UpdateButton } from '../ui/UpdateButton';

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
          <UpdateButton autoCheck className="mt-4" />
        </motion.div>
      </div>
    </div>
  );
};
