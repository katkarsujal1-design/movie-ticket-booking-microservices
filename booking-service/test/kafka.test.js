const test = require("node:test");
const assert = require("node:assert/strict");
const { publishPendingEvents } = require("../src/kafka");

test("outbox publisher sends the event and marks it published", async () => {
  const queries = [];
  const db = { query: async (sql, params) => {
    queries.push({ sql, params });
    if (sql.startsWith("SELECT")) return [[{ id: 7, aggregate_id: 42, payload: { eventType: "BOOKING_CONFIRMED" } }]];
    return [{}];
  } };
  const sent = [];
  await publishPendingEvents(db, { send: async (message) => sent.push(message) });
  assert.equal(sent[0].messages[0].key, "42");
  assert.match(sent[0].messages[0].value, /BOOKING_CONFIRMED/);
  assert.ok(queries.some(({ sql }) => sql.includes("published_at = CURRENT_TIMESTAMP")));
});

test("outbox publisher records failed attempts and leaves the event pending", async () => {
  const queries = [];
  const db = { query: async (sql, params) => {
    queries.push({ sql, params });
    if (sql.startsWith("SELECT")) return [[{ id: 7, aggregate_id: 42, payload: "{}" }]];
    return [{}];
  } };
  await assert.rejects(publishPendingEvents(db, { send: async () => { throw new Error("broker unavailable"); } }), /broker unavailable/);
  const failure = queries.find(({ sql }) => sql.includes("last_error = ?"));
  assert.equal(failure.params[0], "broker unavailable");
  assert.equal(failure.params[1], 7);
});
