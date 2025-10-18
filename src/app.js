import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import tasksRoutes from './routes/tasks.js'
import authRoutes from './routes/auth.js'
import { initDb } from './models/db.js'
import { listUsers } from './controllers/authController.js'

const app = express()
app.use(cors())
app.use(bodyParser.json())

app.use('/tasks', tasksRoutes)
app.use('/auth', authRoutes)
app.get('/users', listUsers)

export async function createApp() {
  await initDb()
  return app
}

export default app
