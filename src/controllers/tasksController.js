import { getDb } from '../models/db.js'
import { nextId, toNumId } from '../utils/id.js'

export async function listTasks(req, res) {
  const db = getDb()
  await db.read()
  res.json(db.data.tasks)
}

export async function createTask(req, res) {
  const db = getDb()
  await db.read()
  const id = nextId(db.data.tasks)
  const now = new Date().toISOString()
  const newTask = {
    id,
    title: req.body.title || '',
    description: req.body.description || '',
    priority: req.body.priority || 'low',
    status: req.body.status || 'pending',
    created_at: now,
    updated_at: req.body.updated_at || '',
    ...req.body,
  }
  db.data.tasks.push(newTask)
  await db.write()
  res.status(201).json(newTask)
}

export async function patchTask(req, res) {
  const db = getDb()
  await db.read()
  const id = toNumId(req.params.id)
  if (id === null) return res.status(400).json({ error: 'Invalid ID' })
  const index = db.data.tasks.findIndex((t) => Number(t.id) === id)
  if (index === -1) return res.status(404).json({ error: 'Task not found' })
  db.data.tasks[index] = { ...db.data.tasks[index], ...req.body, id }
  await db.write()
  res.json(db.data.tasks[index])
}

export async function putTask(req, res) {
  const db = getDb()
  await db.read()
  const id = toNumId(req.params.id)
  if (id === null) return res.status(400).json({ error: 'Invalid ID' })
  const index = db.data.tasks.findIndex((t) => Number(t.id) === id)
  if (index === -1) return res.status(404).json({ error: 'Task not found' })
  db.data.tasks[index] = { ...req.body, id }
  await db.write()
  res.json(db.data.tasks[index])
}

export async function deleteTask(req, res) {
  const db = getDb()
  await db.read()
  const id = toNumId(req.params.id)
  if (id === null) return res.status(400).json({ error: 'Invalid ID' })
  const index = db.data.tasks.findIndex((t) => Number(t.id) === id)
  if (index === -1) return res.status(404).json({ error: 'Task not found' })
  db.data.tasks.splice(index, 1)
  await db.write()
  res.json({ message: 'Task deleted', id })
}
