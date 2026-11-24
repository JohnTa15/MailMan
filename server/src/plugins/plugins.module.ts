import { Module, Global } from '@nestjs/common';
import { PluginRegistryService } from './plugin-registry.service';
import { PluginsController } from './plugins.controller';
import { UsersModule } from '../users/users.module';

@Global()
@Module({
  imports: [UsersModule],
  providers: [PluginRegistryService],
  controllers: [PluginsController],
  exports: [PluginRegistryService],
})
export class PluginsModule {}
