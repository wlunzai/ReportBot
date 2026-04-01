import 'dotenv/config';
import express from 'express';
import { healthRouter } from './routes/health.js';
import { practicesRouter } from './routes/practices.js';
import { chatRouter } from './routes/chat.js';
import { smsRouter } from './routes/sms.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api/health', healthRouter);
app.use('/api/practices', practicesRouter);
app.use('/api/chat', chatRouter);
app.use('/api/sms', smsRouter);

app.listen(PORT, () => {
  console.log(`DentalBot API listening on port ${PORT}`);
});

export default app;
