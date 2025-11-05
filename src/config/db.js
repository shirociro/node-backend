import mysql from 'mysql2/promise'
import { dbConfig } from './dbsql.config.js'

let connection

export async function getConnection() {
  if (!connection) {
    connection = await mysql.createPool({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    })
  }
  return connection
}
