const test = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../src/app");

async function withServer(service, run) {
  const server = createApp({ service }).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

test("create endpoint returns a booking", async () => {
  const booking = { id: 1, bookingReference: "MOV-TEST", status: "CONFIRMED" };
  await withServer({ create: async () => booking }, async (base) => {
    const response = await fetch(`${base}/api/bookings`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), booking);
  });
});

test("application errors use the standard error response", async () => {
  const error = Object.assign(new Error("Booking not found"), { status: 404, code: "BOOKING_NOT_FOUND" });
  await withServer({ getById: async () => { throw error; } }, async (base) => {
    const response = await fetch(`${base}/api/bookings/999`);
    const body = await response.json();
    assert.equal(response.status, 404);
    assert.equal(body.error, "BOOKING_NOT_FOUND");
  });
});

test("health endpoint reports database failure", async () => {
  const app = createApp({ service: {}, healthCheck: async () => { throw new Error("down"); } });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/health`);
    assert.equal(response.status, 503);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
