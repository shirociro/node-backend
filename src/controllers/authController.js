import { getDb } from '../models/db.js'
import { nextId } from '../utils/id.js'
import { hashPassword, comparePassword } from '../utils/hash.js'
import { signToken } from '../utils/jwt.js'

function findUserByEmail(db, email) {
  return (db.data.users || []).find(
    u => String(u.email).toLowerCase() === String(email).toLowerCase()
  )
}

export async function register(req, res) {
  const { name, email, password } = req.body || {}
  if (!email || !password)
    return res.status(400).json({ message: 'Email and password are required' })

  const db = getDb()
  await db.read()
  if (!db.data.users) db.data.users = []
  const exists = findUserByEmail(db, email)
  if (exists) return res.status(400).json({ message: 'Email already registered' })

  const id = nextId(db.data.users)
  const hashed = await hashPassword(password)
  const now = new Date().toISOString()
  const newUser = { id, name: name || '', email, password: hashed, created_at: now }
  db.data.users.push(newUser)
  await db.write()

  const token = signToken({ sub: id, name: newUser.name, email: newUser.email })
  const safeUser = {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    created_at: newUser.created_at,
  }
  res.status(201).json({ token, user: safeUser })
}

export async function login(req, res) {
  try {
    const { email: rawEmail, password } = req.body || {}
    if (!rawEmail || !password)
      return res.status(400).json({ message: 'Email and password are required' })

    const email = String(rawEmail).toLowerCase()
    const db = getDb()
    await db.read()
    db.data.users = db.data.users || []

    const user = (db.data.users || []).find(u => String(u.email).toLowerCase() === email)
    if (!user) return res.status(401).json({ message: 'Invalid email or password' })

    let match = false
    if (String(user.password).startsWith('$2')) {
      match = await comparePassword(password, user.password)
    } else {
      if (password === user.password) {
        match = true
        const hashed = await hashPassword(password)
        user.password = hashed
        await db.write()
      }
    }

    if (!match) return res.status(401).json({ message: 'Invalid email or password' })

    const token = signToken({ sub: user.id, name: user.name, email: user.email })
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
    }
    res.json({ token, user: safeUser })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
}

export async function listUsers(req, res) {
  const db = getDb()
  await db.read()
  const sanitized = (db.data.users || []).map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    created_at: u.created_at,
  }))
  res.json(sanitized)
}
