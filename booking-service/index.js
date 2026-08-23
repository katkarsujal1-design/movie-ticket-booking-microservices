const express = require("express");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3002;

app.get("/", (req, res) => {
  res.json({
    service: "Booking Service",
    status: "running"
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Booking Service running on port ${PORT}`);
});
