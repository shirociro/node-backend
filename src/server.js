// server.js
import config from './config.js'
import app, { createApp } from './app.js'
import http from 'http'
import { Server } from 'socket.io'
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

// <-- NEW: import named init
import { initEmailRouter } from './routes/email.js'

const PORT = config.port

// <-- NEW: define __dirname for ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

;(async () => {
  await createApp()

  // ✅ Serve uploads folder (inside src/uploads)
  app.use(
    '/uploads',
    express.static(path.join(__dirname, 'uploads'))
  )

  // initialize email router (transporter verification happens here)
  try {
    const emailRouter = await initEmailRouter()
    app.use('/api', emailRouter)
    console.log('✅ Email router mounted at /api')
  } catch (err) {
    console.error('⚠️ Email router failed to initialize. Continuing without email routes.')
  }

  const server = http.createServer(app)

  // ... socket.io init (unchanged)
  const io = new Server(server, {
    cors: {
      origin: ['http://localhost:5173', 'http://192.168.1.3:5173'],
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    },
  })

  app.set('io', io)

  io.on('connection', socket => {
    console.log('Client connected:', socket.id)
    socket.on('taskUpdated', task => socket.broadcast.emit('taskUpdated', task))
    socket.on('taskDeleted', id => socket.broadcast.emit('taskDeleted', id))
    socket.on('disconnect', () => console.log('Client disconnected:', socket.id))
  })

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running at http://0.0.0.0:${PORT}`)
    console.log(`📂 Serving uploads from: http://localhost:${PORT}/uploads`)
  })
})()
