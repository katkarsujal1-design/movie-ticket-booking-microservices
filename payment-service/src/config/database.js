const mysql = require("mysql2/promise");
const fs = require("node:fs/promises");
const path = require("node:path");
const config = require("./index");

const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true
});

async function initializeDatabase() {
  const setup = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password
  });

  await setup.query("CREATE DATABASE IF NOT EXISTS ??", [config.db.database]);
  await setup.end();

  const sql = await fs.readFile(path.join(__dirname, "..", "..", "migrations", "001_create_payment_schema.sql"), "utf8");
  const connection = await mysql.createConnection({ ...config.db, multipleStatements: true });
  await connection.query(sql);
  await connection.end();
  console.log("Payment database connected and initialized");
}

module.exports = { pool, initializeDatabase };
