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
import { parseFields, parseFilter, parseSort } from './fetch-query.parser';

describe('fetch-query.parser', () => {
  it('parses filters, sorting, and fields', () => {
    expect(parseFilter('status:eq:ACTIVE;age:between:18,30|name:like:John')).toEqual([
      [{ column: 'status', operator: 'EqualTo', value: 'ACTIVE' }],
      [
        { column: 'age', operator: 'Between', value: ['18', '30'] },
        { column: 'name', operator: 'Like', value: 'John' },
      ],
    ]);

    expect(parseSort('createdAt:desc,fullName')).toEqual([
      { column: 'createdAt', direction: 'DESC' },
      { column: 'fullName', direction: 'ASC' },
    ]);

    expect(parseFields('id,name')).toEqual(['id', 'name']);
  });

  it('rejects invalid filter expressions', () => {
    expect(() => parseFilter('status')).toThrow(BadRequestException);
    expect(() => parseFilter('status:unknown:ACTIVE')).toThrow('Unknown operator: unknown');
    expect(() => parseFilter('age:between:18')).toThrow('BETWEEN requires exactly two values');
  });

  it('rejects invalid sort expressions', () => {
    expect(() => parseSort('createdAt:sideways')).toThrow('Invalid sort direction: sideways');
  });
});
