// // db.js
// const mysql = require('mysql');

// // Create the connection
// const connection = mysql.createConnection({
//   host: 'localhost',
//   user: 'root',
//   password: 'root123',
//   database: 'demo',
// });

// // Connect to the database
// connection.connect((err) => {
//   if (err) {
//     console.error('Error connecting to MySQL: ', err);
//     return;
//   }
//   console.log('Connected to MySQL database!');
// });

// // connection.query("Select * from oneway",(err,result)=>{
// //   console.warn("result",result)
// // })
// module.exports = connection;


const mysql = require('mysql2/promise'); // ✅ Use mysql2 with promise support

// Create a connection pool
const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'root',
    database: 'demo',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool; // ✅ Export the pool

