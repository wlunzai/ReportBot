import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { chatRouter } from './chat.js';

describe('POST /api/chat/start', () => {
  it('verifies chat router exists and is a function', async () => {
    assert.ok(chatRouter);
    assert.equal(typeof chatRouter, 'function');
  });
});

describe('chatRouter', () => {
  it('exports a valid Express router', () => {
    assert.ok(chatRouter);
    assert.equal(typeof chatRouter, 'function');
  });
});
