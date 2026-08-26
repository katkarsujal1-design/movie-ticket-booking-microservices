const crypto = require("node:crypto");
const config = require("../config");
const { AppError } = require("../errors");
const { mapPayment } = require("../models/Payment");

const PAYMENT_METHODS = new Set(["UPI", "CARD", "NET_BANKING", "WALLET", "CASH"]);
const STATUSES = new Set(["PENDING", "PROCESSING", "SUCCESS", "FAILED", "REFUNDED"]);

function compactId(prefix) {
  const timestamp = Date.now();
  const suffix = crypto.randomInt(1000, 10000);
  return `${prefix}-${timestamp}-${suffix}`;
}

function validateCreatePayment(input) {
  if (!input || typeof input !== "object") throw new AppError(400, "INVALID_REQUEST", "A JSON request body is required");

  const bookingId = String(input.bookingId || "").trim();
  const userId = String(input.userId || "").trim();
  const amount = Number(input.amount);
  const currency = String(input.currency || "INR").trim().toUpperCase();
  const paymentMethod = String(input.paymentMethod || "").trim().toUpperCase();

  const details = [];
  if (!bookingId) details.push("bookingId is required");
  if (!userId) details.push("userId is required");
  if (!Number.isFinite(amount)) details.push("amount is required");
  if (Number.isFinite(amount) && amount <= 0) details.push("amount must be greater than zero");
  if (!PAYMENT_METHODS.has(paymentMethod)) details.push(`paymentMethod must be one of ${Array.from(PAYMENT_METHODS).join(", ")}`);
  if (!currency) details.push("currency is required");

  if (details.length) throw new AppError(400, "INVALID_PAYMENT_REQUEST", "Invalid payment request", details);

  return {
    bookingId,
    userId,
    amount: Number(amount.toFixed(2)),
    currency,
    paymentMethod
  };
}

function simulatePayment(mode = config.paymentSimulationMode) {
  if (mode === "success") return { status: "SUCCESS", failureReason: null };
  if (mode === "failure") return { status: "FAILED", failureReason: "Simulated payment failure" };
  if (mode !== "random") throw new AppError(500, "INVALID_PAYMENT_SIMULATION_MODE", "Payment simulation mode is not configured correctly");
  return Math.random() < 0.9
    ? { status: "SUCCESS", failureReason: null }
    : { status: "FAILED", failureReason: "Simulated payment failure" };
}

function eventTypeFor(payment) {
  if (payment.status === "SUCCESS") return "PAYMENT_SUCCESS";
  if (payment.status === "FAILED") return "PAYMENT_FAILED";
  if (payment.status === "REFUNDED") return "PAYMENT_REFUNDED";
  return null;
}

function createPaymentService({ db, eventPublisher }) {
  async function create(input) {
    const data = validateCreatePayment(input);
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();
      const [existingSuccess] = await connection.query(
        "SELECT payment_id FROM payments WHERE booking_id = ? AND status = 'SUCCESS' LIMIT 1 FOR UPDATE",
        [data.bookingId]
      );
      if (existingSuccess.length) {
        throw new AppError(409, "BOOKING_ALREADY_PAID", "Booking has already been paid");
      }

      const paymentId = compactId("PAY");
      await connection.query(
        "INSERT INTO payments (payment_id, booking_id, user_id, amount, currency, payment_method, status) VALUES (?,?,?,?,?,?, 'PROCESSING')",
        [paymentId, data.bookingId, data.userId, data.amount, data.currency, data.paymentMethod]
      );
      console.log(`Payment created for booking ${data.bookingId}`);

      const result = simulatePayment();
      const transactionId = compactId("TXN");
      await connection.query(
        "UPDATE payments SET status = ?, transaction_id = ?, failure_reason = ? WHERE payment_id = ?",
        [result.status, transactionId, result.failureReason, paymentId]
      );

      const [rows] = await connection.query("SELECT * FROM payments WHERE payment_id = ?", [paymentId]);
      await connection.commit();

      const payment = mapPayment(rows[0]);
      console.log(`Payment ${payment.paymentId} ${payment.status}`);
      const eventType = eventTypeFor(payment);
      if (eventPublisher && eventType) eventPublisher.publish(eventType, payment);

      return {
        success: payment.status === "SUCCESS",
        message: payment.status === "SUCCESS" ? "Payment completed successfully" : "Payment failed",
        payment
      };
    } catch (error) {
      await connection.rollback();
      if (error.code === "ER_DUP_ENTRY") {
        throw new AppError(409, "DUPLICATE_PAYMENT", "A duplicate payment identifier or successful booking payment was detected");
      }
      throw error;
    } finally {
      connection.release();
    }
  }

  async function getByPaymentId(paymentId) {
    const id = String(paymentId || "").trim();
    if (!id) throw new AppError(400, "INVALID_PAYMENT_ID", "paymentId is required");
    const [rows] = await db.query("SELECT * FROM payments WHERE payment_id = ?", [id]);
    if (!rows.length) throw new AppError(404, "PAYMENT_NOT_FOUND", "Payment not found");
    return mapPayment(rows[0]);
  }

  async function getByBookingId(bookingId) {
    const id = String(bookingId || "").trim();
    if (!id) throw new AppError(400, "INVALID_BOOKING_ID", "bookingId is required");
    const [rows] = await db.query("SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at DESC", [id]);
    if (!rows.length) throw new AppError(404, "PAYMENT_NOT_FOUND", "Payment not found for booking");
    return rows.map(mapPayment);
  }

  async function list(query = {}) {
    const page = Math.max(Number.parseInt(query.page || "1", 10), 1);
    const limit = Math.min(Math.max(Number.parseInt(query.limit || "20", 10), 1), 100);
    const offset = (page - 1) * limit;
    const filters = [];
    const params = [];

    if (query.status) {
      const status = String(query.status).toUpperCase();
      if (!STATUSES.has(status)) throw new AppError(400, "INVALID_STATUS", "Invalid payment status filter");
      filters.push("status = ?");
      params.push(status);
    }

    if (query.paymentMethod) {
      const method = String(query.paymentMethod).toUpperCase();
      if (!PAYMENT_METHODS.has(method)) throw new AppError(400, "INVALID_PAYMENT_METHOD", "Invalid payment method filter");
      filters.push("payment_method = ?");
      params.push(method);
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const [countRows] = await db.query(`SELECT COUNT(*) AS total FROM payments ${where}`, params);
    const [rows] = await db.query(
      `SELECT * FROM payments ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      payments: rows.map(mapPayment),
      pagination: { page, limit, total: Number(countRows[0].total), totalPages: Math.ceil(Number(countRows[0].total) / limit) }
    };
  }

  async function refund(paymentId) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const id = String(paymentId || "").trim();
      if (!id) throw new AppError(400, "INVALID_PAYMENT_ID", "paymentId is required");

      const [rows] = await connection.query("SELECT * FROM payments WHERE payment_id = ? FOR UPDATE", [id]);
      if (!rows.length) throw new AppError(404, "PAYMENT_NOT_FOUND", "Payment not found");

      const payment = mapPayment(rows[0]);
      if (payment.status === "REFUNDED") throw new AppError(409, "PAYMENT_ALREADY_REFUNDED", "Payment has already been refunded");
      if (payment.status !== "SUCCESS") throw new AppError(409, "PAYMENT_NOT_REFUNDABLE", "Only successful payments can be refunded");

      await connection.query("UPDATE payments SET status = 'REFUNDED', refunded_at = CURRENT_TIMESTAMP(3) WHERE payment_id = ?", [id]);
      const [updatedRows] = await connection.query("SELECT * FROM payments WHERE payment_id = ?", [id]);
      await connection.commit();

      const refunded = mapPayment(updatedRows[0]);
      console.log(`Payment ${refunded.paymentId} REFUNDED`);
      if (eventPublisher) eventPublisher.publish("PAYMENT_REFUNDED", refunded);
      return refunded;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  return { create, getByPaymentId, getByBookingId, list, refund };
}

module.exports = { createPaymentService, validateCreatePayment, simulatePayment };
