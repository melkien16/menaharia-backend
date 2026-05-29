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

import { BadRequestException } from '@nestjs/common';
import { FetchQueryPipe } from './fetch-query.pipe';

describe('FetchQueryPipe', () => {
  it('parses a full query string', () => {
    const pipe = new FetchQueryPipe();

    expect(
      pipe.transform('page=2&limit=20&fields=id,name&sort=createdAt:desc&filter=status:eq:ACTIVE'),
    ).toEqual({
      page: 2,
      limit: 20,
      select: ['id', 'name'],
      orderBy: [{ column: 'createdAt', direction: 'DESC' }],
      where: [[{ column: 'status', operator: 'EqualTo', value: 'ACTIVE' }]],
    });
  });

  it('rejects invalid pagination', () => {
    const pipe = new FetchQueryPipe();

    expect(() => pipe.transform('page=0')).toThrow(BadRequestException);
    expect(() => pipe.transform('limit=101')).toThrow('Invalid query string: Invalid limit');
  });
});
