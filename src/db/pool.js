import pg from 'pg';

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  // Railway exposes individual Postgres variables — build the URL from them
  const { PGUSER, PGPASSWORD, PGHOST, PGPORT, PGDATABASE } = process.env;
  if (PGHOST && PGDATABASE) {
    const user = PGUSER || 'postgres';
    const pass = PGPASSWORD ? `:${PGPASSWORD}` : '';
    const port = PGPORT || '5432';
    return `postgresql://${user}${pass}@${PGHOST}:${port}/${PGDATABASE}`;
  }

  return undefined;
}

export const pool = new pg.Pool({
  connectionString: getDatabaseUrl(),
  max: 10,
});
