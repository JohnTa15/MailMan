import { FC, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Paperclip, Send, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAppStore } from '../../store/appStore';
import { useMail } from '../../hooks/useMail';
import { apiErrorMessage } from '../../lib/api';
import { formatBytes } from '../../lib/format';
import { ComposeDraft } from '../../types';
import { Button, IconButton } from '../ui/Button';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ComposeModal: FC<{ draft: ComposeDraft }> = ({ draft }) => {
  const account = useAppStore((s) => s.account);
  const closeCompose = useAppStore((s) => s.closeCompose);
  const { send } = useMail();

  const [to, setTo] = useState(draft.to || '');
  const [subject, setSubject] = useState(draft.subject || '');
  const [body, setBody] = useState(draft.body || '');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const toRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (draft.to) {
      bodyRef.current?.focus();
      bodyRef.current?.setSelectionRange(0, 0);
    } else {
      toRef.current?.focus();
    }
  }, [draft.to]);

  const handleSend = async () => {
    const recipients = to.split(/[,;]/).map((r) => r.trim()).filter(Boolean);
    if (!recipients.length || !recipients.every((r) => EMAIL_RE.test(r))) {
      toast.error('Enter a valid recipient address');
      toRef.current?.focus();
      return;
    }

    setIsSending(true);
    try {
      await send({ to: recipients.join(', '), subject, body, attachments });
      setSent(true);
      toast.success('Message sent', { icon: '🚀' });
      setTimeout(closeCompose, 650);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Failed to send message'));
      setIsSending(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeCompose();
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const field =
    'w-full bg-transparent py-3 text-sm text-ink-900 placeholder-ink-400 outline-none dark:text-white dark:placeholder-ink-500';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6 lg:items-end lg:justify-end" onKeyDown={onKeyDown}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeCompose}
        className="absolute inset-0 bg-ink-950/25"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="New message"
        initial={{ opacity: 0, y: 60, scale: 0.94 }}
        animate={sent ? { opacity: 0, y: -40, scale: 0.9, transition: { duration: 0.45, ease: 'easeIn' } } : { opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 60, scale: 0.94, transition: { duration: 0.2 } }}
        transition={{ type: 'spring', stiffness: 360, damping: 30 }}
        className="relative flex h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-float ring-1 ring-ink-200/70 dark:bg-ink-900 dark:ring-white/10 sm:h-[min(640px,85vh)] sm:max-w-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between bg-brand-gradient px-5 py-3.5 text-white">
          <h2 className="font-semibold">{subject.trim() || 'New message'}</h2>
          <button
            onClick={closeCompose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-5">
          <div className="flex items-center gap-3 border-b border-ink-100 dark:border-white/5">
            <span className="w-14 text-sm text-ink-400">From</span>
            <span className="truncate py-3 text-sm text-ink-700 dark:text-ink-300">{account?.email}</span>
          </div>
          <label className="flex items-center gap-3 border-b border-ink-100 dark:border-white/5">
            <span className="w-14 text-sm text-ink-400">To</span>
            <input ref={toRef} type="email" multiple value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@example.com" className={field} />
          </label>
          <label className="flex items-center gap-3 border-b border-ink-100 dark:border-white/5">
            <span className="w-14 text-sm text-ink-400">Subject</span>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What's it about?" className={field} />
          </label>
          <textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write something wonderful…"
            className="min-h-0 flex-1 resize-none bg-transparent py-4 text-[15px] leading-relaxed text-ink-900 placeholder-ink-400 outline-none dark:text-white dark:placeholder-ink-500"
          />

          <AnimatePresence initial={false}>
            {attachments.length > 0 && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="flex flex-wrap gap-2 pb-3">
                  <AnimatePresence>
                    {attachments.map((file, idx) => (
                      <motion.div
                        key={`${file.name}-${file.lastModified}`}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-2 rounded-xl bg-ink-100 py-1.5 pl-3 pr-1.5 text-sm dark:bg-white/5"
                      >
                        <Paperclip className="h-3.5 w-3.5 text-ink-400" />
                        <span className="max-w-[160px] truncate">{file.name}</span>
                        <span className="text-xs text-ink-400">{formatBytes(file.size)}</span>
                        <button
                          onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                          aria-label={`Remove ${file.name}`}
                          className="rounded-md p-0.5 text-ink-400 hover:bg-ink-200 hover:text-ink-700 dark:hover:bg-white/10"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2 border-t border-ink-100 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-white/5">
          <Button onClick={handleSend} loading={isSending} className="group">
            {!isSending && (
              <motion.span animate={sent ? { x: 40, y: -30, opacity: 0 } : { x: 0, y: 0, opacity: 1 }} transition={{ duration: 0.4 }}>
                <Send className="h-4 w-4 transition-transform group-hover:-rotate-12" />
              </motion.span>
            )}
            {isSending ? 'Sending…' : 'Send'}
          </Button>
          <label>
            <IconButton label="Attach files" onClick={(e: React.MouseEvent) => (e.currentTarget.nextElementSibling as HTMLInputElement | null)?.click()}>
              <Paperclip className="h-[18px] w-[18px]" />
            </IconButton>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                setAttachments([...attachments, ...Array.from(e.target.files || [])]);
                e.target.value = '';
              }}
            />
          </label>
          <span className="ml-auto hidden text-xs text-ink-400 sm:block">Ctrl + Enter to send</span>
        </div>
      </motion.div>
    </div>
  );
};
