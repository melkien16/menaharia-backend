import { ConfigService } from '@nestjs/config';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { configureApp } from './app.setup';

describe('configureApp', () => {
  it('configures the application bootstrap features', () => {
    const configService = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, unknown> = {
          'app.name': 'Menaharia API',
          'app.env': 'development',
          'cors.origin': 'http://localhost:3000',
          'cors.credentials': true,
        };

        return values[key];
      }),
      get: jest.fn((key: string) => (key === 'swagger.enabled' ? true : undefined)),
    } as unknown as ConfigService;

    const logger = {} as Logger;
    const app = {
      useLogger: jest.fn(),
      useGlobalFilters: jest.fn(),
      useGlobalInterceptors: jest.fn(),
      use: jest.fn(),
      enableCors: jest.fn(),
      enableVersioning: jest.fn(),
      useGlobalPipes: jest.fn(),
      get: jest.fn((token) => {
        if (token === Logger) {
          return logger;
        }

        if (token === ConfigService) {
          return configService;
        }

        return undefined;
      }),
    } as any;

    const createDocumentSpy = jest
      .spyOn(SwaggerModule, 'createDocument')
      .mockReturnValue({} as any);
    const setupSpy = jest.spyOn(SwaggerModule, 'setup').mockImplementation(() => undefined as any);

    configureApp(app);

    expect(app.useLogger).toHaveBeenCalledWith(logger);
    expect(app.useGlobalFilters).toHaveBeenCalledWith(expect.any(AllExceptionsFilter));
    expect(app.useGlobalInterceptors).toHaveBeenCalledWith(expect.any(ResponseInterceptor));
    expect(app.use).toHaveBeenCalledTimes(3);
    expect(app.enableCors).toHaveBeenCalledWith({
      origin: 'http://localhost:3000',
      credentials: true,
    });
    expect(app.enableVersioning).toHaveBeenCalledWith({ type: VersioningType.URI });
    expect(app.useGlobalPipes).toHaveBeenCalledWith(expect.any(ValidationPipe));
    expect(createDocumentSpy).toHaveBeenCalledTimes(1);
    expect(setupSpy).toHaveBeenCalledWith('/docs', app, {});

    createDocumentSpy.mockRestore();
    setupSpy.mockRestore();
  });
});
