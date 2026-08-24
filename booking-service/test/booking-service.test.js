const test = require("node:test");
const assert = require("node:assert/strict");
const { validateRequest } = require("../src/booking-service");

const valid = { userId: 101, showId: 25, movieId: 6, theatreId: 4, seats: ["A1", "A2"] };

test("valid booking input is normalized", () => {
  assert.deepEqual(validateRequest({ ...valid, seats: [" a1 ", "A2"] }), valid);
});

test("empty seats fail validation", () => {
  assert.throws(() => validateRequest({ ...valid, seats: [] }), { code: "INVALID_SEATS", status: 400 });
});

test("duplicate seats fail validation after normalization", () => {
  assert.throws(() => validateRequest({ ...valid, seats: ["A1", "a1"] }), { code: "DUPLICATE_SEATS", status: 400 });
});

test("invalid identifiers and seat formats fail validation", () => {
  assert.throws(() => validateRequest({ ...valid, userId: 0 }), { code: "INVALID_REQUEST" });
  assert.throws(() => validateRequest({ ...valid, seats: ["front-row"] }), { code: "INVALID_SEATS" });
  assert.throws(() => validateRequest({ ...valid, seats: ["Z99"] }), { code: "INVALID_SEATS" });
});
