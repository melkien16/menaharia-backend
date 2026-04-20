import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>('app.port') || process.env.PORT || 4000;
  const nodeEnv = configService.getOrThrow<string>('app.env');

  await app.listen(port);
  console.log(`Application running on port ${port} [env: ${nodeEnv}]`);
}

bootstrap();
