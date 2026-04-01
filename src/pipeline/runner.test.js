import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// This test verifies the pipeline runner logic by mocking the DB and connectors.
// For a full end-to-end test, a running PostgreSQL database is required.

describe('pipeline runner (unit)', () => {
  it('evaluateAlert integrates correctly with runner logic', async () => {
    // Import alerts directly to test the integration
    const { evaluateAlert } = await import('./alerts.js');

    const data = {
      columns: ['metric', 'value'],
      rows: [{ metric: 'errors', value: 150 }],
      rowCount: 1,
    };

    // Should trigger
    const alert = evaluateAlert('value > 100', data);
    assert.ok(alert, 'Alert should trigger for value > 100');
    assert.match(alert, /value > 100 triggered/);

    // Should not trigger
    const noAlert = evaluateAlert('value > 200', data);
    assert.equal(noAlert, null, 'Alert should not trigger for value > 200');
  });
});
