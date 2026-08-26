const express = require("express");
const { createPaymentController } = require("../controllers/paymentController");

function createPaymentRouter(paymentService) {
  const router = express.Router();
  const controller = createPaymentController(paymentService);

  router.post("/", controller.createPayment);
  router.get("/", controller.listPayments);
  router.get("/booking/:bookingId", controller.getPaymentByBooking);
  router.get("/:paymentId/status", controller.getPaymentStatus);
  router.post("/:paymentId/refund", controller.refundPayment);
  router.get("/:paymentId", controller.getPayment);

  return router;
}

module.exports = { createPaymentRouter };
