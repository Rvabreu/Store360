'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { DEMO_TRANSITIONS, currentStatus, getOrderForUser, getOrdersForUser, loadData, sortedEvents, validateData } = require('../src/orders');
const { escapeHtml } = require('../src/views');

const data = loadData();

test('fixture timelines are sorted oldest-to-newest and status comes from final event', () => {
  const order = data.orders.find((candidate) => candidate.id === 'DEMO-1001');
  const events = sortedEvents(order.events);
  assert.deepEqual(events.map((event) => event.status), ['confirmed', 'processing', 'shipped']);
  assert.equal(currentStatus(order), 'shipped');
  assert.ok(events.every((event, index) => index === 0 || Date.parse(events[index - 1].at) <= Date.parse(event.at)));
});

test('fixture-only transition graph permits only its example transitions', () => {
  assert.deepEqual(DEMO_TRANSITIONS.confirmed, ['processing']);
  assert.throws(() => validateData({
    users: [{ id: 'u' }],
    orders: [{ id: 'x', userId: 'u', events: [
      { status: 'confirmed', at: '2026-01-01T00:00:00Z' },
      { status: 'delivered', at: '2026-01-02T00:00:00Z' },
    ] }],
  }), /invalid demo transition: confirmed -> delivered/);
});

test('equal timestamps retain fixture order deterministically', () => {
  const events = sortedEvents([
    { status: 'processing', at: '2026-01-01T00:00:00Z' },
    { status: 'confirmed', at: '2026-01-01T00:00:00Z' },
  ]);
  assert.deepEqual(events.map((event) => event.status), ['processing', 'confirmed']);
});

test('orders are filtered by owner on both list and detail lookup', () => {
  assert.deepEqual(getOrdersForUser(data, 'ana-demo').map((order) => order.id), ['DEMO-1001', 'DEMO-1002']);
  assert.equal(getOrderForUser(data, 'ana-demo', 'DEMO-2001'), null);
  assert.equal(getOrderForUser(data, 'ana-demo', 'missing'), null);
  assert.equal(getOrderForUser(data, 'bruno-demo', 'DEMO-2001').id, 'DEMO-2001');
});

test('HTML text escaping prevents fixture values from becoming markup', () => {
  assert.equal(escapeHtml(`<tag attr="x" & 'y'>`), '&lt;tag attr=&quot;x&quot; &amp; &#39;y&#39;&gt;');
});
