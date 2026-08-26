const config = require("./src/config");
const { createApp } = require("./src/app");
const { initializeDatabase, pool } = require("./src/config/database");
const { createPaymentService } = require("./src/services/paymentService");
const { createPaymentEventPublisher } = require("./src/kafka/paymentProducer");

async function start() {
  await initializeDatabase();

  const eventPublisher = createPaymentEventPublisher();
  const paymentService = createPaymentService({ db: pool, eventPublisher });
  const app = createApp({ paymentService, healthCheck: () => pool.query("SELECT 1") });

  const server = app.listen(config.port, "0.0.0.0", () => {
    console.log(`Payment Service running on port ${config.port}`);
  });

  async function shutdown() {
    server.close();
    await eventPublisher.stop();
    await pool.end();
  }

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

start().catch((error) => {
  console.error("Failed to start Payment Service:", error.message);
  process.exit(1);
});
