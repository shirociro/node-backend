// import express from 'express'
// import bodyParser from 'body-parser'
// import cors from 'cors'
// // import tasksRoutes from './lowdb/routes/tasks.js'
// // import { initDb } from './lowdb/models/db.js'

// import tasksRoutes from './routes/mysql/tasks.js'
// import knowledgebaseRoutes from './routes/mysql/knowledgebase.js'

// import authRoutes from './routes/auth.js'
// import { initDb } from './models/mysql/db.js'
// // import { listUsers } from './controllers/authController.js'
// import usersRoutes from './routes/mysql/users.js'

// const app = express()
// app.use(cors())
// app.use(bodyParser.json({ limit: '50mb' }))
// app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }))

// app.use('/tasks', tasksRoutes)
// app.use('/knowledgebase', knowledgebaseRoutes)
// app.use('/auth', authRoutes)
// app.use('/users', usersRoutes)

// export async function createApp() {
//   await initDb()
//   return app
// }

// export default app

// app.js
import express from 'express'
import cors from 'cors'

import tasksRoutes from './routes/mysql/tasks.js'
import knowledgebaseRoutes from './routes/mysql/knowledgebase.js'
import authRoutes from './routes/auth.js'
import usersRoutes from './routes/mysql/users.js'
import metaRoutes from './routes/mysql/meta.js'
import { initDb } from './models/mysql/db.js'

const app = express()

// CORS - keep your origins as needed
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
