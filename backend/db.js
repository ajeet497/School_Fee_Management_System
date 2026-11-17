
const mysql = require("mysql2");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "school_management_system",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const db = pool.promise();

// Test the database connection
async function testConnection() {
  try {
    const connection = await db.getConnection();

    console.log("MySQL database connected successfully!");

    connection.release();
  } catch (error) {
    console.error("MySQL connection failed:", error.message);
  }
}

module.exports = { db, testConnection };
