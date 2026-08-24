const test = require("node:test");
const assert = require("node:assert/strict");
const { createBookingService } = require("../src/booking-service");

const request = { userId: 101, showId: 25, movieId: 6, theatreId: 4, seats: ["A1", "A2"] };
const showClient = { getShow: async () => ({ show_id: 25, theatre_id: 4, price: 200 }) };

function connectionWith(query) {
  const state = { began: false, committed: false, rolledBack: false, released: false };
  return {
    state,
    beginTransaction: async () => { state.began = true; },
    commit: async () => { state.committed = true; },
    rollback: async () => { state.rolledBack = true; },
    release: () => { state.released = true; },
    query
  };
}

test("creation calculates price, reserves every seat, and writes the event atomically", async () => {
  const statements = [];
  const connection = connectionWith(async (sql, params) => {
    statements.push({ sql, params });
    if (sql.startsWith("INSERT INTO bookings")) return [{ insertId: 42 }];
    return [{}];
  });
  const service = createBookingService({ db: { getConnection: async () => connection }, showClient });
  const booking = await service.create(request);
  assert.equal(booking.totalAmount, 400);
  assert.equal(booking.status, "CONFIRMED");
  assert.equal(statements.filter(({ sql }) => sql.startsWith("INSERT INTO booking_seats")).length, 2);
  assert.equal(statements.filter(({ sql }) => sql.startsWith("INSERT INTO booking_outbox")).length, 1);
  assert.deepEqual(connection.state, { began: true, committed: true, rolledBack: false, released: true });
});

test("a unique seat conflict rolls the entire booking back", async () => {
  const duplicate = Object.assign(new Error("duplicate"), { code: "ER_DUP_ENTRY" });
  const connection = connectionWith(async (sql) => {
    if (sql.startsWith("INSERT INTO bookings")) return [{ insertId: 42 }];
    if (sql.startsWith("INSERT INTO booking_seats")) throw duplicate;
    return [{}];
  });
  const service = createBookingService({ db: { getConnection: async () => connection }, showClient });
  await assert.rejects(service.create(request), { status: 409, code: "SEAT_ALREADY_BOOKED" });
  assert.equal(connection.state.committed, false);
  assert.equal(connection.state.rolledBack, true);
  assert.equal(connection.state.released, true);
});

test("availability is isolated by show and reflects active reservations", async () => {
  const db = { query: async (_sql, params) => {
    assert.deepEqual(params, [25]);
    return [[{ seat_number: "A1" }]];
  } };
  const service = createBookingService({ db, showClient });
  const result = await service.availability(25);
  assert.equal(result.seats.find((seat) => seat.seatNumber === "A1").status, "BOOKED");
  assert.equal(result.seats.find((seat) => seat.seatNumber === "A2").status, "AVAILABLE");
});

test("cancellation locks the booking, releases seats, and writes an outbox event", async () => {
  const statements = [];
  const row = { id: 42, booking_reference: "MOV-42", user_id: 101, show_id: 25, movie_id: 6, theatre_id: 4, total_amount: 400, status: "CONFIRMED" };
  const connection = connectionWith(async (sql) => {
    statements.push(sql);
    if (sql.includes("FOR UPDATE")) return [[row]];
    if (sql.startsWith("SELECT seat_number")) return [[{ seat_number: "A1", price: 200 }, { seat_number: "A2", price: 200 }]];
    return [{}];
  });
  const service = createBookingService({ db: { getConnection: async () => connection }, showClient });
  const booking = await service.cancel(42);
  assert.equal(booking.status, "CANCELLED");
  assert.ok(statements.some((sql) => sql.startsWith("UPDATE booking_seats SET active = FALSE")));
  assert.ok(statements.some((sql) => sql.startsWith("INSERT INTO booking_outbox")));
  assert.equal(connection.state.committed, true);
});
