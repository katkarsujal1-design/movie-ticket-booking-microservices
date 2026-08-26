const express = require("express");
const cors = require("cors");
const { createPaymentRouter } = require("./routes/paymentRoutes");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

function createApp({ paymentService, healthCheck = async () => {} }) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "32kb" }));

  app.get("/", (_req, res) => {
    res.json({ service: "Payment Service", status: "running" });
  });

  app.get("/health", async (_req, res) => {
    try {
      await healthCheck();
      res.json({ status: "UP", service: "payment-service", database: "UP" });
    } catch (_error) {
      res.status(503).json({ status: "DOWN", service: "payment-service", database: "DOWN" });
    }
  });

  app.use("/api/payments", createPaymentRouter(paymentService));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
