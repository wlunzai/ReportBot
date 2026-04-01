import { Router } from 'express';
import { pool } from '../db/pool.js';
import { schedulePipeline, unschedulePipeline } from '../scheduler/engine.js';
import { runPipeline } from '../pipeline/runner.js';

export const pipelinesRouter = Router();

pipelinesRouter.get('/', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, schedule, source_type, delivery_type, enabled, created_at FROM pipelines ORDER BY created_at DESC'
  );
  res.json(rows);
});

pipelinesRouter.get('/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM pipelines WHERE id = $1', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Pipeline not found' });
  res.json(rows[0]);
});

// Get runs for a pipeline
pipelinesRouter.get('/:id/runs', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const { rows } = await pool.query(
    'SELECT * FROM pipeline_runs WHERE pipeline_id = $1 ORDER BY created_at DESC LIMIT $2',
    [req.params.id, limit]
  );
  res.json(rows);
});

pipelinesRouter.post('/', async (req, res) => {
  const { name, schedule, source_type, source_config, query_text, delivery_type, delivery_config, alert_condition } = req.body;

  if (!name || !schedule || !source_type || !query_text || !delivery_type) {
    return res.status(400).json({ error: 'Missing required fields: name, schedule, source_type, query_text, delivery_type' });
  }

  const { rows } = await pool.query(
    `INSERT INTO pipelines (name, schedule, source_type, source_config, query_text, delivery_type, delivery_config, alert_condition)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [name, schedule, source_type, source_config || {}, query_text, delivery_type, delivery_config || {}, alert_condition || null]
  );

  const pipeline = rows[0];
  if (pipeline.enabled) schedulePipeline(pipeline);
  res.status(201).json(pipeline);
});

// Trigger a manual run
pipelinesRouter.post('/:id/run', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM pipelines WHERE id = $1', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Pipeline not found' });

  try {
    const result = await runPipeline(rows[0]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

pipelinesRouter.patch('/:id', async (req, res) => {
  const allowed = ['name', 'schedule', 'source_type', 'source_config', 'query_text', 'delivery_type', 'delivery_config', 'alert_condition', 'enabled'];
  const updates = [];
  const values = [];
  let idx = 1;

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates.push(`${key} = $${idx++}`);
      values.push(req.body[key]);
    }
  }

  if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });

  values.push(req.params.id);
  const { rows } = await pool.query(
    `UPDATE pipelines SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
    values
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Pipeline not found' });

  const pipeline = rows[0];
  if (pipeline.enabled) {
    schedulePipeline(pipeline);
  } else {
    unschedulePipeline(pipeline.id);
  }
  res.json(pipeline);
});

pipelinesRouter.delete('/:id', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM pipelines WHERE id = $1', [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ error: 'Pipeline not found' });
  unschedulePipeline(req.params.id);
  res.status(204).end();
});
