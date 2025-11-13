const mysql = require('mysql2')

const pool = mysql.createPool({
  connectionLimit: 10,
  /* debug: true, */
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  timezone: 'Z',
})

pool.getConnection((error, connection) => {
  if (error) {
    // console.log(error)
  } else {
    connection.release()
  }
})

module.exports = pool
