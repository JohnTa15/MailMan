import { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useAppStore } from '../store/appStore';
import { emailService } from '../services/emailService';
import { authService } from '../services/authService';
import { apiErrorMessage } from '../lib/api';
import { Email } from '../types';

/** The view the list shows, as the server understands it */
function currentQuery() {
  const { selectedFolder, selectedMailboxId, searchQuery } = useAppStore.getState();
  return { folder: selectedFolder, accountId: selectedMailboxId, search: searchQuery };
}

const sameQuery = (a: ReturnType<typeof currentQuery>, b: ReturnType<typeof currentQuery>) =>
  a.folder === b.folder && a.accountId === b.accountId && a.search.trim() === b.search.trim();

async function refreshCounts() {
  try {
    useAppStore.getState().setCounts(await emailService.counts());
  } catch {
    // The numbers are a nicety; the list still works without them
  }
}

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
      if (opts.sync) {
        const { errors } = await emailService.sync();
        for (const e of errors) toast.error(`${e.mailbox}: ${e.message}`, { id: `sync-${e.mailbox}` });
      }
      const query = currentQuery();
      const { emails, hasMore } = await emailService.getEmails(query);
      // The user may have switched folders while this was loading
      if (sameQuery(query, currentQuery())) setEmails(emails, { page: 1, hasMore });
      void refreshCounts();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not load your mail'));
    } finally {
      setLoading(false);
    }
  }, [isDemo]);

  /** Loads the next page of older messages for the current view. */
  const loadMore = useCallback(async () => {
    const { hasMore, isLoadingMore, isLoading, page, appendEmails, setLoadingMore } = useAppStore.getState();
    if (isDemo || !hasMore || isLoadingMore || isLoading) return;
    setLoadingMore(true);
    try {
      const query = currentQuery();
      const next = await emailService.getEmails({ ...query, page: page + 1 });
      if (sameQuery(query, currentQuery())) appendEmails(next.emails, { page: page + 1, hasMore: next.hasMore });
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not load more messages'));
    } finally {
      setLoadingMore(false);
    }
  }, [isDemo]);

  /** Quietly picks up mail the server synced in the background. */
  const poll = useCallback(async () => {
    const { isLoading, mergeEmails, mailboxes } = useAppStore.getState();
    if (isDemo || isLoading) return;
    try {
      const query = currentQuery();
      const { emails } = await emailService.getEmails(query);
      if (sameQuery(query, currentQuery())) mergeEmails(emails);
      void refreshCounts();
      // While older mail is still downloading, keep the progress current
      if (mailboxes.some((m) => m.syncComplete === false)) {
        const { user, mailboxes: fresh } = await authService.me();
        useAppStore.getState().setUser(user);
        useAppStore.getState().setMailboxes(fresh);
      }
    } catch {
      // Try again next time
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
        void refreshCounts();
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
    async (draft: { accountId?: string; to: string; subject: string; body: string; attachments: File[] }) => {
      const { mailboxes, addEmail } = useAppStore.getState();
      const from = mailboxes.find((m) => m.id === draft.accountId) || mailboxes[0];
      if (!isDemo) {
        await emailService.sendEmail(draft);
      } else {
        await new Promise((r) => setTimeout(r, 900));
      }
      addEmail({
        id: `local-${Date.now()}`,
        accountId: from?.id || '',
        subject: draft.subject || '(No Subject)',
        from: from?.email || '',
        fromName: from?.displayName || undefined,
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

  /** Refreshes the signed-in user and their mailboxes. */
  const loadSession = useCallback(async () => {
    if (isDemo) return;
    try {
      const { user, mailboxes } = await authService.me();
      const { setUser, setMailboxes } = useAppStore.getState();
      setUser(user);
      setMailboxes(mailboxes);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not load your account'));
    }
  }, [isDemo]);

  return { refresh, loadMore, poll, loadSession, toggleStar, toggleRead, markRead, archive, restore, remove, send };
}
