import { Router } from 'express';
import { pool } from '../db/pool.js';

export const practicesRouter = Router();

// List all practices
practicesRouter.get('/', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, phone, timezone, services, twilio_phone, created_at FROM practices ORDER BY created_at DESC'
  );
  res.json(rows);
});

// Get a single practice
practicesRouter.get('/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM practices WHERE id = $1', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Practice not found' });
  res.json(rows[0]);
});

// Create a practice
practicesRouter.post('/', async (req, res) => {
  const { name, phone, timezone, business_hours, services, escalation_phone, escalation_email, twilio_phone, greeting_message, config } = req.body;

  if (!name) return res.status(400).json({ error: 'name is required' });

  const { rows } = await pool.query(
    `INSERT INTO practices (name, phone, timezone, business_hours, services, escalation_phone, escalation_email, twilio_phone, greeting_message, config)
     VALUES ($1, $2, $3, COALESCE($4, '{"mon":["09:00","17:00"],"tue":["09:00","17:00"],"wed":["09:00","17:00"],"thu":["09:00","17:00"],"fri":["09:00","17:00"]}'),
             COALESCE($5, '[]'), $6, $7, $8, $9, COALESCE($10, '{}'))
     RETURNING *`,
    [name, phone || null, timezone || 'America/New_York', business_hours ? JSON.stringify(business_hours) : null,
     services ? JSON.stringify(services) : null, escalation_phone || null, escalation_email || null,
     twilio_phone || null, greeting_message || null, config ? JSON.stringify(config) : null]
  );
  res.status(201).json(rows[0]);
});

// Update a practice
practicesRouter.patch('/:id', async (req, res) => {
  const allowed = ['name', 'phone', 'timezone', 'business_hours', 'services', 'escalation_phone', 'escalation_email', 'twilio_phone', 'greeting_message', 'config'];
  const updates = [];
  const values = [];
  let idx = 1;

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates.push(`${key} = $${idx++}`);
      const val = req.body[key];
      values.push(typeof val === 'object' && val !== null ? JSON.stringify(val) : val);
    }
  }

  if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });

  values.push(req.params.id);
  const { rows } = await pool.query(
    `UPDATE practices SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
    values
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Practice not found' });
  res.json(rows[0]);
});

// Knowledge base CRUD for a practice
practicesRouter.get('/:id/knowledge-base', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM knowledge_base WHERE practice_id = $1 ORDER BY category, created_at',
    [req.params.id]
  );
  res.json(rows);
});

practicesRouter.post('/:id/knowledge-base', async (req, res) => {
  const { question, answer, category } = req.body;
  if (!question || !answer) return res.status(400).json({ error: 'question and answer are required' });

  const { rows } = await pool.query(
    'INSERT INTO knowledge_base (practice_id, question, answer, category) VALUES ($1, $2, $3, $4) RETURNING *',
    [req.params.id, question, answer, category || null]
  );
  res.status(201).json(rows[0]);
});

practicesRouter.delete('/:practiceId/knowledge-base/:kbId', async (req, res) => {
  const { rowCount } = await pool.query(
    'DELETE FROM knowledge_base WHERE id = $1 AND practice_id = $2',
    [req.params.kbId, req.params.practiceId]
  );
  if (rowCount === 0) return res.status(404).json({ error: 'Entry not found' });
  res.status(204).end();
});

// List appointments for a practice
practicesRouter.get('/:id/appointments', async (req, res) => {
  const { date, status } = req.query;
  let query = 'SELECT * FROM appointments WHERE practice_id = $1';
  const params = [req.params.id];

  if (date) {
    params.push(date);
    query += ` AND date = $${params.length}`;
  }
  if (status) {
    params.push(status);
    query += ` AND status = $${params.length}`;
  }

  query += ' ORDER BY date, start_time';
  const { rows } = await pool.query(query, params);
  res.json(rows);
});
