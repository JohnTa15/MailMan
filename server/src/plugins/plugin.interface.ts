/**
 * Mailman Plugin System
 *
 * Every plugin implements this interface. Plugins are loaded at server startup
 * from the `plugins/` directory or registered programmatically.
 */

import type { INestApplication } from '@nestjs/common';

export interface PluginMeta {
  /** Unique plugin identifier, e.g. 'mailman-plugin-pgp' */
  id: string;
  /** Human-readable name */
  name: string;
  /** Semver version string */
  version: string;
  /** Short description shown in the admin UI */
  description: string;
  /** Plugin author */
  author?: string;
  /** URL to homepage / repo */
  homepage?: string;
  /** Minimum Mailman server version this plugin supports */
  minMailmanVersion?: string;
}

export interface PluginLifecycle {
  /** Called once when the plugin is loaded. Register modules, routes, hooks here. */
  onInit(app: INestApplication): Promise<void> | void;
  /** Called when the server is shutting down. Clean up resources. */
  onDestroy?(): Promise<void> | void;
  /** Called after all plugins have been initialized. Useful for cross-plugin communication. */
  onReady?(app: INestApplication): Promise<void> | void;
}

/** Hooks that plugins can tap into */
export interface PluginHooks {
  /** Intercept an email before it is sent via SMTP */
  beforeSendEmail?(context: SendEmailContext): Promise<SendEmailContext> | SendEmailContext;
  /** Called after an email has been sent successfully */
  afterSendEmail?(result: SendEmailResult): Promise<void> | void;
  /** Intercept emails after IMAP sync, before they are stored */
  onEmailSynced?(email: SyncedEmail): Promise<SyncedEmail> | SyncedEmail;
  /** Called when a new user account is created */
  onAccountCreated?(account: AccountInfo): Promise<void> | void;
  /** Called when a user authenticates */
  onUserLogin?(account: AccountInfo): Promise<void> | void;
  /** Add custom API routes under /api/plugins/<pluginId>/ */
  registerRoutes?(app: INestApplication): Promise<void> | void;
  /** Inject custom UI components (sent to client as config) */
  getClientConfig?(): Record<string, unknown>;
}

export interface MailmanPlugin extends PluginMeta, PluginLifecycle, PluginHooks {}

/* ---------- Supporting types ---------- */

export interface SendEmailContext {
  accountId: string;
  to: string;
  subject: string;
  textBody: string;
  htmlBody?: string;
  attachments: Array<{ filename: string; contentType: string; content: Buffer }>;
  headers: Record<string, string>;
  /** Plugins can set this to true to cancel sending */
  cancelled?: boolean;
  /** Plugins can add data here for other plugins to read */
  metadata: Record<string, unknown>;
}

export interface SendEmailResult {
  accountId: string;
  messageId: string;
  to: string;
  timestamp: Date;
}

export interface SyncedEmail {
  uid: number;
  subject: string;
  from: string;
  to: string[];
  date: Date;
  body: string;
  html?: string;
  flags: string[];
  folder: string;
  attachments: Array<{ filename: string; contentType: string; size: number }>;
  metadata: Record<string, unknown>;
}

export interface AccountInfo {
  id: string;
  email: string;
  type: string;
  displayName?: string;
}
