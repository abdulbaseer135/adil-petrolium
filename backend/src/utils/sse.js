"use strict";

const clientsByCustomer = new Map();

function addClient(customerId, res) {
  const key = String(customerId);
  if (!clientsByCustomer.has(key)) clientsByCustomer.set(key, new Set());
  clientsByCustomer.get(key).add(res);

  // Remove when connection closes
  reqCleanup(res, key);
}

function reqCleanup(res, customerId) {
  res.on('close', () => {
    const set = clientsByCustomer.get(customerId);
    if (set) {
      set.delete(res);
      if (set.size === 0) clientsByCustomer.delete(customerId);
    }
  });
}

function sendEvent(customerId, event, data) {
  const set = clientsByCustomer.get(String(customerId));
  if (!set) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) {
    try {
      res.write(payload);
    } catch (err) {
      // ignore per-client errors
    }
  }
}

module.exports = { addClient, sendEvent };
