# Auth Starter API

A clean NestJS starter with Prisma, PostgreSQL, JWT access/refresh auth, Swagger docs, and a small health endpoint.

## Features

- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `POST /v1/auth/refresh`
- `POST /v1/auth/logout`
- `GET /v1/auth/me`
- `GET /`
- Swagger docs at `/docs` outside production

## Environment

Copy `.env.example` to `.env` and update values for your local database.

Required variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `JWT_REFRESH_SECRET`
- `JWT_REFRESH_EXPIRES_IN`

## Install

```bash
npm install
npm run db:generate
```

## Database

This starter uses PostgreSQL with the existing multi-file Prisma schema directory at `src/prisma/schema`.

```bash
npm run db:migrate
```

## Run

```bash
npm run start:dev
```

Default local URLs:

- API: `http://localhost:3002`
- Swagger: `http://localhost:3002/docs`

## Example Requests

Register:

```bash
curl -X POST http://localhost:3002/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Starter User",
    "phone": "+251900000000",
    "email": "starter@example.com",
    "password": "password123"
  }'
```

Login:

```bash
curl -X POST http://localhost:3002/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "starter@example.com",
    "password": "password123"
  }'
```

## Scripts

- `npm run build`
- `npm run start:dev`
- `npm run test`
- `npm run test:e2e`
- `npm run db:generate`
- `npm run db:migrate`
