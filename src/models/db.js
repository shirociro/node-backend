import path from 'path'
import { fileURLToPath } from 'url'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ✅ db.json is inside the same folder or adjust as needed
const DB_FILE = path.join(__dirname, 'db.json')
const adapter = new JSONFile(DB_FILE)

// ✅ Provide default data shape here to prevent missing-default-data error
const db = new Low(adapter, { tasks: [], users: [] })

export async function initDb() {
  await db.read()
  // ensure data structure
  db.data = db.data || { tasks: [], users: [] }
  db.data.tasks = db.data.tasks || []
  db.data.users = db.data.users || []
  await db.write()
}

export function getDb() {
  if (!db.data) throw new Error('Database not initialized — call initDb() first')
  return db
}

export default db
