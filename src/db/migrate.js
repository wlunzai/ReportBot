import 'dotenv/config';
import { pool } from './pool.js';
import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const { rows: applied } = await pool.query('SELECT version FROM schema_migrations ORDER BY version');
  const appliedSet = new Set(applied.map(r => r.version));

  const migrationsDir = join(__dirname, 'migrations');
  const files = (await readdir(migrationsDir)).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (appliedSet.has(file)) continue;
    console.log(`Applying migration: ${file}`);
    const sql = await readFile(join(migrationsDir, file), 'utf-8');
    await pool.query('BEGIN');
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
      await pool.query('COMMIT');
      console.log(`  Applied: ${file}`);
    } catch (err) {
      await pool.query('ROLLBACK');
      console.error(`  Failed: ${file}`, err.message);
      process.exit(1);
    }
  }

  console.log('Migrations complete.');
  await pool.end();
}

migrate();
