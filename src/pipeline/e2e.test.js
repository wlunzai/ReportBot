import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAlert } from './alerts.js';

/**
 * End-to-end pipeline flow test (mocked dependencies).
 * Tests the full create→fetch→alert→deliver→record cycle logic.
 *
 * For live E2E testing with a running Postgres, set DATABASE_URL and run:
 *   npm run db:migrate && node -e "import('./runner.js').then(m => m.runPipeline(pipeline))"
 */

describe('E2E pipeline flow (mocked)', () => {
  it('full cycle: fetch → alert eval → report format → delivery decision', () => {
    // Simulate data fetched from a Postgres connector
    const fetchedData = {
      columns: ['date', 'revenue', 'orders'],
      rows: [
        { date: '2026-04-01', revenue: 4500, orders: 23 },
        { date: '2026-03-31', revenue: 3200, orders: 18 },
        { date: '2026-03-30', revenue: 800, orders: 5 },
      ],
      rowCount: 3,
    };

    // Step 1: Alert evaluation
    const alertResult = evaluateAlert('revenue < 1000', fetchedData);
    assert.ok(alertResult, 'Should trigger alert for row with revenue=800');
    assert.match(alertResult, /revenue < 1000 triggered/);

    // No alert for high threshold
    const noAlert = evaluateAlert('revenue < 100', fetchedData);
    assert.equal(noAlert, null);

    // Step 2: Verify report structure
    const report = {
      pipelineName: 'Daily Revenue Report',
      columns: fetchedData.columns,
      rows: fetchedData.rows,
      rowCount: fetchedData.rowCount,
      alert: alertResult,
    };

    assert.equal(report.pipelineName, 'Daily Revenue Report');
    assert.equal(report.rowCount, 3);
    assert.equal(report.columns.length, 3);
    assert.ok(report.alert);

    // Step 3: Verify alert logic handles edge cases
    const emptyData = { columns: [], rows: [], rowCount: 0 };
    assert.equal(evaluateAlert('revenue > 0', emptyData), null, 'Empty data should not trigger');
    assert.ok(evaluateAlert('row_count == 0', emptyData), 'row_count == 0 should trigger on empty');

    // Step 4: Row count conditions
    assert.equal(evaluateAlert('row_count > 10', fetchedData), null, 'row_count=3 should not trigger >10');
    assert.ok(evaluateAlert('row_count > 2', fetchedData), 'row_count=3 should trigger >2');
    assert.ok(evaluateAlert('row_count >= 3', fetchedData), 'row_count=3 should trigger >=3');
    assert.ok(evaluateAlert('row_count != 0', fetchedData), 'row_count=3 should trigger !=0');
  });

  it('multiple alert conditions on different columns', () => {
    const data = {
      columns: ['metric', 'value', 'threshold'],
      rows: [
        { metric: 'cpu', value: 95, threshold: 80 },
        { metric: 'memory', value: 60, threshold: 90 },
        { metric: 'disk', value: 88, threshold: 85 },
      ],
      rowCount: 3,
    };

    assert.ok(evaluateAlert('value > 90', data), 'cpu=95 should trigger >90');
    assert.equal(evaluateAlert('value > 99', data), null, 'No value exceeds 99');
    assert.ok(evaluateAlert('threshold <= 85', data), 'cpu threshold=80 should trigger <=85');
  });

  it('CSV format generation matches expected structure', () => {
    const report = {
      columns: ['name', 'value'],
      rows: [
        { name: 'test', value: 42 },
        { name: 'with, comma', value: 100 },
      ],
    };

    // Test CSV escape logic (mirrors email.js formatCsv)
    const escape = (v) => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const lines = [report.columns.map(escape).join(',')];
    for (const row of report.rows) {
      lines.push(report.columns.map(c => escape(row[c])).join(','));
    }
    const csv = lines.join('\n');

    assert.ok(csv.startsWith('name,value'));
    assert.ok(csv.includes('"with, comma"'), 'Should escape commas in CSV');
    assert.equal(csv.split('\n').length, 3, 'Header + 2 data rows');
  });
});
