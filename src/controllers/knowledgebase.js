import { getDb } from '../models/db.js'
import { nextId, toNumId } from '../utils/id.js'

export async function listKBs(req, res) {
  const db = getDb()
  await db.read()
  res.json(db.data.knowledgebase)
}

export async function listKBsBatch(req, res) {
  const db = getDb()
  await db.read()
  const start = parseInt(req.query._start || '0', 10)
  const limit = parseInt(req.query._limit || '1000', 10)
  const sliced = db.data.knowledgebase.slice(start, start + limit)
  console.log(`Sending knowledgebase ${start} - ${start + limit} (${sliced.length})`)
  res.json(sliced)
}

export async function getKBsTotal(req, res) {
  const db = getDb()
  await db.read()
  res.json({ total: db.data.knowledgebase.length })
}

export async function createKB(req, res) {
  const db = getDb()
  await db.read()
  const id = nextId(db.data.knowledgebase)
  const now = new Date().toISOString()
  const newKB = {
    id,
    title: req.body.title || '',
    description: req.body.description || '',
    created_at: now,
    updated_at: req.body.updated_at || '',
    ...req.body,
  }
  db.data.knowledgebase.push(newKB)
  await db.write()

  // Emit event to all clients
  const io = req.app.get('io')
  io.emit('kbUpdated', newKB)

  res.status(201).json(newKB)
}

// ✅ Patch Task
export async function patchKB(req, res) {
  const db = getDb()
  await db.read()
  const id = toNumId(req.params.id)
  if (id === null) return res.status(400).json({ error: 'Invalid ID' })
  const index = db.data.knowledgebase.findIndex(t => Number(t.id) === id)
  if (index === -1) return res.status(404).json({ error: 'Knowledgebase not found' })
  db.data.knowledgebase[index] = { ...db.data.knowledgebase[index], ...req.body, id }
  await db.write()

  const io = req.app.get('io')
  io.emit('kbUpdated', db.data.knowledgebase[index])

  res.json(db.data.knowledgebase[index])
}

export async function putKB(req, res) {
  const db = getDb()
  await db.read()
  const id = toNumId(req.params.id)
  if (id === null) return res.status(400).json({ error: 'Invalid ID' })
  const index = db.data.knowledgebase.findIndex(t => Number(t.id) === id)
  if (index === -1) return res.status(404).json({ error: 'KB not found' })
  db.data.knowledgebase[index] = { ...req.body, id }
  await db.write()

  const io = req.app.get('io')
  io.emit('kbUpdated', db.data.knowledgebase[index])

  res.json(db.data.knowledgebase[index])
}

export async function deleteKB(req, res) {
  const db = getDb()
  await db.read()
  const id = toNumId(req.params.id)
  if (id === null) return res.status(400).json({ error: 'Invalid ID' })
  const index = db.data.knowledgebase.findIndex(t => Number(t.id) === id)
  if (index === -1) return res.status(404).json({ error: 'KB not found' })
  db.data.knowledgebase.splice(index, 1)
  await db.write()

  const io = req.app.get('io')
  io.emit('kbDeleted', id)

  res.json({ message: 'KB deleted', id })
}
