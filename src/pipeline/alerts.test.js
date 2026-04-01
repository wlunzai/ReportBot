import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAlert } from './alerts.js';

describe('evaluateAlert', () => {
  const data = {
    columns: ['name', 'revenue', 'count'],
    rows: [
      { name: 'Widget A', revenue: 1500, count: 10 },
      { name: 'Widget B', revenue: 500, count: 3 },
    ],
    rowCount: 2,
  };

  it('triggers when a value exceeds threshold', () => {
    const result = evaluateAlert('revenue > 1000', data);
    assert.ok(result);
    assert.match(result, /revenue > 1000 triggered/);
  });

  it('returns null when no values match', () => {
    const result = evaluateAlert('revenue > 2000', data);
    assert.equal(result, null);
  });

  it('supports < operator', () => {
    const result = evaluateAlert('count < 5', data);
    assert.ok(result);
    assert.match(result, /count < 5 triggered/);
  });

  it('supports row_count check', () => {
    const result = evaluateAlert('row_count > 0', data);
    assert.ok(result);
    assert.match(result, /row_count/);
  });

  it('row_count == 0 does not trigger when rows exist', () => {
    const result = evaluateAlert('row_count == 0', data);
    assert.equal(result, null);
  });

  it('handles empty data', () => {
    const emptyData = { columns: [], rows: [], rowCount: 0 };
    const result = evaluateAlert('row_count == 0', emptyData);
    assert.ok(result);
  });

  it('returns null for invalid conditions', () => {
    assert.equal(evaluateAlert('invalid format here', data), null);
  });
});
