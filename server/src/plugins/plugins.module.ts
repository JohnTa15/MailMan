import { Module, Global } from '@nestjs/common';
import { PluginRegistryService } from './plugin-registry.service';
import { PluginsController } from './plugins.controller';

@Global()
@Module({
  providers: [PluginRegistryService],
  controllers: [PluginsController],
  exports: [PluginRegistryService],
})
export class PluginsModule {}
