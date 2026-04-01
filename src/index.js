import 'dotenv/config';
import express from 'express';
import { healthRouter } from './routes/health.js';
import { pipelinesRouter } from './routes/pipelines.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/pipelines', pipelinesRouter);

app.listen(PORT, () => {
  console.log(`ReportBot API listening on port ${PORT}`);
});

export default app;
