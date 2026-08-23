const express = require("express");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3004;

app.get("/", (req, res) => {
  res.json({
    service: "Notification Service",
    status: "running"
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Notification Service running on port ${PORT}`);
});
