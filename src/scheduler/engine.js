import cron from 'node-cron';
import { DateTime } from 'luxon';
import { pool } from '../db/pool.js';
import { runPipeline } from '../pipeline/runner.js';

const jobs = new Map();

export function schedulePipeline(pipeline) {
  if (jobs.has(pipeline.id)) {
    jobs.get(pipeline.id).stop();
  }

  const tz = pipeline.source_config?.timezone || 'UTC';

  const job = cron.schedule(pipeline.schedule, async () => {
    console.log(`[scheduler] Running pipeline "${pipeline.name}" (${pipeline.id}) at ${DateTime.now().setZone(tz).toISO()}`);
    try {
      await runPipeline(pipeline);
    } catch (err) {
      console.error(`[scheduler] Pipeline "${pipeline.name}" failed:`, err.message);
    }
  }, {
    timezone: tz,
    scheduled: true,
  });

  jobs.set(pipeline.id, job);
  console.log(`[scheduler] Scheduled "${pipeline.name}" with cron "${pipeline.schedule}" (tz: ${tz})`);
}

export function unschedulePipeline(pipelineId) {
  const job = jobs.get(pipelineId);
  if (job) {
    job.stop();
    jobs.delete(pipelineId);
  }
}

export async function loadAllPipelines() {
  const { rows } = await pool.query('SELECT * FROM pipelines WHERE enabled = true');
  console.log(`[scheduler] Loading ${rows.length} enabled pipelines`);
  for (const pipeline of rows) {
    schedulePipeline(pipeline);
  }
}

export function getScheduledCount() {
  return jobs.size;
}
