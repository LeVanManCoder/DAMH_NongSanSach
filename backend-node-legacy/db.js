import mysql from 'mysql2/promise'
import { config } from './config.js'

export const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: false,
  dateStrings: true,
})

export async function transaction(work) {
  const connection = await pool.getConnection()
  let started = false

  try {
    await connection.beginTransaction()
    started = true
    const result = await work(connection)
    await connection.commit()
    started = false
    return result
  } catch (error) {
    if (started) await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}
