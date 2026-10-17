import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { MailmanPlugin, SendEmailContext, SendEmailResult, SyncedEmail, AccountInfo } from './plugin.interface';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class PluginRegistryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PluginRegistryService.name);
  private plugins: MailmanPlugin[] = [];
  private app: INestApplication | null = null;

  async onModuleInit() {
    await this.discoverAndLoadPlugins();
  }

  async onModuleDestroy() {
    for (const plugin of [...this.plugins].reverse()) {
      try {
        await plugin.onDestroy?.();
        this.logger.log(`Plugin destroyed: ${plugin.id}`);
      } catch (err) {
        this.logger.error(`Error destroying plugin ${plugin.id}:`, err);
      }
    }
  }

  /** Set the NestJS app reference so plugins can register routes */
  setApp(app: INestApplication) {
    this.app = app;
  }

  /** Initialize all loaded plugins */
  async initializeAll(app: INestApplication) {
    this.app = app;
    for (const plugin of this.plugins) {
      try {
        await plugin.onInit(app);
        this.logger.log(`Plugin initialized: ${plugin.id} v${plugin.version}`);
      } catch (err) {
        this.logger.error(`Failed to initialize plugin ${plugin.id}:`, err);
      }
    }
    // Fire onReady after all are initialized
    for (const plugin of this.plugins) {
      try {
        await plugin.onReady?.(app);
      } catch (err) {
        this.logger.error(`Plugin ${plugin.id} onReady failed:`, err);
      }
    }
  }

  /** Register a plugin programmatically (useful for built-in plugins) */
  register(plugin: MailmanPlugin) {
    if (this.plugins.find((p) => p.id === plugin.id)) {
      this.logger.warn(`Plugin ${plugin.id} already registered, skipping.`);
      return;
    }
    this.plugins.push(plugin);
    this.logger.log(`Plugin registered: ${plugin.id} v${plugin.version}`);
  }

  /** Unregister a plugin by ID */
  async unregister(pluginId: string) {
    const idx = this.plugins.findIndex((p) => p.id === pluginId);
    if (idx === -1) return;
    const plugin = this.plugins[idx];
    await plugin.onDestroy?.();
    this.plugins.splice(idx, 1);
    this.logger.log(`Plugin unregistered: ${pluginId}`);
  }

  /** Get all registered plugins */
  getPlugins(): ReadonlyArray<MailmanPlugin> {
    return this.plugins;
  }

  /** Get aggregated client configs from all plugins */
  getClientConfigs(): Record<string, Record<string, unknown>> {
    const configs: Record<string, Record<string, unknown>> = {};
    for (const plugin of this.plugins) {
      try {
        const cfg = plugin.getClientConfig?.();
        if (cfg) configs[plugin.id] = cfg;
      } catch {
        // skip
      }
    }
    return configs;
  }

  /* ---- Hook runners ---- */

  async runBeforeSendEmail(ctx: SendEmailContext): Promise<SendEmailContext> {
    let current = ctx;
    for (const plugin of this.plugins) {
      if (plugin.beforeSendEmail) {
        try {
          current = await plugin.beforeSendEmail(current);
          if (current.cancelled) break;
        } catch (err) {
          this.logger.error(`Plugin ${plugin.id} beforeSendEmail error:`, err);
        }
      }
    }
    return current;
  }

  async runAfterSendEmail(result: SendEmailResult): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.afterSendEmail) {
        try {
          await plugin.afterSendEmail(result);
        } catch (err) {
          this.logger.error(`Plugin ${plugin.id} afterSendEmail error:`, err);
        }
      }
    }
  }

  async runOnEmailSynced(email: SyncedEmail): Promise<SyncedEmail> {
    let current = email;
    for (const plugin of this.plugins) {
      if (plugin.onEmailSynced) {
        try {
          current = await plugin.onEmailSynced(current);
        } catch (err) {
          this.logger.error(`Plugin ${plugin.id} onEmailSynced error:`, err);
        }
      }
    }
    return current;
  }

  async runOnAccountCreated(account: AccountInfo): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.onAccountCreated) {
        try {
          await plugin.onAccountCreated(account);
        } catch (err) {
          this.logger.error(`Plugin ${plugin.id} onAccountCreated error:`, err);
        }
      }
    }
  }

  async runOnUserLogin(account: AccountInfo): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.onUserLogin) {
        try {
          await plugin.onUserLogin(account);
        } catch (err) {
          this.logger.error(`Plugin ${plugin.id} onUserLogin error:`, err);
        }
      }
    }
  }

  /* ---- Discovery ---- */

  private async discoverAndLoadPlugins() {
    // 1. Load built-in plugins
    await this.loadBuiltInPlugins();

    // 2. Discover external plugins from PLUGINS_DIR or ./plugins
    const pluginsDir = process.env.PLUGINS_DIR || path.join(process.cwd(), 'plugins');
    if (!fs.existsSync(pluginsDir)) {
      this.logger.log(`No external plugins directory found at ${pluginsDir}`);
      return;
    }

    const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const pluginPath = path.join(pluginsDir, entry.name);
      try {
        const pkgPath = path.join(pluginPath, 'package.json');
        if (!fs.existsSync(pkgPath)) continue;

        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const mainFile = pkg.main || 'index.js';
        const mod = require(path.join(pluginPath, mainFile));
        const PluginClass = mod.default || mod;

        if (typeof PluginClass === 'function') {
          const instance = new PluginClass() as MailmanPlugin;
          this.register(instance);
        } else if (typeof PluginClass === 'object' && PluginClass.id) {
          this.register(PluginClass as MailmanPlugin);
        }
      } catch (err) {
        this.logger.error(`Failed to load plugin from ${pluginPath}:`, err);
      }
    }
  }

  private async loadBuiltInPlugins() {
    // Built-in plugins are registered directly in plugins.module.ts
    this.logger.log('Built-in plugin discovery complete.');
  }
}
