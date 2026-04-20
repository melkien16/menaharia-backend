import { FilterOperators } from '../enums/shared/filter-operators.enum';

export const operatorMap: Record<string, string> = {
  eq: FilterOperators.EqualTo,
  neq: FilterOperators.NotEqualTo,
  lt: FilterOperators.LessThan,
  lte: FilterOperators.LessThanOrEqualTo,
  gt: FilterOperators.GreaterThan,
  gte: FilterOperators.GreaterThanOrEqualTo,
  like: FilterOperators.Like,
  ilike: FilterOperators.ILike,
  in: FilterOperators.In,
  nin: FilterOperators.NotIn,
  between: FilterOperators.Between,
  isnull: FilterOperators.IsNull,
  notnull: FilterOperators.NotNull,
  contains: FilterOperators.ArrayContains,
  any: FilterOperators.Any,
  all: FilterOperators.All,
};
