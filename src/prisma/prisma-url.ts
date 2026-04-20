export function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return undefined;
  }

  return ensureSslMode(databaseUrl);
}

function ensureSslMode(databaseUrl: string) {
  const url = new URL(databaseUrl);

  if (!url.hostname.endsWith('.render.com')) {
    return databaseUrl;
  }

  if (!url.searchParams.has('sslmode')) {
    url.searchParams.set('sslmode', 'require');
  }

  return url.toString();
}
