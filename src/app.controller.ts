import { Controller, Get, VERSION_NEUTRAL, Version } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllowAnonymous } from './common/authorization/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  @Version(VERSION_NEUTRAL)
  @AllowAnonymous()
  getRoot() {
    const name = this.configService.getOrThrow<string>('app.name');
    const env = this.configService.getOrThrow<string>('app.env');

    return {
      name,
      env,
      status: 'ok',
      docsPath: env === 'production' ? null : '/docs',
    };
  }
}
