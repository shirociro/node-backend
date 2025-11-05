import { getDb } from '../models/db.js'
import { toNumId } from '../utils/mysql/id.js'

// Helper to normalize CALL result sets returned by mysql2
function normalizeCallResult(callResult) {
  // callResult often looks like: [ [rows], [meta], ... ] or [ OkPacket ]
  if (!callResult) return []
  // If first element is an array of rows, return it
  if (Array.isArray(callResult) && Array.isArray(callResult[0])) {
    return callResult[0]
  }
  // otherwise if callResult itself is an array of rows
  if (Array.isArray(callResult)) {
    return callResult
  }
  return []
}

// List tasks (paginated via _start & _limit)
export async function listKBsBatch(req, res) {
  try {
    const start = Math.max(0, parseInt(req.query._start || '0', 10))
    const limit = Math.min(1000, Math.max(1, parseInt(req.query._limit || '1000', 10)))

    const db = getDb()

    // Try to call stored procedure first; fall back to plain SELECT if procedure missing/error
    try {
      const [procResult] = await db.execute('CALL sp_list_tasks_batch(?, ?)', [start, limit])
      const rows = normalizeCallResult(procResult)
      // total count header (useful for frontends) — try stored procedure for total too
      try {
        const [totalProc] = await db.execute('CALL sp_get_tasks_total()')
        const totalRows = normalizeCallResult(totalProc)
        if (totalRows && totalRows[0] && typeof totalRows[0].total !== 'undefined') {
          res.setHeader('X-Total-Count', totalRows[0].total)
        } else {
          // fallback to COUNT if total not returned
          const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM knowledgebase')
          res.setHeader('X-Total-Count', total)
        }
      } catch (err) {
        // if SP not available or failing, fallback to COUNT
        const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM knowledgebase')
        res.setHeader('X-Total-Count', total)
      }

      console.log(`Sending tasks ${start} - ${start + rows.length} (${rows.length})`)
      return res.json(rows)
    } catch (procErr) {
      // If procedure does not exist or another issue, fallback to standard query
      console.warn('sp_list_tasks_batch failed, falling back to direct query:', procErr.message)
      const [rows] = await db.execute(
        `SELECT id, title, description, created_at, updated_at
         FROM knowledgebase
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [limit, start]
      )
      const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM knowledgebase')
      res.setHeader('X-Total-Count', total)
      console.log(`Sending tasks ${start} - ${start + rows.length} (${rows.length})`)
      return res.json(rows)
    }
  } catch (err) {
    console.error('Error fetching task batch:', err)
    res.status(500).json({ error: 'Database error while fetching tasks' })
  }
}

export async function getKBsTotal(req, res) {
  try {
    const db = getDb()
    try {
      const [procResult] = await db.execute('CALL sp_get_tasks_total()')
      const rows = normalizeCallResult(procResult)
      if (rows && rows[0] && typeof rows[0].total !== 'undefined') {
        return res.json({ total: rows[0].total })
      }
      // fallback if procedure did not return expected shape
      const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM knowledgebase')
      return res.json({ total })
    } catch (procErr) {
      console.warn('sp_get_tasks_total failed, falling back to direct COUNT:', procErr.message)
      const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM knowledgebase')
      return res.json({ total })
    }
  } catch (err) {
    console.error('Error fetching task total:', err)
    res.status(500).json({ error: 'Database error while counting tasks' })
  }
}

export async function createKB(req, res) {
  try {
    const { title = '', description = '', priority = 'low', status = 'pending' } = req.body
    if (!title || title.trim() === '') return res.status(400).json({ error: 'Title is required' })

    const db = getDb()

    try {
      // Try stored procedure first
      const [procResult] = await db.execute('CALL sp_create_task(?, ?, ?, ?)', [
        title,
        description,
        priority,
        status,
      ])
      const rows = normalizeCallResult(procResult)

      // If stored procedure returned the created task row(s), use that
      if (rows && rows[0] && rows[0].id) {
        const newTask = rows[0]
        const io = req.app.get('io')
        if (io) io.emit('kbUpdated', newTask)
        return res.status(201).json(newTask)
      }

      // If stored procedure did not return the created row, try to retrieve by last inserted id.
      // Some procedures might SELECT LAST_INSERT_ID() as insertId in the result set.
      if (rows && rows[0] && typeof rows[0].insertId !== 'undefined') {
        const insertId = rows[0].insertId
        const [selectRows] = await db.execute(
          `SELECT id, title, description, created_at, updated_at FROM knowledgebase WHERE id = ?`,
          [insertId]
        )
        const newTask = selectRows[0]
        const io = req.app.get('io')
        if (io) io.emit('kbUpdated', newTask)
        return res.status(201).json(newTask)
      }

      // If we reach here, the procedure ran but did not return expected data. Fallback to doing a SELECT
      // for the most recently created row matching the provided data. This is not perfect but is a reasonable fallback.
      const [findRows] = await db.execute(
        `SELECT id, title, description, created_at, updated_at
         FROM knowledgebase
         WHERE title = ? AND description = ? 
         ORDER BY created_at DESC
         LIMIT 1`,
        [title, description, priority, status]
      )
      const newTask = findRows[0] || {
        id: null,
        title,
        description,
        priority,
        status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      const io = req.app.get('io')
      if (io) io.emit('kbUpdated', newTask)
      return res.status(201).json(newTask)
    } catch (procErr) {
      // Stored procedure not available or failed: fallback to original INSERT
      console.warn('sp_create_task failed, falling back to INSERT:', procErr.message)
      const [result] = await db.execute(
        `INSERT INTO knowledgebase (title, description, created_at, updated_at)
         VALUES (?, ?, NOW(), NOW())`,
        [title, description]
      )

      const insertId = result.insertId
      const [rows] = await db.execute(
        `SELECT id, title, description, created_at, updated_at FROM knowledgebase WHERE id = ?`,
        [insertId]
      )

      const newTask = rows[0] || {
        id: insertId,
        title,
        description,
        priority,
        status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const io = req.app.get('io')
      if (io) io.emit('kbUpdated', newTask)

      return res.status(201).json(newTask)
    }
  } catch (err) {
    console.error('Error creating task:', err)
    res.status(500).json({ error: 'Database error while creating task' })
  }
}

export async function patchKB(req, res) {
  try {
    const id = toNumId(req.params.id)
    if (id === null) return res.status(400).json({ error: 'Invalid ID' })
    const fields = { ...req.body }
    delete fields.id
    const keys = Object.keys(fields)
    if (keys.length === 0) return res.status(400).json({ error: 'No fields provided' })

    const db = getDb()

    // Prepare values for a generic SP that accepts possible nulls for fields.
    // If a field is not provided, pass NULL (and let the procedure decide to ignore NULLs).
    const title = 'title' in fields ? fields.title : null
    const description = 'description' in fields ? fields.description : null

    try {
      // Try stored procedure first; the procedure should update only non-null fields
      await db.execute('CALL sp_patch_task(?, ?, ?, ?, ?)', [id, title, description])

      // After SP runs, fetch updated row
      const [rows] = await db.execute(
        `SELECT id, title, description, created_at, updated_at FROM knowledgebase WHERE id = ?`,
        [id]
      )
      const updated = rows[0]
      if (!updated) return res.status(404).json({ error: 'Task not found' })
      const io = req.app.get('io')
      if (io) io.emit('kbUpdated', updated)
      return res.json(updated)
    } catch (procErr) {
      // Fallback to dynamic UPDATE when SP not available
      console.warn('sp_patch_task failed, falling back to dynamic UPDATE:', procErr.message)
      const setClause = keys.map(k => `\`${k}\` = ?`).join(', ')
      const values = keys.map(k => fields[k])
      values.push(id)

      const [result] = await db.execute(
        `UPDATE tasks SET ${setClause}, updated_at = NOW() WHERE id = ?`,
        values
      )
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Task not found' })

      const [rows] = await db.execute(
        `SELECT id, title, description, created_at, updated_at FROM knowledgebase WHERE id = ?`,
        [id]
      )
      const updated = rows[0]
      const io = req.app.get('io')
      if (io) io.emit('kbUpdated', updated)
      return res.json(updated)
    }
  } catch (err) {
    console.error('Error patching task:', err)
    res.status(500).json({ error: 'Database error while updating task' })
  }
}

export async function putKB(req, res) {
  try {
    const id = toNumId(req.params.id)
    if (id === null) return res.status(400).json({ error: 'Invalid ID' })
    const { title = '', description = '', priority = 'low', status = 'pending' } = req.body
    if (!title || title.trim() === '') return res.status(400).json({ error: 'Title is required' })

    const db = getDb()

    try {
      // Try stored procedure that replaces fields
      await db.execute('CALL sp_put_task(?, ?, ?, ?, ?)', [
        id,
        title,
        description,
        priority,
        status,
      ])

      const [rows] = await db.execute(
        `SELECT id, title, description, created_at, updated_at FROM knowledgebase WHERE id = ?`,
        [id]
      )
      const updated = rows[0]
      if (!updated) return res.status(404).json({ error: 'Task not found' })
      const io = req.app.get('io')
      if (io) io.emit('kbUpdated', updated)
      return res.json(updated)
    } catch (procErr) {
      console.warn('sp_put_task failed, falling back to UPDATE:', procErr.message)
      const [result] = await db.execute(
        `UPDATE tasks SET title = ?, description = ? updated_at = NOW() WHERE id = ?`,
        [title, description, id]
      )
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Task not found' })

      const [rows] = await db.execute(
        `SELECT id, title, description, created_at, updated_at FROM knowledgebase WHERE id = ?`,
        [id]
      )
      const updated = rows[0]
      const io = req.app.get('io')
      if (io) io.emit('kbUpdated', updated)
      return res.json(updated)
    }
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
    try {
      // Try stored procedure first
      await db.execute('CALL sp_delete_task(?)', [id])
      // It is possible the procedure deletes quietly. Confirm deletion by checking affected rows
      const [rows] = await db.execute('SELECT 1 FROM knowledgebase WHERE id = ? LIMIT 1', [id])
      if (rows.length > 0) {
        // still exists
        return res.status(500).json({ error: 'Failed to delete task' })
      }
      const io = req.app.get('io')
      if (io) io.emit('kbDeleted', id)
      return res.json({ message: 'Task deleted', id })
    } catch (procErr) {
      console.warn('sp_delete_task failed, falling back to DELETE:', procErr.message)
      const [result] = await db.execute('DELETE FROM knowledgebase WHERE id = ?', [id])
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Task not found' })

      const io = req.app.get('io')
      if (io) io.emit('kbDeleted', id)
      return res.json({ message: 'Task deleted', id })
    }
  } catch (err) {
    console.error('Error deleting task:', err)
    res.status(500).json({ error: 'Database error while deleting task' })
  }
}
