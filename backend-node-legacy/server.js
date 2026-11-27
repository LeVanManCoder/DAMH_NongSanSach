import express from 'express'
import { api, errorHandler } from './api.js'
import { config } from './config.js'
import { pool } from './db.js'

const app = express()
app.disable('x-powered-by')

app.use((request, response, next) => {
  const origin = request.get('Origin')
  if (origin && origin !== config.frontendOrigin) {
    return response.status(403).json({ message: 'Origin không được phép truy cập API.' })
  }

  response.setHeader('Access-Control-Allow-Origin', config.frontendOrigin)
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.setHeader('Vary', 'Origin')
  if (request.method === 'OPTIONS') return response.sendStatus(204)
  return next()
})

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: false, limit: '1mb' }))
app.use('/api', api)
app.use('/api', (_request, response) => {
  response.status(404).json({ message: 'Không tìm thấy API endpoint.' })
})
app.use(errorHandler)

const connection = await pool.getConnection()
try {
  await connection.ping()
} finally {
  connection.release()
}

const server = app.listen(config.port, '127.0.0.1', () => {
  console.log(`Backend đang chạy tại http://127.0.0.1:${config.port}`)
})

async function shutdown() {
  server.close(async () => {
    await pool.end()
    process.exit(0)
  })
}

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
