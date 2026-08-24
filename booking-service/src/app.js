const express = require("express");
const cors = require("cors");
const { AppError } = require("./errors");

function createApp({ service, healthCheck = async () => {} }) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "32kb" }));

  app.get("/", (_req, res) => res.json({ service: "Booking Service", status: "running" }));
  app.get("/health", async (_req, res) => {
    try { await healthCheck(); res.json({ status: "healthy" }); }
    catch (_error) { res.status(503).json({ status: "unhealthy" }); }
  });
  app.post("/api/bookings", async (req, res) => res.status(201).json(await service.create(req.body)));
  app.get("/api/bookings/user/:userId", async (req, res) => res.json(await service.listForUser(req.params.userId)));
  app.get("/api/bookings/:bookingId", async (req, res) => res.json(await service.getById(req.params.bookingId)));
  app.put("/api/bookings/:bookingId/cancel", async (req, res) => res.json(await service.cancel(req.params.bookingId)));
  app.get("/api/shows/:showId/seats", async (req, res) => res.json(await service.availability(req.params.showId)));

  app.use((_req, res) => res.status(404).json({ timestamp: new Date().toISOString(), status: 404, error: "NOT_FOUND", message: "Route not found" }));
  app.use((error, _req, res, _next) => {
    if (error instanceof SyntaxError && error.status === 400) error = new AppError(400, "INVALID_JSON", "Request body contains invalid JSON");
    const status = error.status || 500;
    if (status >= 500) console.error("Booking request failed:", error.message);
    res.status(status).json({ timestamp: new Date().toISOString(), status, error: error.code || "INTERNAL_ERROR", message: status === 500 ? "An unexpected error occurred" : error.message, ...(error.details && { details: error.details }) });
  });
  return app;
}

module.exports = { createApp };
