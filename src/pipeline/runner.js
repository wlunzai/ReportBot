import { pool } from '../db/pool.js';
import { queryPostgres } from '../connectors/postgres.js';
import { querySheets } from '../connectors/sheets.js';
import { deliverEmail } from '../delivery/email.js';
import { deliverSlack } from '../delivery/slack.js';
import { evaluateAlert } from './alerts.js';

const connectors = {
  postgres: queryPostgres,
  google_sheets: querySheets,
};

const deliverers = {
  email: deliverEmail,
  slack: deliverSlack,
};

export async function runPipeline(pipeline) {
  const runId = await createRun(pipeline.id);

  try {
    await updateRun(runId, 'running');

    // 1. Fetch data
    const connector = connectors[pipeline.source_type];
    if (!connector) throw new Error(`Unknown source_type: ${pipeline.source_type}`);
    const data = await connector(pipeline.source_config, pipeline.query_text);

    // 2. Check alerts
    let alert = null;
    if (pipeline.alert_condition) {
      alert = evaluateAlert(pipeline.alert_condition, data);
    }

    // 3. Build report
    const report = {
      pipelineName: pipeline.name,
      columns: data.columns,
      rows: data.rows,
      rowCount: data.rowCount,
      alert,
    };

    // 4. Deliver
    const deliverer = deliverers[pipeline.delivery_type];
    if (!deliverer) throw new Error(`Unknown delivery_type: ${pipeline.delivery_type}`);
    await deliverer(pipeline.delivery_config, report);

    // 5. Record success
    await updateRun(runId, 'success', { rowCount: data.rowCount, alert });
    console.log(`[runner] Pipeline "${pipeline.name}" completed: ${data.rowCount} rows, alert=${alert || 'none'}`);

    return { runId, status: 'success', rowCount: data.rowCount, alert };
  } catch (err) {
    await updateRun(runId, 'failed', null, err.message);
    console.error(`[runner] Pipeline "${pipeline.name}" failed:`, err.message);
    throw err;
  }
}

async function createRun(pipelineId) {
  const { rows } = await pool.query(
    `INSERT INTO pipeline_runs (pipeline_id, status, started_at) VALUES ($1, 'pending', NOW()) RETURNING id`,
    [pipelineId]
  );
  return rows[0].id;
}

async function updateRun(runId, status, result = null, error = null) {
  await pool.query(
    `UPDATE pipeline_runs SET status = $1, result = $2, error = $3, finished_at = CASE WHEN $1 IN ('success', 'failed') THEN NOW() ELSE finished_at END WHERE id = $4`,
    [status, result ? JSON.stringify(result) : null, error, runId]
  );
}
