import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, 'query' | 'error' | 'info' | 'warn'>
  implements OnModuleInit
{
  private readonly als = new AsyncLocalStorage<PrismaClient>();
  private readonly logger = new Logger('prisma');

  // Special flag to bypass the global soft-delete filter.
  // Usage:
  //    prisma.user.findMany({ where: { /* ...  }, includeDeleted: true } as any)
  private static readonly INCLUDE_DELETED_FLAG = 'includeDeleted';

  // Models that don't have soft delete (deletedAt field)
  private static readonly MODELS_WITHOUT_SOFT_DELETE = [
    'AuditLog',
    'PricingConfig',
    'PricingZone',
    'InterCityPricing',
  ];

  private static addSoftDeleteWhere<TArgs extends { where?: any }>(
    args: TArgs,
    modelName?: string,
  ): TArgs {
    // Skip if model doesn't support soft delete
    if (modelName && this.MODELS_WITHOUT_SOFT_DELETE.includes(modelName)) {
      return args;
    }

    const includeDeleted = Boolean((args as any)?.[PrismaService.INCLUDE_DELETED_FLAG]);
    if (includeDeleted) {
      delete (args as any)[PrismaService.INCLUDE_DELETED_FLAG];
      return args;
    }

    const where = args?.where ?? {};
    return {
      ...args,
      where: { AND: [where, { deletedAt: null }] },
    };
  }

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
    });

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

    const extended = this.$extends({
      query: {
        $allModels: {
          findFirst({ args, query, model }: any) {
            return query(PrismaService.addSoftDeleteWhere(args, model));
          },
          findFirstOrThrow({ args, query, model }: any) {
            return query(PrismaService.addSoftDeleteWhere(args, model));
          },
          findMany({ args, query, model }: any) {
            return query(PrismaService.addSoftDeleteWhere(args, model));
          },
          count({ args, query, model }: any) {
            return query(PrismaService.addSoftDeleteWhere(args, model));
          },
          aggregate({ args, query, model }: any) {
            return query(PrismaService.addSoftDeleteWhere(args, model));
          },
          groupBy({ args, query, model }: any) {
            return query(PrismaService.addSoftDeleteWhere(args, model));
          },
        },
      },
    });

    return new Proxy(this, {
      get: (target, prop) => {
        const tx = target.als.getStore() || (extended as any);
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
    return new PrismaClient();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
