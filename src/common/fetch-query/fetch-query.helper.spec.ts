jest.mock(
  '../enums/shared/filter-operators.enum',
  () => ({
    FilterOperators: {
      EqualTo: 'EqualTo',
      NotEqualTo: 'NotEqualTo',
      LessThan: 'LessThan',
      LessThanOrEqualTo: 'LessThanOrEqualTo',
      GreaterThan: 'GreaterThan',
      GreaterThanOrEqualTo: 'GreaterThanOrEqualTo',
      Like: 'Like',
      ILike: 'ILike',
      In: 'In',
      NotIn: 'NotIn',
      Between: 'Between',
      IsNull: 'IsNull',
      NotNull: 'NotNull',
      ArrayContains: 'ArrayContains',
      Any: 'Any',
      All: 'All',
      IsNotNull: 'IsNotNull',
      NotEqual: 'NotEqual',
    },
  }),
  { virtual: true },
);

import { buildFindManyArgs } from './fetch-query.helper';

describe('buildFindManyArgs', () => {
  it('builds prisma arguments from fetch query input', () => {
    expect(
      buildFindManyArgs({
        page: 2,
        limit: 5,
        select: ['id', 'name'],
        orderBy: [{ column: 'createdAt', direction: 'DESC' }],
        where: [
          [{ column: 'status', operator: '=', value: 'ACTIVE' }],
          [
            { column: 'age', operator: 'Between', value: [18, 30] },
            { column: 'profile.name', operator: 'Like', value: 'John' },
          ],
        ],
      } as any),
    ).toEqual({
      skip: 5,
      take: 5,
      select: {
        id: true,
        name: true,
      },
      orderBy: [{ createdAt: 'desc' }],
      where: {
        AND: [
          { status: { equals: 'ACTIVE' } },
          {
            OR: [{ age: { gte: 18, lte: 30 } }, { profile: { name: { contains: 'John' } } }],
          },
        ],
      },
    });
  });

  it('throws on malformed range and set operators', () => {
    expect(() =>
      buildFindManyArgs({
        where: [[{ column: 'age', operator: 'Between', value: [18] }]],
      } as any),
    ).toThrow('BETWEEN operator requires an array of two values');

    expect(() =>
      buildFindManyArgs({
        where: [[{ column: 'id', operator: 'In', value: 'not-an-array' }]],
      } as any),
    ).toThrow('IN operator requires an array value');
  });
});
