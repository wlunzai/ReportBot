import { Router } from 'express';
import { pool } from '../db/pool.js';

export const healthRouter = Router();

healthRouter.get('/', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'degraded', db: 'disconnected', error: err.message });
  }
});
