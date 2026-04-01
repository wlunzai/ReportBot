import { Router } from 'express';
import { pool } from '../db/pool.js';

export const runsRouter = Router();

// Get all recent runs across all pipelines
runsRouter.get('/', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const { rows } = await pool.query(
    `SELECT r.*, p.name as pipeline_name
     FROM pipeline_runs r
     JOIN pipelines p ON p.id = r.pipeline_id
     ORDER BY r.created_at DESC LIMIT $1`,
    [limit]
  );
  res.json(rows);
});

// Get a specific run
runsRouter.get('/:id', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT r.*, p.name as pipeline_name
     FROM pipeline_runs r
     JOIN pipelines p ON p.id = r.pipeline_id
     WHERE r.id = $1`,
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Run not found' });
  res.json(rows[0]);
});
