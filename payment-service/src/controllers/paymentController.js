function createPaymentController(paymentService) {
  return {
    async createPayment(req, res) {
      const result = await paymentService.create(req.body);
      res.status(201).json(result);
    },

    async getPayment(req, res) {
      const payment = await paymentService.getByPaymentId(req.params.paymentId);
      res.json({ success: true, payment });
    },

    async getPaymentByBooking(req, res) {
      const payments = await paymentService.getByBookingId(req.params.bookingId);
      res.json({ success: true, payments });
    },

    async listPayments(req, res) {
      const data = await paymentService.list(req.query);
      res.json({ success: true, data });
    },

    async getPaymentStatus(req, res) {
      const payment = await paymentService.getByPaymentId(req.params.paymentId);
      res.json({ paymentId: payment.paymentId, status: payment.status });
    },

    async refundPayment(req, res) {
      const payment = await paymentService.refund(req.params.paymentId);
      res.json({
        success: true,
        message: "Payment refunded successfully",
        paymentId: payment.paymentId,
        status: payment.status,
        payment
      });
    }
  };
}

module.exports = { createPaymentController };
