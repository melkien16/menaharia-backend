import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';
import { getDatabaseUrl } from './prisma-url';

@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, 'query' | 'error' | 'info' | 'warn'>
  implements OnModuleInit
{
  private readonly als = new AsyncLocalStorage<PrismaClient>();
  private readonly logger = new Logger('prisma');
  private readonly connectionString: string;

  constructor() {
    const connectionString = getDatabaseUrl();

    if (!connectionString) {
      throw new Error('DATABASE_URL is required to initialize Prisma');
    }

    super({
      adapter: new PrismaPg({ connectionString }),
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
    } as Prisma.PrismaClientOptions);

    this.connectionString = connectionString;

    this.$on('query', (e: Prisma.QueryEvent) => {
      this.logger.debug(
        {
          query: e.query,
          params: e.params,
          duration: `${e.duration}ms`,
        },
        'Prisma',
      );
    });

    this.$on('error', (e) => this.logger.error(e.message));
    this.$on('warn', (e) => this.logger.warn(e.message));
    this.$on('info', (e) => this.logger.log(e.message));

    return new Proxy(this, {
      get: (target, prop) => {
        const tx = target.als.getStore() || target;
        const value = Reflect.get(tx, prop, tx);
        return typeof value === 'function' ? value.bind(tx) : value;
      },
    });
  }

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    await this.$connect();
  }

  // this checks if we are inside a transaction context
  get tx(): PrismaClient {
    return this.als.getStore() ?? (this as unknown as PrismaClient);
  }

  async runInTransaction<T>(fn: () => Promise<T>): Promise<T> {
    if (this.als.getStore()) return fn();

    // start a new Prisma transaction
    const callback = async (tx: unknown) => this.als.run(tx as PrismaClient, fn);

    // Set defaults that are "debugging friendly"
    let options = {
      maxWait: 5000,
      timeout: 10000,
    };

    if (process.env.NODE_ENV === 'development') {
      options = {
        maxWait: 2000000,
        timeout: 6000000,
      };
    }

    return this.$transaction(callback as (prisma: any) => Promise<T>, options);
  }

  getRawClient() {
    if (!this.connectionString) {
      throw new Error('DATABASE_URL is required to initialize Prisma');
    }

    return new PrismaClient({
      adapter: new PrismaPg({ connectionString: this.connectionString }),
    } as Prisma.PrismaClientOptions);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
