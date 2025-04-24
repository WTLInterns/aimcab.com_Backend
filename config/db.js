


const mysql = require('mysql2/promise'); // ✅ Use mysql2 with promise support
require('dotenv').config();  // ✅ MUST be at the top!


// Create a connection pool
const pool = mysql.createPool({
    host: process.env.DB_URI,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool; // ✅ Export the pool

