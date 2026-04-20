import { ConfigModule, ConfigService } from '@nestjs/config';

type RedisConfig = {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  useTls?: boolean;
};

export const bullQueueConfig = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    const { host, port, password, db, useTls } = configService.get<RedisConfig>('redis') ?? {};

    return {
      connection: {
        host,
        port,
        password,
        db,
        ...(useTls && { tls: {} }),
      },
      defaultJobOptions: {
        attempts: 4,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: { age: 24 * 3600, count: 1000 },
      },
    };
  },
};
