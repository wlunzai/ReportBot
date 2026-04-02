import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

export const runsRouter = Router();

runsRouter.use(requireAuth);

// Get all recent runs across user's pipelines
runsRouter.get('/', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const { rows } = await pool.query(
    `SELECT r.*, p.name as pipeline_name
     FROM pipeline_runs r
     JOIN pipelines p ON p.id = r.pipeline_id
     WHERE p.user_id = $1
     ORDER BY r.created_at DESC LIMIT $2`,
    [req.userId, limit]
  );
  res.json(rows);
});

// Get a specific run
runsRouter.get('/:id', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT r.*, p.name as pipeline_name
     FROM pipeline_runs r
     JOIN pipelines p ON p.id = r.pipeline_id
     WHERE r.id = $1 AND p.user_id = $2`,
    [req.params.id, req.userId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Run not found' });
  res.json(rows[0]);
});
