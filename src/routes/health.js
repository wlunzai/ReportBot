import { Router } from 'express';
import { pool } from '../db/pool.js';

export const healthRouter = Router();

healthRouter.get('/', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', version: '0.1.1' });
  } catch (err) {
    res.status(503).json({ status: 'degraded', db: 'disconnected', error: err.message || err.code || String(err), version: '0.1.1' });
  }
});
