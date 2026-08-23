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
      (3, 'Inception', 'English', 'Sci-Fi/Thriller', '2h 28m', 'A skilled thief enters dreams to steal secrets and attempts one last impossible job.', 'https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg'),
      (4, 'Avatar: The Way of Water', 'English', 'Adventure/Sci-Fi', '3h 12m', 'Jake Sully and Neytiri protect their family while exploring the oceans of Pandora.', 'https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg'),
      (5, 'Dangal', 'Hindi', 'Sports/Drama', '2h 41m', 'A former wrestler trains his daughters to become world-class wrestling champions.', 'https://image.tmdb.org/t/p/w500/cJRPOLEexI7qp2DKtFfCh7YaaUG.jpg'),
      (6, 'Jawan', 'Hindi', 'Action/Thriller', '2h 49m', 'A driven man takes bold action against corruption while confronting his past.', 'https://image.tmdb.org/t/p/w500/jFt1gS4BGHlK8xt76Y81Alp4dbt.jpg'),
      (7, 'Kantara', 'Kannada', 'Action/Drama', '2h 28m', 'A village conflict unfolds around tradition, land, and a powerful local legend.', 'https://m.media-amazon.com/images/M/MV5BNTY1YTI1NzktM2E0Ny00YTE0LWI3ZGEtYWQ4MjM2NTFhMTNjXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg'),
      (8, 'The Dark Knight', 'English', 'Action/Crime', '2h 32m', 'Batman faces the Joker, a criminal mastermind determined to bring chaos to Gotham.', 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg')
  `);

  await connection.query(
    "UPDATE movies SET poster_url = ? WHERE id = ?",
    [
      "https://m.media-amazon.com/images/M/MV5BNTY1YTI1NzktM2E0Ny00YTE0LWI3ZGEtYWQ4MjM2NTFhMTNjXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg",
      7
    ]
  );

  await connection.query(`
    INSERT IGNORE INTO theatres
      (id, name, city, location)
    VALUES
      (1, 'PVR Cinemas', 'Pune', 'Phoenix Mall'),
      (2, 'INOX', 'Pune', 'City Mall'),
      (3, 'Cinepolis', 'Pune', 'Seasons Mall'),
      (4, 'PVR Icon', 'Mumbai', 'Phoenix Palladium'),
      (5, 'INOX Megaplex', 'Mumbai', 'Inorbit Mall'),
      (6, 'Cinepolis Nexus', 'Bengaluru', 'Nexus Mall'),
      (7, 'PVR Forum', 'Bengaluru', 'Forum Mall'),
      (8, 'Miraj Cinemas', 'Delhi', 'Vegas Mall')
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
      (9, 3, 3, '2026-08-27', '21:15:00', 270.00),
      (10, 1, 4, '2026-08-25', '11:00:00', 320.00),
      (11, 1, 5, '2026-08-25', '18:45:00', 350.00),
      (12, 2, 4, '2026-08-26', '15:15:00', 310.00),
      (13, 2, 6, '2026-08-26', '19:20:00', 290.00),
      (14, 3, 7, '2026-08-27', '13:00:00', 260.00),
      (15, 3, 8, '2026-08-27', '20:10:00', 300.00),
      (16, 1, 6, '2026-08-28', '21:00:00', 330.00),
      (17, 2, 8, '2026-08-28', '17:30:00', 280.00),
      (18, 4, 1, '2026-08-29', '10:30:00', 240.00),
      (19, 4, 4, '2026-08-29', '15:45:00', 360.00),
      (20, 4, 6, '2026-08-29', '20:00:00', 320.00),
      (21, 5, 2, '2026-08-30', '11:15:00', 200.00),
      (22, 5, 5, '2026-08-30', '16:30:00', 260.00),
      (23, 5, 8, '2026-08-30', '19:45:00', 250.00),
      (24, 6, 1, '2026-08-31', '13:30:00', 230.00),
      (25, 6, 4, '2026-08-31', '18:00:00', 340.00),
      (26, 6, 7, '2026-08-31', '21:20:00', 310.00),
      (27, 7, 3, '2026-09-01', '12:00:00', 210.00),
      (28, 7, 6, '2026-09-01', '17:15:00', 270.00),
      (29, 7, 7, '2026-09-01', '20:40:00', 290.00),
      (30, 8, 2, '2026-09-02', '10:45:00', 220.00),
      (31, 8, 4, '2026-09-02', '14:50:00', 330.00),
      (32, 8, 5, '2026-09-02', '19:30:00', 340.00),
      (33, 8, 8, '2026-09-02', '22:00:00', 300.00)
  `);

  await connection.end();
}

const pool = mysql.createPool(dbConfig);

module.exports = {
  pool,
  initializeDatabase
};
