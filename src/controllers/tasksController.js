import { getDb } from '../models/db.js'
import { toNumId } from '../utils/id.js'

// List tasks (paginated via _start & _limit)
export async function listTasksBatch(req, res) {
  try {
    const start = Math.max(0, parseInt(req.query._start || '0', 10))
    const limit = Math.min(1000, Math.max(1, parseInt(req.query._limit || '1000', 10)))
    const db = getDb()

    const [rows] = await db.execute(
      `SELECT 
        t.id,
        t.user_id,
        u.firstname,
        u.lastname,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.created_at,
        t.updated_at
      FROM users AS u
      RIGHT JOIN tasks AS t
        ON t.user_id = u.id
      LIMIT ? OFFSET ?`,
      [limit, start]
    )

    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM tasks')
    res.setHeader('X-Total-Count', total)

    console.log(`Sending tasks ${start} - ${start + rows.length} (${rows.length})`)
    return res.json(rows)
  } catch (err) {
    console.error('Error fetching task batch:', err)
    res.status(500).json({ error: 'Database error while fetching tasks' })
  }
}

export async function getTasksTotal(req, res) {
  try {
    const db = getDb()
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM tasks')
    return res.json({ total })
  } catch (err) {
    console.error('Error fetching task total:', err)
    res.status(500).json({ error: 'Database error while counting tasks' })
  }
}

export async function createTask(req, res) {
  try {
    const { title = '', description = '', assignee, priority = 'low', status = 'pending' } = req.body
    if (!title || title.trim() === '') return res.status(400).json({ error: 'Title is required' })

    const db = getDb()
    const [result] = await db.execute(
      `INSERT INTO tasks (title, description, priority, status, created_at, updated_at, user_id)
       VALUES (?, ?, ?, ?, NOW(), NOW(), ?)`,
      [title, description, priority, status, assignee]
    )
    if(assignee){
      const message = 'Task:'+title+' assigned to you'
        const [result_notif] = await db.execute(
          `INSERT INTO notifications (user_id, message, is_read)
          VALUES (?, ?, ?)`,
          [assignee, message, 0]
        )
      const inserNotiftId = result_notif.insertId

    }
    const insertId = result.insertId

    const [rows] = await db.execute(
      `SELECT id, user_id, title, description, status, priority, created_at, updated_at FROM tasks WHERE id = ?`,
      [insertId]
    )

    const newTask = rows[0]

    const io = req.app.get('io')
    if (io) io.emit('taskUpdated', newTask)

    return res.status(201).json(newTask)
  } catch (err) {
    console.error('Error creating task:', err)
    res.status(500).json({ error: 'Database error while creating task' })
  }
}

  export async function patchTask(req, res) {
    try {
      const id = toNumId(req.params.id)
      if (id === null) return res.status(400).json({ error: 'Invalid ID' })

      const fields = { ...req.body }
      delete fields.id

      const keys = Object.keys(fields).filter(k => k !== 'created_at' && k !== 'firstname' && k !== 'lastname')

      if (keys.length === 0) return res.status(400).json({ error: 'No fields provided' })

      const db = getDb()
      const setClause = keys.map(k => `\`${k}\` = ?`).join(', ')
      const values = keys.map(k => fields[k])
      values.push(id)

      const [result] = await db.execute(
        `UPDATE tasks SET ${setClause}, updated_at = NOW() WHERE id = ?`,
        values
      )

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Task not found' })

    const [rows] = await db.execute(
      `SELECT id,user_id, title, description, status, priority, created_at, updated_at FROM tasks WHERE id = ?`,
      [id]
    )

    const updated = rows[0]
    const io = req.app.get('io')
    if (io) io.emit('taskUpdated', updated)
    return res.json(updated)
  } catch (err) {
    console.error('Error patching task:', err)
    res.status(500).json({ error: 'Database error while updating task' })
  }
}

export async function putTask(req, res) {
  try {
    const id = toNumId(req.params.id)
    if (id === null) return res.status(400).json({ error: 'Invalid ID' })

    const { title = '', description = '', priority = 'low', status = 'pending' } = req.body
    if (!title || title.trim() === '') return res.status(400).json({ error: 'Title is required' })

    const db = getDb()
    const [result] = await db.execute(
      `UPDATE tasks
       SET title = ?, description = ?, status = ?, priority = ?, updated_at = NOW()
       WHERE id = ?`,
      [title, description, status, priority, id]
    )

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Task not found' })

    const [rows] = await db.execute(
      `SELECT id, title, description, status, priority, created_at, updated_at FROM tasks WHERE id = ?`,
      [id]
    )

    const updated = rows[0]
    const io = req.app.get('io')
    if (io) io.emit('taskUpdated', updated)

    return res.json(updated)
  } catch (err) {
    console.error('Error putting task:', err)
    res.status(500).json({ error: 'Database error while replacing task' })
  }
}

export async function deleteTask(req, res) {
  try {
    const id = toNumId(req.params.id)
    if (id === null) return res.status(400).json({ error: 'Invalid ID' })

    const db = getDb()
    const [result] = await db.execute('DELETE FROM tasks WHERE id = ?', [id])
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Task not found' })

    const io = req.app.get('io')
    if (io) io.emit('taskDeleted', id)

    return res.json({ message: 'Task deleted', id })
  } catch (err) {
    console.error('Error deleting task:', err)
    res.status(500).json({ error: 'Database error while deleting task' })
  }
}
