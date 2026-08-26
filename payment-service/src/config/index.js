require("dotenv").config({ quiet: true });

const port = Number(process.env.PORT || 3003);

module.exports = {
  port,
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || process.env.DB_USERNAME || "root",
    password: process.env.DB_PASSWORD || "root",
    database: process.env.DB_NAME || "payment_db"
  },
  paymentSimulationMode: (process.env.PAYMENT_SIMULATION_MODE || "random").toLowerCase(),
  kafka: {
    broker: process.env.KAFKA_BROKER || process.env.KAFKA_BOOTSTRAP_SERVERS || "localhost:9092",
    clientId: process.env.KAFKA_CLIENT_ID || "payment-service",
    successTopic: process.env.PAYMENT_SUCCESS_TOPIC || "payment.success",
    failedTopic: process.env.PAYMENT_FAILED_TOPIC || "payment.failed",
    refundedTopic: process.env.PAYMENT_REFUNDED_TOPIC || "payment.refunded"
  }
};
