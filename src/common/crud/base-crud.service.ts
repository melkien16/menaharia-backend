import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FetchQuery, PaginatedResult } from '../fetch-query/crud.types';
import { buildFindManyArgs } from '../fetch-query/fetch-query.helper';
import { randomUUID } from 'crypto';

type ModelDelegate = {
  create(args: any): Promise<any>;
  findMany(args: any): Promise<any[]>;
  findUnique(args: any): Promise<any | null>;
  count(args: any): Promise<number>;
  update(args: any): Promise<any>;
  delete(args: any): Promise<any>;
};

export type DelegateGetter = (prisma: PrismaService) => ModelDelegate;

@Injectable()
export class BaseCrudService<TEntity, TId = string> {
  protected readonly delegate: ModelDelegate;
  protected readonly idField: string;

  constructor(
    protected readonly prisma: PrismaService,
    getDelegate: DelegateGetter,
    idField: string = 'id',
  ) {
    this.delegate = getDelegate(prisma);
    this.idField = idField;
  }

  protected createWhereClause(id: TId): Record<string, TId> {
    return { [this.idField]: id };
  }

  async create(data: Partial<TEntity>): Promise<TEntity> {
    return await this.delegate.create({ data });
  }

  async findAll(query: FetchQuery): Promise<PaginatedResult<TEntity>> {
    const args = buildFindManyArgs(query);
    const [items, total] = await Promise.all([
      this.delegate.findMany(args),
      this.delegate.count({ where: args.where }),
    ]);

    const response = new PaginatedResult<TEntity>();
    response.total = total;
    response.items = items;

    return response;
  }

  async findOne(id: TId, options?: { include?: any; select?: any }): Promise<TEntity | null> {
    return await this.delegate.findUnique({
      where: this.createWhereClause(id),
      include: options?.include,
      select: options?.select,
    });
  }

  async findOneOrFail(id: TId, options?: { include?: any; select?: any }): Promise<TEntity> {
    const item = await this.findOne(id, options);
    if (!item) throw new NotFoundException('not_found');
    return item;
  }

  async update(id: TId, data: Partial<TEntity>): Promise<TEntity> {
    await this.findOneOrFail(id);
    return await this.delegate.update({ where: this.createWhereClause(id), data });
  }

  async softDelete(id: TId): Promise<void> {
    await this.findOneOrFail(id);
    return await this.delegate.update({
      where: this.createWhereClause(id),
      data: { deletedAt: new Date() },
    });
  }

  async createWithLocation(
    tableName: string,
    data: any,
    location: { lat: number; lng: number },
    locationColumn: string = 'location',
  ) {
    data.id = randomUUID();

    // add timestamps
    const now = new Date();
    data.createdAt = now;
    data.updatedAt = now;

    const keys = Object.keys(data).filter(
      (k) => k !== 'lat' && k !== 'lng' && data[k] !== undefined,
    );
    const values = keys.map((k) => data[k]);

    const columns = keys.map((k) => `"${k}"`).join(', ');

    const placeholders = keys
      .map((k, i) => {
        if (k.toLowerCase().endsWith('id')) {
          return `$${i + 1}::uuid`;
        }
        return `$${i + 1}`;
      })
      .join(', ');

    const returningColumns = keys.map((k) => `"${k}"`).join(', ');

    const query = `
    INSERT INTO "${tableName}" (${columns}, "${locationColumn}")
    VALUES (${placeholders}, ST_SetSRID(ST_MakePoint($${keys.length + 1}, $${keys.length + 2}), 4326))
    RETURNING ${returningColumns}, ST_AsGeoJSON("${locationColumn}"::geometry) as "${locationColumn}";
  `;

    const result = await this.prisma.$queryRawUnsafe<any[]>(
      query,
      ...values,
      location.lng,
      location.lat,
    );

    return result[0];
  }

  async updateWithLocation(
    tableName: string,
    id: TId,
    data: any,
    location?: { lat?: number; lng?: number },
    locationColumn: string = 'location',
  ) {
    // 1. Ensure the record exists first (to maintain consistency with your update() logic)
    await this.findOneOrFail(id);

    const keys = Object.keys(data).filter(
      (k) => k !== 'lat' && k !== 'lng' && data[k] !== undefined,
    );
    const values = keys.map((k) => data[k]);

    // Create SET snippets: "column" = $1::uuid, "other" = $2
    const setClauses = keys.map((k, i) => {
      const column = `"${k}"`;
      const placeholder = k.toLowerCase().endsWith('id') ? `$${i + 1}::uuid` : `$${i + 1}`;
      return `${column} = ${placeholder}`;
    });

    // Handle the location column separately if provided
    if (location) {
      const latIdx = values.length + 1;
      const lngIdx = values.length + 2;
      setClauses.push(
        `"${locationColumn}" = ST_SetSRID(ST_MakePoint($${lngIdx}, $${latIdx}), 4326)`,
      );
      values.push(location.lat, location.lng);
    }

    // The ID placeholder is the last one
    const idIdx = values.length + 1;
    values.push(id);

    const query = `
      UPDATE "${tableName}"
      SET ${setClauses.join(', ')}
      WHERE "${this.idField}" = $${idIdx}::uuid
      RETURNING *, ST_AsGeoJSON("${locationColumn}"::geometry) as "${locationColumn}";
    `;

    const result = await this.prisma.$queryRawUnsafe<any[]>(query, ...values);

    return result[0];
  }

  async getEntityWithLocation(
    table: string,
    id: string,
    locationColumn: string = 'location',
  ): Promise<{ type: string; coordinates: [number, number] } | null> {
    const result = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT ST_AsGeoJSON("${locationColumn}"::geometry) as "${locationColumn}"
      FROM "${table}"
      WHERE id = $1::uuid`,
      id,
    );

    if (!result || result.length === 0) return null;
    const location = JSON.parse(result[0][locationColumn]);
    return location;
  }
}
