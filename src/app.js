import express from 'express'
import cors from 'cors'

import tasksRoutes from './routes/tasks.js'
import knowledgebaseRoutes from './routes/knowledgebase.js'
import authRoutes from './routes/auth.js'
import usersRoutes from './routes/users.js'
import metaRoutes from './routes/meta.js'
import { initDb } from './models/db.js'

const app = express()

app.use(cors())

// Use built-in body parsers with higher limits
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// ---- Friendly JSON parse error handler ----
// This will catch malformed JSON and return 400 with readable message
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    console.warn('Malformed JSON body received:', err.message)
    return res.status(400).json({ ok: false, error: 'Malformed JSON body' })
  }
  // pass to next error handler if not a body parse error
  return next(err)
})

// Mount your routes (these run after parsers above)
app.use('/tasks', tasksRoutes)
app.use('/knowledgebase', knowledgebaseRoutes)
app.use('/auth', authRoutes)
app.use('/users', usersRoutes)
app.use('/api/meta', metaRoutes)
// Optional: health endpoint
app.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }))

export async function createApp() {
  await initDb()
  return app
}

export default app
