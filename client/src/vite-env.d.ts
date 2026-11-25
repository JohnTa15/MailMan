/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface DesktopUpdateState {
  status: 'idle' | 'checking' | 'latest' | 'downloading' | 'ready' | 'error' | 'unsupported';
  version?: string;
  percent?: number;
  message?: string;
}

interface Window {
  electronAPI?: {
    store: {
      get: (key: string) => Promise<unknown>;
      set: (key: string, value: unknown) => Promise<void>;
    };
    platform: string;
    /** Built-in updates (Windows installer builds) */
    updates?: {
      state: () => Promise<DesktopUpdateState>;
      check: () => Promise<DesktopUpdateState>;
      install: () => Promise<void>;
      onState: (callback: (state: DesktopUpdateState) => void) => () => void;
    };
  };
  Capacitor?: {
    getPlatform?: () => string;
  };
}
