import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('health', () => {
  it('exports a router', async () => {
    const { healthRouter } = await import('./health.js');
    assert.ok(healthRouter);
    assert.equal(typeof healthRouter, 'function');
  });
});
