function seatLayout() {
  const rows = (process.env.SEAT_ROWS || "A,B,C,D,E,F,G,H").split(",").map((row) => row.trim().toUpperCase()).filter(Boolean);
  const seatsPerRow = Number(process.env.SEATS_PER_ROW || 10);
  return rows.flatMap((row) => Array.from({ length: seatsPerRow }, (_, index) => `${row}${index + 1}`));
}

module.exports = {
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || process.env.DB_USERNAME || "root",
    password: process.env.DB_PASSWORD || "root",
    database: process.env.DB_NAME || "booking_db"
  },
  theatreServiceUrl: process.env.THEATRE_SERVICE_URL || "http://localhost:3001",
  kafkaBroker: process.env.KAFKA_BROKER || process.env.KAFKA_BOOTSTRAP_SERVERS || "localhost:9092",
  bookingTopic: process.env.BOOKING_EVENTS_TOPIC || "booking-events",
  outboxPollIntervalMs: Number(process.env.OUTBOX_POLL_INTERVAL_MS || 1000),
  seatLayout
};
