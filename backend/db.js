
const mysql = require("mysql2");

require("dotenv").config();

// Automatically enable SSL for remote databases such as TiDB Cloud.
const isRemoteDatabase =
  process.env.DB_HOST &&
  process.env.DB_HOST !== "localhost" &&
  process.env.DB_HOST !== "127.0.0.1";

const useSSL =
  process.env.DB_SSL === "true" || isRemoteDatabase;

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",

  user: process.env.DB_USER || "root",

  password: process.env.DB_PASSWORD,

  database: process.env.DB_NAME || "school_management_system",

  port: Number(process.env.DB_PORT) || 3306,

  ...(useSSL && {
    ssl: {
      minVersion: "TLSv1.2",
      rejectUnauthorized: true
    }
  }),

  waitForConnections: true,

  connectionLimit: 10,

  queueLimit: 0
});

const db = pool.promise();

// Test the database connection
async function testConnection() {
  let connection;

  try {
    connection = await db.getConnection();

    console.log("MySQL database connected successfully!");
  } catch (error) {
    console.error("MySQL connection failed:", error.message);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

module.exports = { db, testConnection };
