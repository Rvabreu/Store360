'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Fixture-only example. This is not a claim about any real store's workflow.
const DEMO_TRANSITIONS = Object.freeze({
  confirmed: Object.freeze(['processing']),
  processing: Object.freeze(['shipped']),
  shipped: Object.freeze(['delivered']),
  delivered: Object.freeze([]),
});

function loadData(filePath = path.join(__dirname, '..', 'data', 'orders.json')) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  validateData(data);
  return data;
}

function validateData(data) {
  if (!data || !Array.isArray(data.users) || !Array.isArray(data.orders)) {
    throw new Error('Demo data must contain users and orders arrays');
  }
  const userIds = new Set(data.users.map((user) => user.id));
  const orderIds = new Set();
  for (const order of data.orders) {
    if (!order.id || orderIds.has(order.id)) throw new Error('Order IDs must be present and unique');
    if (!userIds.has(order.userId)) throw new Error(`Order ${order.id} has no demo owner`);
    if (!Array.isArray(order.events) || order.events.length === 0) {
      throw new Error(`Order ${order.id} must have at least one status event`);
    }
    orderIds.add(order.id);
    const events = order.events.map((event, index) => ({ ...event, index }))
      .sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.index - b.index);
    if (events.some((event) => !Number.isFinite(Date.parse(event.at)) || !DEMO_TRANSITIONS[event.status])) {
      throw new Error(`Order ${order.id} has an invalid status event`);
    }
    for (let index = 1; index < events.length; index += 1) {
      const previous = events[index - 1].status;
      if (!DEMO_TRANSITIONS[previous].includes(events[index].status)) {
        throw new Error(`Order ${order.id} has an invalid demo transition: ${previous} -> ${events[index].status}`);
      }
    }
  }
}

function getOrdersForUser(data, userId) {
  return data.orders.filter((order) => order.userId === userId)
    .map((order) => ({ ...order, events: sortedEvents(order.events) }));
}

function getOrderForUser(data, userId, orderId) {
  const order = data.orders.find((candidate) => candidate.id === orderId && candidate.userId === userId);
  return order ? { ...order, events: sortedEvents(order.events) } : null;
}

function sortedEvents(events) {
  return events.map((event, index) => ({ event, index }))
    .sort((a, b) => Date.parse(a.event.at) - Date.parse(b.event.at) || a.index - b.index)
    .map(({ event }) => ({ ...event }));
}

function currentStatus(order) {
  const events = sortedEvents(order.events);
  return events[events.length - 1].status;
}

module.exports = {
  DEMO_TRANSITIONS,
  currentStatus,
  getOrderForUser,
  getOrdersForUser,
  loadData,
  sortedEvents,
  validateData,
};
