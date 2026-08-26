function mapPayment(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    paymentId: row.payment_id,
    bookingId: row.booking_id,
    userId: row.user_id,
    amount: Number(row.amount),
    currency: row.currency,
    paymentMethod: row.payment_method,
    transactionId: row.transaction_id,
    status: row.status,
    failureReason: row.failure_reason,
    refundedAt: row.refunded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = { mapPayment };
