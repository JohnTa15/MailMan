import { FC, ReactNode, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, ChevronDown, ExternalLink, XCircle } from 'lucide-react';
import { adminService, Integrations, ProviderIntegration } from '../../services/authService';
import { apiErrorMessage } from '../../lib/api';
import { cn } from '../../lib/cn';
import { Badge } from '../ui/Badge';
import { GoogleLogo, MicrosoftLogo } from '../mailboxes/ProviderLogos';
import { CopyField, Section } from './shared';

const RESTART = 'cd ~/MailMan && sudo docker compose up -d';

/** Admin view: is Google/Microsoft sign-in set up, and if not, exactly what is missing. */
export const IntegrationsTab: FC = () => {
  const [data, setData] = useState<Integrations | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminService.integrations().then(setData, (e) => setError(apiErrorMessage(e, 'Could not load integrations')));
  }, []);

  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  if (!data) return <div className="skeleton h-40 w-full rounded-2xl" />;

  return (
    <>
      <Section
        title="Integrations"
        description="Sign in with Google or Microsoft works once the server has an app registration for it. Secrets go in the server's .env file, never in this app."
      >
        {(!data.publicUrlSet || !data.publicUrlSecure) && (
          <div className="mb-4 flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 space-y-2">
              {!data.publicUrlSecure ? (
                <p>Google and Microsoft only accept https addresses. Put the server behind HTTPS, then set PUBLIC_URL.</p>
              ) : (
                <p>PUBLIC_URL is not set, so the redirect address below is guessed from this request. Set it in .env so it never changes:</p>
              )}
              <CopyField label="PUBLIC_URL line" value={`PUBLIC_URL=${data.publicUrl}`} />
            </div>
          </div>
        )}
        <div className="space-y-4">
          {data.providers.map((p) => (
            <ProviderCard key={p.id} provider={p} />
          ))}
        </div>
        <p className="mt-5 text-xs text-ink-500 dark:text-ink-400">After editing .env on the server, apply it with:</p>
        <CopyField className="mt-2" label="restart command" value={RESTART} />
      </Section>
    </>
  );
};

const ProviderCard: FC<{ provider: ProviderIntegration }> = ({ provider: p }) => {
  const [open, setOpen] = useState(!p.configured);
  const Logo = p.id === 'google' ? GoogleLogo : MicrosoftLogo;
  return (
    <div className="rounded-2xl bg-white shadow-card ring-1 ring-ink-200/70 dark:bg-ink-800/60 dark:shadow-none dark:ring-white/10">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-4 py-3 text-left" aria-expanded={open}>
        <Logo className="h-6 w-6" />
        <span className="flex-1 font-medium">{p.label}</span>
        <Badge variant={p.configured ? 'success' : 'warning'}>{p.configured ? 'Ready' : 'Not set up'}</Badge>
        <ChevronDown className={cn('h-4 w-4 text-ink-400 transition-transform', open && 'rotate-180')} />
      </button>
      <motion.div initial={false} animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }} className="overflow-hidden">
        <div className="space-y-4 border-t border-ink-200/70 px-4 py-4 text-sm dark:border-white/10">
          <div className="space-y-1.5">
            <Check ok={p.clientIdSet}>{p.clientIdVar}</Check>
            <Check ok={p.clientSecretSet}>{p.clientSecretVar}</Check>
            {p.tenant && (
              <p className="text-xs text-ink-500 dark:text-ink-400">
                Tenant: <span className="font-mono">{p.tenant}</span>
                {p.tenant === 'common' && ' (work, school and personal accounts)'}
              </p>
            )}
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">Redirect URI</p>
            <CopyField label={`${p.label} redirect URI`} value={p.redirectUri} />
          </div>
          <ol className="list-decimal space-y-2 pl-5 text-ink-700 dark:text-ink-300">
            {(p.id === 'microsoft' ? microsoftSteps : googleSteps)(p)}
          </ol>
        </div>
      </motion.div>
    </div>
  );
};

const Check: FC<{ ok: boolean; children: ReactNode }> = ({ ok, children }) => (
  <p className="flex items-center gap-2">
    {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-rose-500" />}
    <span className="font-mono text-xs">{children}</span>
    <span className="text-xs text-ink-500">{ok ? 'set' : 'missing'}</span>
  </p>
);

const Link: FC<{ href: string; children: ReactNode }> = ({ href, children }) => (
  <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-medium text-primary-600 hover:underline dark:text-primary-300">
    {children}
    <ExternalLink className="h-3 w-3" />
  </a>
);

const microsoftSteps = (p: ProviderIntegration) => [
  <li key="1">
    Open <Link href="https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade">App registrations</Link> and
    choose <b>New registration</b>.
  </li>,
  <li key="2">
    Supported account types: <b>Accounts in any organizational directory and personal Microsoft accounts</b>. Other choices
    reject Outlook.com/Hotmail sign-ins.
  </li>,
  <li key="3">
    Redirect URI: platform <b>Web</b>, then paste the redirect URI above exactly.
  </li>,
  <li key="4">
    <b>Certificates &amp; secrets</b> → New client secret. Copy its <b>Value</b> (not the Secret ID) into{' '}
    <span className="font-mono text-xs">{p.clientSecretVar}</span>.
  </li>,
  <li key="5">
    <b>API permissions</b> → Add → Microsoft Graph → Delegated: <span className="font-mono text-xs">offline_access, IMAP.AccessAsUser.All, SMTP.Send</span>{' '}
    (openid, email and profile are usually there already).
  </li>,
  <li key="6">
    From <b>Overview</b>, copy the <b>Application (client) ID</b> into <span className="font-mono text-xs">{p.clientIdVar}</span>, then restart.
  </li>,
  <li key="7" className="text-xs text-ink-500 dark:text-ink-400">
    Work or school mailboxes also need SMTP AUTH allowed by their Microsoft 365 admin to send mail.
  </li>,
];

const googleSteps = (p: ProviderIntegration) => [
  <li key="1">
    In <Link href="https://console.cloud.google.com/auth/branding">Google Auth Platform</Link>, set up the consent screen (External). Under{' '}
    <b>Audience</b>, choose <b>Publish app</b>: in Testing, Google signs people out every 7 days. The "unverified app" warning is fine for
    personal use.
  </li>,
  <li key="2">
    Under <b>Data access</b>, add the scope <span className="font-mono text-xs">https://mail.google.com/</span>.
  </li>,
  <li key="3">
    <b>Clients → Create client → Web application</b>, and add the redirect URI above under Authorized redirect URIs.
  </li>,
  <li key="4">
    Copy the client ID and secret into <span className="font-mono text-xs">{p.clientIdVar}</span> and{' '}
    <span className="font-mono text-xs">{p.clientSecretVar}</span>, then restart.
  </li>,
];
