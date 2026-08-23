const mysql = require("mysql2/promise");

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "root",
  database: process.env.DB_NAME || "movie_db",
  waitForConnections: true,
  connectionLimit: 10
};

async function initializeDatabase() {
  const databaseName = process.env.DB_NAME || "movie_db";
  const setupConnection = await mysql.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password
  });

  await setupConnection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
  await setupConnection.end();

  const connection = await mysql.createConnection(dbConfig);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS movies (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(150) NOT NULL,
      language VARCHAR(50) NOT NULL,
      genre VARCHAR(80) NOT NULL,
      duration VARCHAR(30) NOT NULL,
      description TEXT,
      poster_url VARCHAR(500)
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS theatres (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      city VARCHAR(80) NOT NULL,
      location VARCHAR(150) NOT NULL
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS shows (
      id INT AUTO_INCREMENT PRIMARY KEY,
      movie_id INT NOT NULL,
      theatre_id INT NOT NULL,
      show_date DATE NOT NULL,
      show_time TIME NOT NULL,
      price DECIMAL(8, 2) NOT NULL,
      FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
      FOREIGN KEY (theatre_id) REFERENCES theatres(id) ON DELETE CASCADE
    )
  `);

  await connection.query(`
    INSERT IGNORE INTO movies
      (id, title, language, genre, duration, description, poster_url)
    VALUES
      (1, 'Avengers: Endgame', 'English', 'Action/Sci-Fi', '3h 1m', 'The Avengers assemble one final time to reverse Thanos'' actions and restore balance.', 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg'),
      (2, 'Interstellar', 'English', 'Sci-Fi/Drama', '2h 49m', 'A team of explorers travels through a wormhole in search of a new home for humanity.', 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg'),
      (3, 'Inception', 'English', 'Sci-Fi/Thriller', '2h 28m', 'A skilled thief enters dreams to steal secrets and attempts one last impossible job.', 'https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg')
  `);

  await connection.query(`
    INSERT IGNORE INTO theatres
      (id, name, city, location)
    VALUES
      (1, 'PVR Cinemas', 'Pune', 'Phoenix Mall'),
      (2, 'INOX', 'Pune', 'City Mall'),
      (3, 'Cinepolis', 'Pune', 'Seasons Mall')
  `);

  await connection.query(`
    INSERT IGNORE INTO shows
      (id, movie_id, theatre_id, show_date, show_time, price)
    VALUES
      (1, 1, 1, '2026-08-25', '10:00:00', 220.00),
      (2, 1, 1, '2026-08-25', '14:30:00', 250.00),
      (3, 1, 2, '2026-08-25', '19:00:00', 280.00),
      (4, 2, 1, '2026-08-26', '11:30:00', 230.00),
      (5, 2, 3, '2026-08-26', '16:00:00', 260.00),
      (6, 2, 3, '2026-08-26', '20:30:00', 300.00),
      (7, 3, 2, '2026-08-27', '12:15:00', 210.00),
      (8, 3, 2, '2026-08-27', '18:30:00', 240.00),
      (9, 3, 3, '2026-08-27', '21:15:00', 270.00)
  `);

  await connection.end();
}

const pool = mysql.createPool(dbConfig);

module.exports = {
  pool,
  initializeDatabase
};
