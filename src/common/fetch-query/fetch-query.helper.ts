import { FilterOperators } from '../enums/shared/filter-operators.enum';
import { FetchQuery, Order, Where } from './crud.types';

export const buildFindManyArgs = (query: FetchQuery): any => {
  const { page = 1, limit = 10, select, orderBy, where } = query;
  const skip = (page - 1) * limit;

  const args: any = {
    skip,
    take: limit,
  };

  // Field selection
  if (select && select.length > 0) {
    args.select = select.reduce((acc, field) => ({ ...acc, [field]: true }), {});
  }

  // Sorting
  if (orderBy && orderBy.length > 0) {
    args.orderBy = orderBy.map((o: Order) => ({
      [o.column]: o.direction?.toLowerCase() ?? 'asc',
    }));
  }

  // Filtering
  if (where && where.length > 0) {
    args.where = buildWhere(where);
  }

  return args;
};

// Transform nested Where[][] into Prisma where clause
const buildWhere = (whereGroups: Where[][]): any => {
  const andConditions = whereGroups.map((orGroup) => {
    if (orGroup.length === 1) {
      return mapCondition(orGroup[0]);
    }
    // OR group: map each condition and wrap in OR
    const orConditions = orGroup.map((cond) => mapCondition(cond));
    return { OR: orConditions };
  });

  // If only one top‑level condition, return it directly (Prisma accepts it)
  if (andConditions.length === 1) {
    return andConditions[0];
  }
  return { AND: andConditions };
};

// Convert a single Where condition into a Prisma filter object
const mapCondition = (condition: Where): any => {
  const { column, operator, value } = condition || {};

  // Helper to split dot‑notation for relations (e.g., "author.name")
  const setNestedField = (obj: any, field: string, val: any) => {
    const parts = field.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      current[parts[i]] = current[parts[i]] || {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = val;
    return obj;
  };

  // Operator mapping to Prisma's native filters
  switch (operator) {
    case 'Between':
      if (!Array.isArray(value) || value.length !== 2) {
        throw new Error('BETWEEN operator requires an array of two values');
      }
      return setNestedField({}, column, { gte: value[0], lte: value[1] });

    case 'IsNull':
      return setNestedField({}, column, null); // Prisma treats null as equality to null

    case 'NotNull':
    case FilterOperators.IsNotNull:
      return setNestedField({}, column, { not: null });

    case 'Like':
      return setNestedField({}, column, { contains: value });

    case FilterOperators.ILike:
      return setNestedField({}, column, { contains: value, mode: 'insensitive' });

    case 'In':
      if (!Array.isArray(value)) {
        throw new Error('IN operator requires an array value');
      }
      return setNestedField({}, column, { in: value });

    case FilterOperators.NotIn:
      if (!Array.isArray(value)) {
        throw new Error('NotIn operator requires an array value');
      }
      return setNestedField({}, column, { notIn: value });

    // For operators that map directly to a Prisma suffix
    case 'EqualTo':
    case '=':
      return setNestedField({}, column, { equals: value });

    case FilterOperators.NotEqualTo:
    case '!=':
    case FilterOperators.NotEqual:
      return setNestedField({}, column, { not: value });

    case 'LessThan':
    case '<':
      return setNestedField({}, column, { lt: value });

    case FilterOperators.LessThanOrEqualTo:
    case '<=':
      return setNestedField({}, column, { lte: value });

    case FilterOperators.GreaterThan:
    case '>':
      return setNestedField({}, column, { gt: value });

    case FilterOperators.GreaterThanOrEqualTo:
    case '>=':
      return setNestedField({}, column, { gte: value });

    // Array operators (simplified – you may extend as needed)
    case 'ArrayContains':
      return setNestedField({}, column, { has: value });

    case FilterOperators.Any:
      // For "any" we assume the value is a single element the array should contain
      return setNestedField({}, column, { has: value });

    case 'All':
      if (!Array.isArray(value)) {
        throw new Error('ALL operator requires an array value');
      }
      return setNestedField({}, column, { hasEvery: value });

    // Default fallback – treat as equals
    default:
      return setNestedField({}, column, { equals: value });
  }
};
