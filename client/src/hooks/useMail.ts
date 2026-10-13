import { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useAppStore } from '../store/appStore';
import { emailService } from '../services/emailService';
import { apiErrorMessage } from '../lib/api';
import { Email } from '../types';

/**
 * Mail actions that update the UI immediately and then persist to the
 * server, rolling back if the server refuses. In demo mode they stay local.
 */
export function useMail() {
  const isDemo = useAppStore((s) => s.isDemo);

  const refresh = useCallback(async (opts: { sync?: boolean } = {}) => {
    const { setEmails, setLoading } = useAppStore.getState();
    if (isDemo) {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 700));
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (opts.sync) await emailService.sync();
      setEmails(await emailService.getEmails());
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not load your mail'));
    } finally {
      setLoading(false);
    }
  }, [isDemo]);

  const update = useCallback(
    async (email: Email, changes: Partial<Pick<Email, 'isRead' | 'isStarred' | 'isImportant' | 'folder'>>) => {
      const { patchEmail } = useAppStore.getState();
      const previous = Object.fromEntries(
        Object.keys(changes).map((k) => [k, email[k as keyof Email]])
      ) as Partial<Email>;
      patchEmail(email.id, changes);
      if (isDemo) return;
      try {
        await emailService.updateEmail(email.id, changes);
      } catch (error) {
        patchEmail(email.id, previous);
        toast.error(apiErrorMessage(error, 'Could not update the message'));
      }
    },
    [isDemo]
  );

  const toggleStar = useCallback((email: Email) => update(email, { isStarred: !email.isStarred }), [update]);
  const toggleRead = useCallback((email: Email) => update(email, { isRead: !email.isRead }), [update]);
  const markRead = useCallback((email: Email) => (email.isRead ? undefined : update(email, { isRead: true })), [update]);

  const moveTo = useCallback(
    async (email: Email, folder: string, label: string) => {
      const { selectedEmailId, selectEmail } = useAppStore.getState();
      if (selectedEmailId === email.id) selectEmail(null);
      await update(email, { folder });
      toast.success(label, {
        id: `move-${email.id}`,
        icon: folder === 'trash' ? '🗑️' : '📥',
      });
    },
    [update]
  );

  const archive = useCallback((email: Email) => moveTo(email, 'archive', 'Archived'), [moveTo]);
  const restore = useCallback((email: Email) => moveTo(email, 'inbox', 'Moved to inbox'), [moveTo]);

  const remove = useCallback(
    async (email: Email) => {
      if (email.folder !== 'trash') return moveTo(email, 'trash', 'Moved to trash');
      const { removeEmail, addEmail } = useAppStore.getState();
      removeEmail(email.id);
      if (isDemo) return;
      try {
        await emailService.deleteEmail(email.id);
      } catch (error) {
        addEmail(email);
        toast.error(apiErrorMessage(error, 'Could not delete the message'));
      }
    },
    [isDemo, moveTo]
  );

  const send = useCallback(
    async (draft: { to: string; subject: string; body: string; attachments: File[] }) => {
      const { account, addEmail } = useAppStore.getState();
      if (!isDemo) {
        await emailService.sendEmail(draft);
      } else {
        await new Promise((r) => setTimeout(r, 900));
      }
      addEmail({
        id: `local-${Date.now()}`,
        accountId: account?.id || '',
        subject: draft.subject || '(No Subject)',
        from: account?.email || '',
        fromName: account?.displayName,
        to: draft.to,
        date: new Date().toISOString(),
        preview: draft.body.replace(/\s+/g, ' ').trim().slice(0, 200),
        body: draft.body,
        isRead: true,
        isStarred: false,
        isImportant: false,
        labels: [],
        attachments: [],
        folder: 'sent',
      });
    },
    [isDemo]
  );

  return { refresh, toggleStar, toggleRead, markRead, archive, restore, remove, send };
}
