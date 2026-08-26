const { AppError } = require("../errors");

function notFoundHandler(_req, res) {
  res.status(404).json({
    success: false,
    message: "Route not found",
    error: "NOT_FOUND"
  });
}

function errorHandler(error, _req, res, _next) {
  if (error instanceof SyntaxError && error.status === 400) {
    error = new AppError(400, "INVALID_JSON", "Request body contains invalid JSON");
  }

  const status = error.status || 500;
  if (status >= 500) console.error("Payment request failed:", error);

  res.status(status).json({
    success: false,
    message: status === 500 ? "Internal server error" : error.message,
    error: error.code || "INTERNAL_SERVER_ERROR",
    ...(error.details && { details: error.details })
  });
}

module.exports = { notFoundHandler, errorHandler };
