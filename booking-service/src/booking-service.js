const crypto = require("node:crypto");
const config = require("./config");
const theatreClient = require("./theatre-client");
const { AppError } = require("./errors");

const SEAT_PATTERN = /^[A-Z]{1,2}[1-9][0-9]?$/;

function positiveId(value, field) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new AppError(400, "INVALID_REQUEST", `${field} must be a positive integer`);
  }
  return parsed;
}

function validateRequest(input) {
  if (!input || typeof input !== "object") throw new AppError(400, "INVALID_REQUEST", "A JSON request body is required");
  const data = {
    userId: positiveId(input.userId, "userId"),
    showId: positiveId(input.showId, "showId"),
    movieId: positiveId(input.movieId, "movieId"),
    theatreId: positiveId(input.theatreId, "theatreId")
  };
  if (!Array.isArray(input.seats) || input.seats.length === 0) {
    throw new AppError(400, "INVALID_SEATS", "At least one seat must be selected");
  }
  data.seats = input.seats.map((seat) => typeof seat === "string" ? seat.trim().toUpperCase() : "");
  if (data.seats.some((seat) => !SEAT_PATTERN.test(seat))) {
    throw new AppError(400, "INVALID_SEATS", "Every seat must use a format such as A1");
  }
  if (new Set(data.seats).size !== data.seats.length) {
    throw new AppError(400, "DUPLICATE_SEATS", "The same seat cannot be selected more than once");
  }
  const allowed = new Set(config.seatLayout());
  const unknown = data.seats.filter((seat) => !allowed.has(seat));
  if (unknown.length) throw new AppError(400, "INVALID_SEATS", `Unknown seats: ${unknown.join(", ")}`);
  return data;
}

function mapBooking(row, seats = []) {
  return {
    id: Number(row.id),
    bookingReference: row.booking_reference,
    userId: Number(row.user_id),
    showId: Number(row.show_id),
    movieId: Number(row.movie_id),
    theatreId: Number(row.theatre_id),
    seats: seats.map((seat) => ({ seatNumber: seat.seat_number, price: Number(seat.price) })),
    totalAmount: Number(row.total_amount),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function eventFor(eventType, booking) {
  return {
    eventType,
    bookingId: booking.id,
    bookingReference: booking.bookingReference,
    userId: booking.userId,
    showId: booking.showId,
    movieId: booking.movieId,
    theatreId: booking.theatreId,
    seats: booking.seats.map((seat) => seat.seatNumber),
    totalAmount: booking.totalAmount,
    status: booking.status,
    timestamp: new Date().toISOString()
  };
}

function createBookingService({ db, showClient = theatreClient }) {
  async function getById(id, executor = db) {
    const bookingId = positiveId(id, "bookingId");
    const [rows] = await executor.query("SELECT * FROM bookings WHERE id = ?", [bookingId]);
    if (!rows.length) throw new AppError(404, "BOOKING_NOT_FOUND", "Booking not found");
    const [seats] = await executor.query("SELECT seat_number, price FROM booking_seats WHERE booking_id = ? ORDER BY seat_number", [bookingId]);
    return mapBooking(rows[0], seats);
  }

  async function create(input) {
    const data = validateRequest(input);
    const show = await showClient.getShow(data.movieId, data.showId);
    if (Number(show.theatre_id) !== data.theatreId) {
      throw new AppError(400, "SHOW_MISMATCH", "The show does not belong to the selected theatre");
    }
    const price = Number(show.price);
    if (!Number.isFinite(price) || price < 0) throw new AppError(502, "INVALID_SHOW_PRICE", "Theatre Service returned an invalid show price");
    const total = Number((price * data.seats.length).toFixed(2));
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const reference = `MOV-${crypto.randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`;
      const [result] = await connection.query(
        "INSERT INTO bookings (booking_reference,user_id,show_id,movie_id,theatre_id,total_amount,status) VALUES (?,?,?,?,?,?, 'CONFIRMED')",
        [reference, data.userId, data.showId, data.movieId, data.theatreId, total]
      );
      for (const seat of data.seats) {
        await connection.query("INSERT INTO booking_seats (booking_id,show_id,seat_number,price) VALUES (?,?,?,?)", [result.insertId, data.showId, seat, price]);
      }
      const booking = {
        id: Number(result.insertId), bookingReference: reference, ...data,
        seats: data.seats.map((seatNumber) => ({ seatNumber, price })),
        totalAmount: total, status: "CONFIRMED"
      };
      await connection.query("INSERT INTO booking_outbox (aggregate_id,event_type,payload) VALUES (?,?,?)", [booking.id, "BOOKING_CONFIRMED", JSON.stringify(eventFor("BOOKING_CONFIRMED", booking))]);
      await connection.commit();
      console.log(`Booking ${reference} confirmed for show ${data.showId}`);
      return booking;
    } catch (error) {
      await connection.rollback();
      if (error.code === "ER_DUP_ENTRY") {
        console.warn(`Seat conflict for show ${data.showId}`);
        throw new AppError(409, "SEAT_ALREADY_BOOKED", "One or more selected seats are already booked");
      }
      throw error;
    } finally {
      connection.release();
    }
  }

  async function listForUser(userId) {
    const id = positiveId(userId, "userId");
    const [rows] = await db.query("SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC", [id]);
    if (!rows.length) return [];
    const ids = rows.map((row) => row.id);
    const [seatRows] = await db.query("SELECT booking_id, seat_number, price FROM booking_seats WHERE booking_id IN (?) ORDER BY seat_number", [ids]);
    return rows.map((row) => mapBooking(row, seatRows.filter((seat) => Number(seat.booking_id) === Number(row.id))));
  }

  async function availability(showId) {
    const id = positiveId(showId, "showId");
    const [rows] = await db.query("SELECT seat_number FROM booking_seats WHERE show_id = ? AND active = TRUE", [id]);
    const booked = new Set(rows.map((row) => row.seat_number));
    return { showId: id, seats: config.seatLayout().map((seatNumber) => ({ seatNumber, status: booked.has(seatNumber) ? "BOOKED" : "AVAILABLE" })) };
  }

  async function cancel(id) {
    const bookingId = positiveId(id, "bookingId");
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.query("SELECT * FROM bookings WHERE id = ? FOR UPDATE", [bookingId]);
      if (!rows.length) throw new AppError(404, "BOOKING_NOT_FOUND", "Booking not found");
      if (rows[0].status === "CANCELLED") throw new AppError(409, "INVALID_BOOKING_STATE", "Booking is already cancelled");
      await connection.query("UPDATE booking_seats SET active = FALSE WHERE booking_id = ? AND active = TRUE", [bookingId]);
      await connection.query("UPDATE bookings SET status = 'CANCELLED' WHERE id = ?", [bookingId]);
      rows[0].status = "CANCELLED";
      const [seats] = await connection.query("SELECT seat_number, price FROM booking_seats WHERE booking_id = ? ORDER BY seat_number", [bookingId]);
      const booking = mapBooking(rows[0], seats);
      await connection.query("INSERT INTO booking_outbox (aggregate_id,event_type,payload) VALUES (?,?,?)", [bookingId, "BOOKING_CANCELLED", JSON.stringify(eventFor("BOOKING_CANCELLED", booking))]);
      await connection.commit();
      console.log(`Booking ${booking.bookingReference} cancelled`);
      return booking;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  return { create, getById, listForUser, availability, cancel };
}

module.exports = { createBookingService, validateRequest };
