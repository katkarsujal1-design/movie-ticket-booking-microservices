const { createApp } = require("./src/app");
const { initializeDatabase, pool } = require("./src/db");
const { createKafkaPublisher } = require("./src/kafka");
const { createBookingService } = require("./src/booking-service");

const port = Number(process.env.PORT || 3002);

async function start() {
  await initializeDatabase();
  const publisher = createKafkaPublisher(pool);
  const service = createBookingService({ db: pool });
  const app = createApp({ service, healthCheck: () => pool.query("SELECT 1") });
  const server = app.listen(port, "0.0.0.0", () => console.log(`Booking Service running on port ${port}`));
  publisher.start();

  async function shutdown() {
    server.close();
    await publisher.stop();
    await pool.end();
  }
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

start().catch((error) => {
  console.error("Failed to start Booking Service:", error.message);
  process.exit(1);
});
