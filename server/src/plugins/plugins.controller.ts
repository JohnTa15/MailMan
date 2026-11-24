import { Controller, Get, Post, Delete, Param, UseGuards, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../users/admin.guard';
import { PluginRegistryService } from './plugin-registry.service';

@Controller('plugins')
@UseGuards(JwtAuthGuard)
export class PluginsController {
  constructor(private readonly registry: PluginRegistryService) {}

  /** List all installed plugins with their metadata */
  @Get()
  listPlugins() {
    return this.registry.getPlugins().map((p) => ({
      id: p.id,
      name: p.name,
      version: p.version,
      description: p.description,
      author: p.author,
      homepage: p.homepage,
    }));
  }

  /** Get aggregated client-side configuration from all plugins */
  @Get('config')
  getClientConfig() {
    return this.registry.getClientConfigs();
  }

  /** Disable/unregister a plugin at runtime (admins only: it affects every user) */
  @Delete(':id')
  @UseGuards(AdminGuard)
  async disablePlugin(@Param('id') id: string) {
    await this.registry.unregister(id);
    return { success: true, id };
  }
}
