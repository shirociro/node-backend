// models/db.js
import mysql from 'mysql2'
import dotenv from 'dotenv'
dotenv.config()

let pool
let promisePool

export async function initDb() {
  if (promisePool) return promisePool

  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'myappdb',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONN_LIMIT || '10', 10),
    queueLimit: 0,
  })

  promisePool = pool.promise()

  // test connection
  try {
    await promisePool.query('SELECT 1')
    console.log('MySQL pool initialized')
  } catch (err) {
    console.error('MySQL initialization failed:', err)
    throw err
  }

  return promisePool
}

export function getDb() {
  if (!promisePool) {
    throw new Error('Database not initialized. Call initDb() first.')
  }
  return promisePool
}
