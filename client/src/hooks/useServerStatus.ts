import { useCallback, useEffect, useState } from 'react';
import { authService } from '../services/authService';
import { apiErrorMessage } from '../lib/api';
import { useAppStore } from '../store/appStore';
import { ServerStatus } from '../types';

/** What the server offers (providers, whether anyone signed up yet); reloads when the server changes. */
export function useServerStatus() {
  const serverUrl = useAppStore((s) => s.serverUrl);
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStatus(await authService.status());
    } catch (err) {
      setStatus(null);
      setError(apiErrorMessage(err, 'Cannot reach the Mailman server.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, serverUrl]);

  return { status, error, loading, reload: load };
}
