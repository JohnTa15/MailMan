import { authService, OAuthPoll } from '../services/authService';
import { OAuthProviderId } from '../types';

export type OAuthDone = Extract<OAuthPoll, { status: 'done' }>;

const POLL_MS = 1500;
const TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Runs Google/Microsoft sign-in in a separate window (the system browser
 * in the desktop and Android apps) and waits for the server to finish it.
 * Call straight from a click so the browser allows the window.
 */
export async function runOAuth(
  provider: OAuthProviderId,
  mode: 'signin' | 'connect',
  opts: { invite?: string; signal?: AbortSignal } = {}
): Promise<OAuthDone> {
  // Open the window now, while the click still counts as user-initiated;
  // the desktop app refuses blank windows, and the link opens below instead
  let win: Window | null = null;
  try {
    win = window.open('about:blank', '_blank');
    if (win) win.opener = null;
  } catch {
    win = null;
  }

  let pollId: string;
  try {
    const started = await authService.oauthStart(provider, mode, opts.invite);
    pollId = started.pollId;
    if (win && !win.closed) win.location.href = started.url;
    else window.open(started.url, '_blank', 'noopener');
  } catch (err) {
    win?.close();
    throw err;
  }

  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    if (opts.signal?.aborted) {
      win?.close();
      throw new DOMException('Cancelled', 'AbortError');
    }
    const result = await authService.oauthPoll(pollId);
    if (result.status === 'done') return result;
    if (result.status === 'error') throw new Error(result.message);
  }
  throw new Error('Sign-in timed out. Try again.');
}
