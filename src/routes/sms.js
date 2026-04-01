import { Router } from 'express';
import { pool } from '../db/pool.js';
import { processMessage } from '../ai/engine.js';
export const smsRouter = Router();

// Twilio webhook for incoming SMS
smsRouter.post('/webhook', async (req, res) => {
  const { From: from, To: to, Body: body } = req.body;

  if (!from || !body) {
    return res.status(400).type('text/xml').send('<Response><Message>Invalid request</Message></Response>');
  }

  try {
    // Find practice by Twilio phone number
    const { rows: practices } = await pool.query(
      'SELECT id FROM practices WHERE twilio_phone = $1',
      [to]
    );

    if (practices.length === 0) {
      return res.type('text/xml').send('<Response><Message>Sorry, this number is not configured.</Message></Response>');
    }

    const practiceId = practices[0].id;

    // Find or create conversation
    let { rows: convs } = await pool.query(
      `SELECT id, status FROM conversations
       WHERE practice_id = $1 AND customer_phone = $2 AND channel = 'sms' AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`,
      [practiceId, from]
    );

    let conversationId;
    if (convs.length === 0) {
      const { rows } = await pool.query(
        `INSERT INTO conversations (practice_id, channel, customer_phone)
         VALUES ($1, 'sms', $2) RETURNING id`,
        [practiceId, from]
      );
      conversationId = rows[0].id;
    } else {
      conversationId = convs[0].id;
    }

    const { reply } = await processMessage(conversationId, body);

    // Respond with TwiML
    const twiml = `<Response><Message>${escapeXml(reply)}</Message></Response>`;
    res.type('text/xml').send(twiml);
  } catch (err) {
    console.error('SMS webhook error:', err);
    res.type('text/xml').send('<Response><Message>Sorry, something went wrong. Please call the office directly.</Message></Response>');
  }
});

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
