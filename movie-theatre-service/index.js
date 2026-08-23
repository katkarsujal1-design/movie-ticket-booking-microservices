const express = require("express");
const cors = require("cors");
const { initializeDatabase, pool } = require("./db");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3001;

app.get("/", (req, res) => {
  res.json({
    service: "Movie Theatre Service",
    status: "running"
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy"
  });
});

app.get("/movies", async (req, res) => {
  try {
    const [movies] = await pool.query(
      "SELECT id, title, language, genre, duration, description, poster_url FROM movies ORDER BY id"
    );
    res.json(movies);
  } catch (error) {
    console.error("Failed to fetch movies:", error.message);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/cities", async (req, res) => {
  try {
    const [cities] = await pool.query(
      "SELECT DISTINCT city FROM theatres ORDER BY city"
    );
    res.json(cities.map((row) => row.city));
  } catch (error) {
    console.error("Failed to fetch cities:", error.message);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/movies/:id", async (req, res) => {
  try {
    const [movies] = await pool.query(
      "SELECT id, title, language, genre, duration, description, poster_url FROM movies WHERE id = ?",
      [req.params.id]
    );

    if (movies.length === 0) {
      return res.status(404).json({ error: "Movie not found" });
    }

    res.json(movies[0]);
  } catch (error) {
    console.error("Failed to fetch movie:", error.message);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/movies/:movieId/shows", async (req, res) => {
  try {
    const { city } = req.query;
    const params = [req.params.movieId];
    let cityFilter = "";

    if (city) {
      cityFilter = "AND t.city = ?";
      params.push(city);
    }

    const [movieRows] = await pool.query("SELECT id FROM movies WHERE id = ?", [
      req.params.movieId
    ]);

    if (movieRows.length === 0) {
      return res.status(404).json({ error: "Movie not found" });
    }

    const [shows] = await pool.query(
      `
        SELECT
          s.id AS show_id,
          t.id AS theatre_id,
          t.name AS theatre_name,
          t.city,
          t.location,
          DATE_FORMAT(s.show_date, '%Y-%m-%d') AS show_date,
          TIME_FORMAT(s.show_time, '%H:%i:%s') AS show_time,
          CAST(s.price AS DOUBLE) AS price
        FROM shows s
        JOIN theatres t ON s.theatre_id = t.id
        WHERE s.movie_id = ?
        ${cityFilter}
        ORDER BY s.show_date, t.name, s.show_time
      `,
      params
    );

    res.json(shows);
  } catch (error) {
    console.error("Failed to fetch shows:", error.message);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/movies", async (req, res) => {
  try {
    const { title, language, genre, duration, description, poster_url } = req.body;

    if (!title || !language || !genre || !duration) {
      return res.status(400).json({ error: "Missing required movie fields" });
    }

    const [result] = await pool.query(
      "INSERT INTO movies (title, language, genre, duration, description, poster_url) VALUES (?, ?, ?, ?, ?, ?)",
      [title, language, genre, duration, description || null, poster_url || null]
    );

    res.status(201).json({ id: result.insertId });
  } catch (error) {
    console.error("Failed to create movie:", error.message);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/theatres", async (req, res) => {
  try {
    const { name, city, location } = req.body;

    if (!name || !city || !location) {
      return res.status(400).json({ error: "Missing required theatre fields" });
    }

    const [result] = await pool.query(
      "INSERT INTO theatres (name, city, location) VALUES (?, ?, ?)",
      [name, city, location]
    );

    res.status(201).json({ id: result.insertId });
  } catch (error) {
    console.error("Failed to create theatre:", error.message);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/shows", async (req, res) => {
  try {
    const { movie_id, theatre_id, show_date, show_time, price } = req.body;

    if (!movie_id || !theatre_id || !show_date || !show_time || !price) {
      return res.status(400).json({ error: "Missing required show fields" });
    }

    const [result] = await pool.query(
      "INSERT INTO shows (movie_id, theatre_id, show_date, show_time, price) VALUES (?, ?, ?, ?, ?)",
      [movie_id, theatre_id, show_date, show_time, price]
    );

    res.status(201).json({ id: result.insertId });
  } catch (error) {
    console.error("Failed to create show:", error.message);
    res.status(500).json({ error: "Database error" });
  }
});

async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Movie Theatre Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start Movie Theatre Service:", error.message);
    process.exit(1);
  }
}

startServer();
