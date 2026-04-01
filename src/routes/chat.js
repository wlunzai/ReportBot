import { Router } from 'express';
import { pool } from '../db/pool.js';
import { processMessage } from '../ai/engine.js';

export const chatRouter = Router();

// Start a new web chat conversation
chatRouter.post('/start', async (req, res) => {
  const { practiceId, customerName } = req.body;

  if (!practiceId) {
    return res.status(400).json({ error: 'practiceId is required' });
  }

  // Verify practice exists
  const { rows: practices } = await pool.query('SELECT id, greeting_message, name FROM practices WHERE id = $1', [practiceId]);
  if (practices.length === 0) {
    return res.status(404).json({ error: 'Practice not found' });
  }

  const practice = practices[0];
  const sessionId = crypto.randomUUID();

  const { rows } = await pool.query(
    `INSERT INTO conversations (practice_id, channel, customer_name, session_id)
     VALUES ($1, 'web', $2, $3) RETURNING id`,
    [practiceId, customerName || null, sessionId]
  );

  const greeting = (practice.greeting_message || 'Hi! How can I help you today?')
    .replace('{{practice_name}}', practice.name);

  // Save greeting as assistant message
  await pool.query(
    'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
    [rows[0].id, 'assistant', greeting]
  );

  res.status(201).json({
    conversationId: rows[0].id,
    sessionId,
    greeting,
  });
});

// Send a message in an existing web chat
chatRouter.post('/message', async (req, res) => {
  const { conversationId, sessionId, message } = req.body;

  if (!conversationId || !message) {
    return res.status(400).json({ error: 'conversationId and message are required' });
  }

  // Verify conversation exists and session matches
  const { rows: convs } = await pool.query(
    `SELECT id, status, session_id FROM conversations WHERE id = $1 AND channel = 'web'`,
    [conversationId]
  );

  if (convs.length === 0) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  if (sessionId && convs[0].session_id !== sessionId) {
    return res.status(403).json({ error: 'Invalid session' });
  }

  if (convs[0].status === 'escalated') {
    return res.json({
      reply: "You've been connected to our office staff. A team member will respond shortly.",
      escalated: true,
    });
  }

  try {
    const result = await processMessage(conversationId, message);
    res.json(result);
  } catch (err) {
    console.error('Chat message error:', err);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Get conversation history
chatRouter.get('/history/:conversationId', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT role, content, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
    [req.params.conversationId]
  );
  res.json(rows);
});
