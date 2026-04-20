# **Fetch-Query** String Convention API Guide

## Overview

This project uses a compact, URL-friendly query string convention that allows clients to perform complex queries including filtering, sorting, field selection, and pagination using a single `query` parameter.

## Base URL Format

```
GET /api/resource?query=<query_string>
```

The `query` parameter contains standard URL-encoded key-value pairs.

## Parameters

| Parameter | Type   | Description                      | Example                         |
| --------- | ------ | -------------------------------- | ------------------------------- |
| `page`    | number | Page number (1-based)            | `page=2`                        |
| `limit`   | number | Items per page (max 100)         | `limit=20`                      |
| `fields`  | string | Comma-separated fields to select | `fields=id,name,email`          |
| `sort`    | string | Sorting instructions             | `sort=createdAt:desc,updatedAt` |
| `filter`  | string | Filter conditions                | `filter=status:eq:active`       |

## Field Selection

Select specific fields to return in the response.

**Syntax:**

```
fields=<field1>,<field2>,<field3>...
```

**Example:**

```
?query=fields=id,title,createdAt,author.name
```

## Sorting

Sort results by one or more fields.

**Syntax:**

```
sort=<field1>[:direction],<field2>[:direction]...
```

- Direction: `asc` (default) or `desc`

**Examples:**

```
?query=sort=createdAt:desc
?query=sort=lastName:asc,firstName:asc
```

## Filtering

The filter syntax is the most powerful feature, allowing complex logical conditions.

### Filter Delimiters

| Symbol | Meaning                          | Example          |
| ------ | -------------------------------- | ---------------- |
| `;`    | AND between groups               | `group1;group2`  |
| `\|`   | OR within a group                | `cond1\|cond2`   |
| `:`    | Separates field, operator, value | `field:op:value` |

### Basic Structure

```
filter=<field>:<operator>:<value>[|<field>:<operator>:<value>...][;<field>:<operator>:<value>...]
```

This translates to:

```
WHERE (condition1 OR condition2 OR ...) AND (conditionA OR conditionB OR ...) AND ...
```

### Available Operators

| Short      | Operator      | Description               | Example                       |
| ---------- | ------------- | ------------------------- | ----------------------------- |
| `eq`       | `=`           | Equals                    | `status:eq:active`            |
| `neq`      | `!=`          | Not equals                | `status:neq:inactive`         |
| `lt`       | `<`           | Less than                 | `age:lt:18`                   |
| `lte`      | `<=`          | Less than or equal        | `price:lte:100`               |
| `gt`       | `>`           | Greater than              | `age:gt:65`                   |
| `gte`      | `>=`          | Greater than or equal     | `price:gte:50`                |
| `like`     | `LIKE`        | SQL LIKE (case-sensitive) | `name:like:%john%`            |
| `ilike`    | `ILIKE`       | Case-insensitive LIKE     | `name:ilike:%john%`           |
| `in`       | `IN`          | In array                  | `status:in:active,pending`    |
| `nin`      | `NOT IN`      | Not in array              | `status:nin:deleted,archived` |
| `between`  | `BETWEEN`     | Between two values        | `price:between:10,50`         |
| `isnull`   | `IS NULL`     | Is null                   | `deletedAt:isnull`            |
| `notnull`  | `IS NOT NULL` | Is not null               | `email:notnull`               |
| `contains` | `@>`          | Array contains            | `tags:contains:urgent`        |
| `any`      | `?\|`         | Array has any of          | `tags:any:urgent,important`   |
| `all`      | `?&`          | Array has all             | `tags:all:urgent,important`   |

### Filter Examples

#### 1. Simple Equality

```
?query=filter=status:eq:active
```

SQL: `WHERE status = 'active'`

#### 2. OR Condition

```
?query=filter=status:eq:active|priority:eq:high
```

SQL: `WHERE status = 'active' OR priority = 'high'`

#### 3. AND Condition

```
?query=filter=status:eq:active;priority:eq:high
```

SQL: `WHERE status = 'active' AND priority = 'high'`

#### 4. Complex AND/OR Combination

```
?query=filter=status:eq:active|priority:eq:high;tags:contains:urgent
```

SQL: `WHERE (status = 'active' OR priority = 'high') AND tags @> ARRAY['urgent']`

#### 5. IN Operator with Multiple Values

```
?query=filter=status:in:active,pending,suspended
```

SQL: `WHERE status IN ('active', 'pending', 'suspended')`

#### 6. BETWEEN Operator

```
?query=filter=createdAt:between:2024-01-01,2024-12-31
```

SQL: `WHERE createdAt BETWEEN '2024-01-01' AND '2024-12-31'`

#### 7. NULL Checks

```
?query=filter=deletedAt:isnull
```

SQL: `WHERE deletedAt IS NULL`

#### 8. Array Operations

```
?query=filter=tags:contains:urgent
```

SQL (PostgreSQL): `WHERE tags @> ARRAY['urgent']`

## Complete Examples

### Example 1: Basic Pagination

```
GET /users?query=page=2&limit=10
```

Returns page 2 with 10 items per page.

### Example 2: Field Selection + Sorting

```
GET /posts?query=fields=id,title,createdAt&sort=createdAt:desc
```

Returns only id, title, createdAt fields, sorted by createdAt descending.

### Example 3: Complex Filtering

```
GET /orders?query=filter=status:eq:active|priority:eq:high;createdAt:between:2024-01-01,2024-12-31;tags:contains:urgent
```

Returns orders where:

- (status = 'active' OR priority = 'high') AND
- createdAt between Jan 1, 2024 and Dec 31, 2024 AND
- tags array contains 'urgent'

### Example 4: Everything Combined

```
GET /products?query=page=1&limit=20&fields=id,name,price,category&sort=price:asc,name:asc&filter=category:in:electronics,books;price:between:10,100;inStock:eq:true
```

Returns first 20 products with:

- Selected fields: id, name, price, category
- Sorted by price ascending, then name ascending
- Where category IN ('electronics', 'books') AND price BETWEEN 10 AND 100 AND inStock = true

## Best Practices

1. **Always URL-encode** your query strings
2. **Use meaningful field names** that match your API schema
3. **Combine multiple conditions** using the AND/OR syntax for precise queries
4. **Limit result sets** with pagination to improve performance
5. **Select only needed fields** using the `fields` parameter to reduce payload size

## Summary

This query convention provides a powerful yet compact way to interact with the API, supporting:

- ✅ Pagination
- ✅ Field selection
- ✅ Sorting (single and multi-field)
- ✅ Complex filtering (AND/OR combinations)
- ✅ Rich set of operators
- ✅ Array operations
- ✅ URL-safe syntax

Use it to build efficient, precise queries for your applications!

## Future work

To optimize API performance and enable efficient caching, we can implement a **query hashing** mechanism. This converts complex query strings into fixed-length, unique identifiers that can be used for cache keys, request tracking, and reducing URL lengths.

### Issues:

- URL length limits (browsers: ~2000 chars, some proxies: ~8000 chars)
- Inefficient caching (long, variable-length cache keys)
- Hard to debug and track
- Exposes query structure in URLs

### The Solution: Query Hashing

Generate a fixed-length hash (e.g., 32 characters) from the normalized query string.
