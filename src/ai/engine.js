import Anthropic from '@anthropic-ai/sdk';
import { pool } from '../db/pool.js';

const anthropic = new Anthropic();

function buildSystemPrompt(practice, knowledgeBase, appointments) {
  const kbSection = knowledgeBase.length > 0
    ? knowledgeBase.map(kb => `Q: ${kb.question}\nA: ${kb.answer}`).join('\n\n')
    : 'No FAQ entries configured yet.';

  const servicesSection = practice.services?.length > 0
    ? practice.services.join(', ')
    : 'General dental services';

  const todayAppts = appointments.length > 0
    ? appointments.map(a => `- ${a.start_time}-${a.end_time}: ${a.customer_name} (${a.service || 'General'})`).join('\n')
    : 'No appointments booked today yet.';

  return `You are a friendly, professional virtual receptionist for ${practice.name}, a dental practice.

## Your Role
- Answer patient questions about the practice
- Help patients book, confirm, or reschedule appointments
- Be warm, concise, and helpful
- If you cannot help or the patient is upset/has an emergency, escalate to human staff

## Practice Info
- Name: ${practice.name}
- Phone: ${practice.phone || 'Not listed'}
- Timezone: ${practice.timezone}
- Business Hours: ${JSON.stringify(practice.business_hours)}
- Services: ${servicesSection}

## FAQ Knowledge Base
${kbSection}

## Today's Appointments (for scheduling awareness)
${todayAppts}

## Tools Available
You can use these tools to take action:
- book_appointment: Book a new appointment for the patient
- reschedule_appointment: Change an existing appointment
- cancel_appointment: Cancel an existing appointment
- escalate: Hand off to human staff

## Rules
1. Always confirm details before booking (name, phone, desired service, preferred date/time)
2. Never double-book a time slot
3. If a patient asks something outside your knowledge, say you'll have the office follow up
4. Keep responses brief - this is SMS/chat, not email
5. If the patient expresses a dental emergency, immediately escalate
6. Always be empathetic and professional`;
}

const tools = [
  {
    name: 'book_appointment',
    description: 'Book a new dental appointment for the patient',
    input_schema: {
      type: 'object',
      properties: {
        customer_name: { type: 'string', description: 'Patient full name' },
        customer_phone: { type: 'string', description: 'Patient phone number' },
        service: { type: 'string', description: 'Type of service (cleaning, checkup, etc.)' },
        date: { type: 'string', description: 'Appointment date in YYYY-MM-DD format' },
        start_time: { type: 'string', description: 'Start time in HH:MM format (24h)' },
        end_time: { type: 'string', description: 'End time in HH:MM format (24h)' },
      },
      required: ['customer_name', 'date', 'start_time', 'end_time'],
    },
  },
  {
    name: 'reschedule_appointment',
    description: 'Reschedule an existing appointment to a new date/time',
    input_schema: {
      type: 'object',
      properties: {
        appointment_id: { type: 'string', description: 'The appointment ID to reschedule' },
        new_date: { type: 'string', description: 'New date in YYYY-MM-DD format' },
        new_start_time: { type: 'string', description: 'New start time in HH:MM format (24h)' },
        new_end_time: { type: 'string', description: 'New end time in HH:MM format (24h)' },
      },
      required: ['appointment_id', 'new_date', 'new_start_time', 'new_end_time'],
    },
  },
  {
    name: 'cancel_appointment',
    description: 'Cancel an existing appointment',
    input_schema: {
      type: 'object',
      properties: {
        appointment_id: { type: 'string', description: 'The appointment ID to cancel' },
      },
      required: ['appointment_id'],
    },
  },
  {
    name: 'escalate',
    description: 'Escalate the conversation to human staff when you cannot help or the patient needs immediate human attention',
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Why this is being escalated' },
      },
      required: ['reason'],
    },
  },
];

async function handleToolCall(toolName, toolInput, practiceId, conversationId) {
  switch (toolName) {
    case 'book_appointment': {
      // Check for conflicts
      const { rows: conflicts } = await pool.query(
        `SELECT id FROM appointments
         WHERE practice_id = $1 AND date = $2 AND status = 'confirmed'
         AND (start_time, end_time) OVERLAPS ($3::time, $4::time)`,
        [practiceId, toolInput.date, toolInput.start_time, toolInput.end_time]
      );
      if (conflicts.length > 0) {
        return { success: false, error: 'Time slot conflict. That time is already booked.' };
      }
      const { rows } = await pool.query(
        `INSERT INTO appointments (practice_id, conversation_id, customer_name, customer_phone, service, date, start_time, end_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, date, start_time, end_time`,
        [practiceId, conversationId, toolInput.customer_name, toolInput.customer_phone || null,
         toolInput.service || null, toolInput.date, toolInput.start_time, toolInput.end_time]
      );
      return { success: true, appointment: rows[0] };
    }
    case 'reschedule_appointment': {
      const { rows: conflicts } = await pool.query(
        `SELECT id FROM appointments
         WHERE practice_id = $1 AND date = $2 AND status = 'confirmed'
         AND id != $3
         AND (start_time, end_time) OVERLAPS ($4::time, $5::time)`,
        [practiceId, toolInput.new_date, toolInput.appointment_id, toolInput.new_start_time, toolInput.new_end_time]
      );
      if (conflicts.length > 0) {
        return { success: false, error: 'New time slot has a conflict.' };
      }
      const { rows, rowCount } = await pool.query(
        `UPDATE appointments SET date = $1, start_time = $2, end_time = $3, status = 'confirmed', updated_at = NOW()
         WHERE id = $4 AND practice_id = $5 RETURNING id, date, start_time, end_time`,
        [toolInput.new_date, toolInput.new_start_time, toolInput.new_end_time, toolInput.appointment_id, practiceId]
      );
      if (rowCount === 0) return { success: false, error: 'Appointment not found.' };
      return { success: true, appointment: rows[0] };
    }
    case 'cancel_appointment': {
      const { rowCount } = await pool.query(
        `UPDATE appointments SET status = 'cancelled', updated_at = NOW() WHERE id = $1 AND practice_id = $2`,
        [toolInput.appointment_id, practiceId]
      );
      if (rowCount === 0) return { success: false, error: 'Appointment not found.' };
      return { success: true, message: 'Appointment cancelled.' };
    }
    case 'escalate': {
      await pool.query(
        `UPDATE conversations SET status = 'escalated', escalated_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [conversationId]
      );
      return { success: true, message: `Escalated: ${toolInput.reason}` };
    }
    default:
      return { success: false, error: `Unknown tool: ${toolName}` };
  }
}

export async function processMessage(conversationId, customerMessage) {
  // Get conversation with practice
  const { rows: convRows } = await pool.query(
    `SELECT c.*, p.name as practice_name, p.phone as practice_phone,
            p.timezone, p.business_hours, p.services, p.config
     FROM conversations c
     JOIN practices p ON p.id = c.practice_id
     WHERE c.id = $1`,
    [conversationId]
  );
  if (convRows.length === 0) throw new Error('Conversation not found');
  const conv = convRows[0];
  if (conv.status === 'escalated') {
    return { reply: "You've been connected to our office staff. A team member will respond shortly.", escalated: true };
  }

  // Save customer message
  await pool.query(
    'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
    [conversationId, 'customer', customerMessage]
  );

  // Get knowledge base
  const { rows: kb } = await pool.query(
    'SELECT question, answer, category FROM knowledge_base WHERE practice_id = $1',
    [conv.practice_id]
  );

  // Get today's appointments for scheduling context
  const { rows: todayAppts } = await pool.query(
    `SELECT customer_name, service, start_time, end_time FROM appointments
     WHERE practice_id = $1 AND date = CURRENT_DATE AND status = 'confirmed'
     ORDER BY start_time`,
    [conv.practice_id]
  );

  // Build message history
  const { rows: history } = await pool.query(
    'SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
    [conversationId]
  );

  const practice = {
    name: conv.practice_name,
    phone: conv.practice_phone,
    timezone: conv.timezone,
    business_hours: conv.business_hours,
    services: conv.services,
    config: conv.config,
  };

  const systemPrompt = buildSystemPrompt(practice, kb, todayAppts);
  const messages = history.map(m => ({
    role: m.role === 'customer' ? 'user' : 'assistant',
    content: m.content,
  }));

  // Call Claude with tool use
  let response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    system: systemPrompt,
    tools,
    messages,
  });

  // Process tool calls in a loop
  while (response.stop_reason === 'tool_use') {
    const toolBlocks = response.content.filter(b => b.type === 'tool_use');
    const toolResults = [];
    for (const block of toolBlocks) {
      const result = await handleToolCall(block.name, block.input, conv.practice_id, conversationId);
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(result),
      });
    }

    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });

    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: systemPrompt,
      tools,
      messages,
    });
  }

  // Extract text reply
  const textBlocks = response.content.filter(b => b.type === 'text');
  const reply = textBlocks.map(b => b.text).join('\n') || "I'm sorry, I wasn't able to process that. Let me connect you with our office staff.";

  // Save assistant reply
  await pool.query(
    'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
    [conversationId, 'assistant', reply]
  );

  // Check if escalation happened
  const { rows: updatedConv } = await pool.query(
    'SELECT status FROM conversations WHERE id = $1',
    [conversationId]
  );

  return { reply, escalated: updatedConv[0]?.status === 'escalated' };
}
