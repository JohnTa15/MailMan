import { Injectable, Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { MailmanPlugin, SendEmailContext, SendEmailResult } from '../plugin.interface';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Built-in Email Templates Plugin
 *
 * Allows users to save and reuse email templates.
 * Templates stored as JSON files in the data directory.
 */
@Injectable()
export class TemplatesPlugin implements MailmanPlugin {
  private readonly logger = new Logger(TemplatesPlugin.name);
  private templatesDir: string;

  id = 'mailman-plugin-templates';
  name = 'Email Templates';
  version = '1.0.0';
  description = 'Save, manage, and reuse email templates with variable substitution.';
  author = 'Mailman Contributors';

  async onInit(app: INestApplication) {
    this.templatesDir = process.env.TEMPLATES_DIR || path.join(process.cwd(), 'data', 'templates');
    if (!fs.existsSync(this.templatesDir)) {
      fs.mkdirSync(this.templatesDir, { recursive: true });
    }

    // Register template management routes
    const httpAdapter = app.getHttpAdapter();
    const instance = httpAdapter.getInstance();

    // GET /api/plugins/templates - list all templates
    httpAdapter.get('/api/plugins/templates', (_req: any, res: any) => {
      try {
        const files = fs.readdirSync(this.templatesDir).filter((f) => f.endsWith('.json'));
        const templates = files.map((f) => {
          const data = JSON.parse(fs.readFileSync(path.join(this.templatesDir, f), 'utf-8'));
          return { id: f.replace('.json', ''), ...data };
        });
        res.json(templates);
      } catch (err) {
        res.status(500).json({ error: 'Failed to load templates' });
      }
    });

    // POST /api/plugins/templates/:id - save a template
    httpAdapter.post('/api/plugins/templates/:id', (req: any, res: any) => {
      try {
        const filePath = path.join(this.templatesDir, `${req.params.id}.json`);
        fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2));
        res.json({ success: true, id: req.params.id });
      } catch (err) {
        res.status(500).json({ error: 'Failed to save template' });
      }
    });

    // DELETE /api/plugins/templates/:id - delete a template
    httpAdapter.delete('/api/plugins/templates/:id', (req: any, res: any) => {
      try {
        const filePath = path.join(this.templatesDir, `${req.params.id}.json`);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: 'Failed to delete template' });
      }
    });

    this.logger.log('Templates plugin initialized');
  }

  async beforeSendEmail(ctx: SendEmailContext): Promise<SendEmailContext> {
    // If metadata contains a template ID, apply it
    const templateId = ctx.metadata['templateId'] as string | undefined;
    if (templateId) {
      const filePath = path.join(this.templatesDir, `${templateId}.json`);
      if (fs.existsSync(filePath)) {
        try {
          const template = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          const vars = (ctx.metadata['templateVars'] || {}) as Record<string, string>;
          ctx.subject = this.interpolate(template.subject || ctx.subject, vars);
          ctx.textBody = this.interpolate(template.textBody || ctx.textBody, vars);
          if (template.htmlBody) {
            ctx.htmlBody = this.interpolate(template.htmlBody, vars);
          }
        } catch (err) {
          this.logger.error(`Failed to apply template ${templateId}:`, err);
        }
      }
    }
    return ctx;
  }

  private interpolate(text: string, vars: Record<string, string>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
  }

  getClientConfig() {
    return {
      enabled: true,
      features: ['save-template', 'variable-substitution', 'template-list'],
    };
  }
}
