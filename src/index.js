import 'dotenv/config';
import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { healthRouter } from './routes/health.js';
import { pipelinesRouter } from './routes/pipelines.js';
import { runsRouter } from './routes/runs.js';
import { loadAllPipelines, getScheduledCount } from './scheduler/engine.js';
import { runMigrations } from './db/migrate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// API routes
app.use('/api/health', healthRouter);
app.use('/api/pipelines', pipelinesRouter);
app.use('/api/runs', runsRouter);

// Serve web UI
app.use(express.static(join(__dirname, 'public')));
app.get('/', (req, res) => res.sendFile(join(__dirname, 'public', 'index.html')));

app.listen(PORT, async () => {
  console.log(`ReportBot API listening on port ${PORT}`);
  try {
    await runMigrations();
    console.log('[startup] Migrations complete');
    await loadAllPipelines();
    console.log(`[startup] ${getScheduledCount()} pipelines scheduled`);
  } catch (err) {
    console.error('[startup] Startup error:', err.message);
  }
});

export default app;
