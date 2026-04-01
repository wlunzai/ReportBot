import pg from 'pg';

export async function queryPostgres(sourceConfig, queryText) {
  const client = new pg.Client({
    connectionString: sourceConfig.connection_string,
    ssl: sourceConfig.ssl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
    query_timeout: 30000,
  });

  try {
    await client.connect();
    const result = await client.query(queryText);
    return {
      columns: result.fields.map(f => f.name),
      rows: result.rows,
      rowCount: result.rowCount,
    };
  } finally {
    await client.end();
  }
}
