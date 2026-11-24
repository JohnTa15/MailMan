import { FC, FormEvent, useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Eye, FolderInput, KeyRound, PenLine, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDistanceToNowStrict } from 'date-fns';
import { useAppStore } from '../../store/appStore';
import { AiActivity, AiKey, AiScope, aiService } from '../../services/authService';
import { apiErrorMessage, serverOrigin } from '../../lib/api';
import { cn } from '../../lib/cn';
import { Badge } from '../ui/Badge';
import { Button, IconButton } from '../ui/Button';
import { Input } from '../ui/Input';
import { CopyField, Section } from './shared';

const SCOPES: { id: AiScope; label: string; text: string; icon: typeof Eye; required?: boolean }[] = [
  { id: 'read', label: 'Read', text: 'Search and read your mail', icon: Eye, required: true },
  { id: 'organize', label: 'Organize', text: 'Mark read, star, move to archive, spam or trash', icon: FolderInput },
  { id: 'drafts', label: 'Write drafts', text: 'Save replies in Drafts for you to send', icon: PenLine },
];

const ago = (date: string) => formatDistanceToNowStrict(new Date(date), { addSuffix: true });

/** Keys that let an AI assistant (Claude, Cursor, ...) work with your mail over MCP. */
export const AiTab: FC = () => {
  const isDemo = useAppStore((s) => s.isDemo);
  const [keys, setKeys] = useState<AiKey[]>([]);
  const [activity, setActivity] = useState<AiActivity[]>([]);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<AiScope[]>(['read', 'drafts']);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ name: string; key: string } | null>(null);
  const mcpUrl = `${serverOrigin()}/api/mcp`;

  const load = useCallback(async () => {
    if (isDemo) return;
    try {
      const [k, a] = await Promise.all([aiService.keys(), aiService.activity()]);
      setKeys(k);
      setActivity(a);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not load AI keys'));
    }
  }, [isDemo]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const result = await aiService.createKey(name.trim() || 'AI assistant', scopes);
      setCreated({ name: result.name, key: result.key });
      setName('');
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not create the key'));
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (key: AiKey) => {
    if (!window.confirm(`Revoke "${key.name}"? Assistants using it lose access right away.`)) return;
    try {
      await aiService.revokeKey(key.id);
      if (created && key.prefix && created.key.startsWith(key.prefix)) setCreated(null);
      toast.success('Key revoked');
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not revoke the key'));
    }
  };

  const toggle = (id: AiScope) => setScopes((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  if (isDemo) {
    return (
      <Section title="AI access" description="Connect an AI assistant to your mail.">
        <p className="text-sm text-ink-500">AI access needs a Mailman server. Sign in to your server to create a key.</p>
      </Section>
    );
  }

  return (
    <>
      <Section
        title="AI access"
        description="Let an AI assistant such as Claude or Cursor search, read and tidy your mail, and write drafts, through MCP."
      >
        <div className="mb-5 flex gap-3 rounded-2xl bg-primary-50 p-4 text-sm text-primary-900 dark:bg-primary-500/10 dark:text-primary-100">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            An AI key can never send email. Replies it writes wait in <b>Drafts</b> for you to read, edit and send. Emails can contain
            instructions aimed at AI, so only give an assistant the access it needs.
          </p>
        </div>

        <form onSubmit={create} className="space-y-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink-200/70 dark:bg-ink-800/60 dark:shadow-none dark:ring-white/10">
          <Input aria-label="Key name" placeholder="Name, e.g. Claude on my laptop" value={name} onChange={setName} maxLength={60} />
          <div className="grid gap-2 sm:grid-cols-3">
            {SCOPES.map(({ id, label, text, icon: Icon, required }) => {
              const on = scopes.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  disabled={required}
                  onClick={() => toggle(id)}
                  className={cn(
                    'rounded-xl p-3 text-left ring-1 transition-colors',
                    on
                      ? 'bg-primary-50 ring-primary-300 dark:bg-primary-500/15 dark:ring-primary-400/40'
                      : 'ring-ink-200 hover:bg-ink-50 dark:ring-white/10 dark:hover:bg-white/5'
                  )}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <Icon className="h-4 w-4" />
                    {label}
                    {required && <span className="text-[10px] font-medium uppercase text-ink-400">always</span>}
                  </span>
                  <span className="mt-1 block text-xs text-ink-500 dark:text-ink-400">{text}</span>
                </button>
              );
            })}
          </div>
          <Button type="submit" disabled={creating}>
            <KeyRound className="h-4 w-4" />
            {creating ? 'Creating…' : 'Create key'}
          </Button>
        </form>

        <AnimatePresence>
          {created && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="mt-4 space-y-3 rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-500/10">
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                  Copy the key for “{created.name}” now. It is not shown again.
                </p>
                <CopyField label="AI key" value={created.key} />
                <ConnectHelp url={mcpUrl} apiKey={created.key} />
                <Button size="sm" variant="secondary" onClick={() => setCreated(null)}>
                  Done
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Section>

      <Section title="Your keys">
        {keys.length === 0 ? (
          <p className="text-sm text-ink-500 dark:text-ink-400">No keys yet.</p>
        ) : (
          <div className="space-y-2">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-card ring-1 ring-ink-200/70 dark:bg-ink-800/60 dark:shadow-none dark:ring-white/10">
                <Bot className="h-5 w-5 shrink-0 text-primary-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{k.name}</p>
                  <p className="text-xs text-ink-500 dark:text-ink-400">
                    <span className="font-mono">{k.prefix}…</span> · {k.lastUsedAt ? `used ${ago(k.lastUsedAt)}` : 'never used'}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {k.scopes.map((s) => (
                      <Badge key={s}>{SCOPES.find((x) => x.id === s)?.label || s}</Badge>
                    ))}
                  </div>
                </div>
                <IconButton label={`Revoke ${k.name}`} tone="danger" onClick={() => revoke(k)}>
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">MCP server address</p>
          <CopyField label="MCP server address" value={mcpUrl} />
        </div>
      </Section>

      <Section title="Recent activity" description="What your assistants did in the last 30 days.">
        {activity.length === 0 ? (
          <p className="text-sm text-ink-500 dark:text-ink-400">Nothing yet.</p>
        ) : (
          <ul className="divide-y divide-ink-200/70 rounded-2xl bg-white text-sm shadow-card ring-1 ring-ink-200/70 dark:divide-white/5 dark:bg-ink-800/60 dark:shadow-none dark:ring-white/10">
            {activity.map((a) => (
              <li key={a.id} className="flex items-start gap-3 px-4 py-2.5">
                <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', a.ok ? 'bg-emerald-500' : 'bg-rose-500')} />
                <div className="min-w-0 flex-1">
                  <p className="break-words">{a.summary}</p>
                  <p className="text-xs text-ink-500 dark:text-ink-400">
                    {a.keyName} · {ago(a.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
};

/** How to plug the key into common MCP clients. */
const ConnectHelp: FC<{ url: string; apiKey: string }> = ({ url, apiKey }) => {
  const [tab, setTab] = useState<'claude-code' | 'json'>('claude-code');
  const command = `claude mcp add --transport http mailman ${url} --header "Authorization: Bearer ${apiKey}"`;
  const json = JSON.stringify(
    { mcpServers: { mailman: { type: 'http', url, headers: { Authorization: `Bearer ${apiKey}` } } } },
    null,
    2
  );
  return (
    <div>
      <div className="mb-2 flex gap-1">
        {(
          [
            ['claude-code', 'Claude Code'],
            ['json', 'Other apps (JSON)'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'rounded-lg px-2.5 py-1 text-xs font-semibold',
              tab === id ? 'bg-white text-ink-900 shadow-sm dark:bg-white/10 dark:text-white' : 'text-emerald-800/80 dark:text-emerald-200/70'
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'claude-code' ? (
        <CopyField label="Claude Code command" value={command} />
      ) : (
        <CopyField label="MCP JSON config" value={json} className="[&_code]:whitespace-pre" />
      )}
    </div>
  );
};
