import { ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';

describe('AppController', () => {
  const configService = {
    getOrThrow: jest.fn(),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the development root response', () => {
    const controller = new AppController(configService);
    jest.spyOn(configService, 'getOrThrow').mockImplementation((key: string) => {
      if (key === 'app.name') {
        return 'Menaharia API' as any;
      }

      if (key === 'app.env') {
        return 'development' as any;
      }

      return undefined as any;
    });

    expect(controller.getRoot()).toEqual({
      name: 'Menaharia API',
      env: 'development',
      status: 'ok',
      docsPath: '/docs',
    });
  });

  it('hides docs in production', () => {
    const controller = new AppController(configService);
    jest.spyOn(configService, 'getOrThrow').mockImplementation((key: string) => {
      if (key === 'app.name') {
        return 'Menaharia API' as any;
      }

      if (key === 'app.env') {
        return 'production' as any;
      }

      return undefined as any;
    });

    expect(controller.getRoot()).toEqual({
      name: 'Menaharia API',
      env: 'production',
      status: 'ok',
      docsPath: null,
    });
  });
});
