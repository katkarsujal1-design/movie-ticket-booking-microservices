const { Kafka, logLevel } = require("kafkajs");
const config = require("./config");

async function publishPendingEvents(db, producer) {
  const [rows] = await db.query("SELECT id, aggregate_id, payload FROM booking_outbox WHERE published_at IS NULL ORDER BY id LIMIT 50");
  for (const row of rows) {
    try {
      await producer.send({ topic: config.bookingTopic, messages: [{ key: String(row.aggregate_id), value: typeof row.payload === "string" ? row.payload : JSON.stringify(row.payload) }] });
      await db.query("UPDATE booking_outbox SET published_at = CURRENT_TIMESTAMP(3), attempts = attempts + 1, last_error = NULL WHERE id = ? AND published_at IS NULL", [row.id]);
    } catch (error) {
      await db.query("UPDATE booking_outbox SET attempts = attempts + 1, last_error = ? WHERE id = ? AND published_at IS NULL", [String(error.message).slice(0, 500), row.id]);
      throw error;
    }
  }
}

function createKafkaPublisher(db, suppliedProducer) {
  const producer = suppliedProducer || new Kafka({ clientId: "booking-service", brokers: [config.kafkaBroker], logLevel: logLevel.WARN }).producer();
  let timer;
  let stopped = false;
  let connected = false;

  async function publishBatch() {
    if (stopped) return;
    try {
      if (!connected) { await producer.connect(); connected = true; }
      await publishPendingEvents(db, producer);
    } catch (error) {
      console.error("Kafka outbox publishing failed:", error.message);
    } finally {
      if (!stopped) timer = setTimeout(publishBatch, config.outboxPollIntervalMs);
    }
  }

  return {
    start() { publishBatch(); },
    async stop() { stopped = true; clearTimeout(timer); if (connected) await producer.disconnect(); }
  };
}

module.exports = { createKafkaPublisher, publishPendingEvents };
