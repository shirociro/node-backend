import { getDb } from '../models/db.js'
import { toNumId } from '../utils/mysql/id.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

// JWT secret key (you can move this to .env)
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey'
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'superrefreshsecretkey'

// ✅ Get total users
export async function getUsersTotal(req, res) {
  try {
    const db = getDb()
    const [rows] = await db.execute('SELECT COUNT(*) as total FROM users')
    res.json({ total: rows[0].total })
  } catch (err) {
    console.error('Error fetching total users:', err)
    res.status(500).json({ error: 'Database error fetching total users' })
  }
}

// ✅ Get users (batch)
export async function listUsersBatch(req, res) {
  try {
    const db = getDb()
    const limit = parseInt(req.query._limit || '100', 10)
    const start = parseInt(req.query._start || '0', 10)

    const [rows] = await db.execute(
      `SELECT u.id, u.firstname, u.lastname, r.name AS role, r.id AS role_id, 
              p.name AS position, p.id AS position_id 
       FROM users AS u
       JOIN user_role AS r ON u.role_id = r.id
       JOIN user_position AS p ON u.position_id = p.id
       ORDER BY u.id DESC LIMIT ?, ?`,
      [start, limit]
    )

    res.json(rows)
  } catch (err) {
    console.error('Error listing users:', err)
    res.status(500).json({ error: 'Database error listing users' })
  }
}

// ✅ Get user by ID
export async function getUserById(req, res) {
  try {
    const db = getDb()
    const id = toNumId(req.params.id)

    const [rows] = await db.execute(
      'SELECT id, firstname, lastname, created_at FROM users WHERE id = ?',
      [id]
    )

    if (rows.length === 0) return res.status(404).json({ error: 'User not found' })

    res.json(rows[0])
  } catch (err) {
    console.error('Error fetching user:', err)
    res.status(500).json({ error: 'Database error fetching user' })
  }
}

// ✅ Create user (with password hashing)
export async function createUser(req, res) {
  try {
    const db = getDb()
    const { firstname, lastname, position_id, role_id, password } = req.body
    if (!firstname || !lastname || !password || !position_id || !role_id)
      return res
        .status(400)
        .json({
          error: 'Missing required fields (firstname, lastname, password, position_id, role_id)',
        })

    const hashedPassword = await bcrypt.hash(password, 10)

    const [result] = await db.execute(
      'INSERT INTO users (firstname, lastname, password, position_id, role_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [firstname, lastname, hashedPassword, position_id, role_id]
    )

    res.status(201).json({
      id: result.insertId,
      firstname,
      lastname,
      position_id,
      role_id,
      created_at: new Date(),
    })
  } catch (err) {
    console.error('Error creating user:', err)
    res.status(500).json({ error: 'Database error creating user' })
  }
}

// ✅ Login user
export async function loginUser(req, res) {
  try {
    const db = getDb()
    const { firstname, password } = req.body

    if (!firstname || !password)
      return res.status(400).json({ error: 'Missing firstname or password' })

    const [rows] = await db.execute('SELECT * FROM users WHERE firstname = ?', [firstname])

    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' })

    const user = rows[0]
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' })

    // Generate JWT token
    const accessToken = jwt.sign(
      { id: user.id, firstname: user.firstname, role_id: user.role_id, position: user.position,
        profile: user.profile,
        username: user.username, },
      JWT_SECRET,
      { expiresIn: '12h' } // ✅ 12 hours
    )
    const refreshToken = jwt.sign({ id: user.id }, REFRESH_SECRET, { expiresIn: '14d' })
    // --- Store refresh token in DB
    // const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000) // 1 hour in ms
    await db.execute('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)', [
      user.id,
      refreshToken,
      expiresAt,
    ])
    await db.execute('INSERT INTO logs (user_id, action, created_at) VALUES (?, ?, NOW())', [
      user.id,
      'User logged in',
    ])

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        role_id: user.role_id,
        position: user.position,
        profile: user.profile,
        username: user.username,
      },
    })
  } catch (err) {
    console.error('Error during login:', err)
    res.status(500).json({ error: 'Database error during login' })
  }
}

// ✅ Patch user
export async function patchUser(req, res) {
  try {
    const db = getDb()
    const id = toNumId(req.params.id)
    const { firstname, lastname, position_id, role_id, status } = req.body

    const [existing] = await db.execute('SELECT * FROM users WHERE id = ?', [id])
    if (existing.length === 0) return res.status(404).json({ error: 'User not found' })

    const newFirst = firstname ?? existing[0].firstname
    const newLast = lastname ?? existing[0].lastname
    const newPosition = position_id ?? existing[0].position_id
    const newRole = role_id ?? existing[0].role_id
    const newStatus = status ?? existing[0].status

    if (status !== undefined) {
      await db.execute('UPDATE users SET status = ? WHERE id = ?', [newStatus, id])
    } else {
      await db.execute(
        'UPDATE users SET firstname=?, lastname=?, position_id=?, role_id=? WHERE id=?',
        [newFirst, newLast, newPosition, newRole, id]
      )
    }

    res.json({
      id,
      firstname: newFirst,
      lastname: newLast,
      position_id: newPosition,
      role_id: newRole,
      status: newStatus,
    })
  } catch (err) {
    console.error('Error patching user:', err)
    res.status(500).json({ error: 'Database error patching user' })
  }
}

// ✅ Put user (replace)
export async function putUser(req, res) {
  try {
    const db = getDb()
    const id = toNumId(req.params.id)
    const { firstname, lastname } = req.body

    await db.execute('UPDATE users SET firstname=?, lastname=? WHERE id=?', [
      firstname,
      lastname,
      id,
    ])

    res.json({ id, firstname, lastname })
  } catch (err) {
    console.error('Error putting user:', err)
    res.status(500).json({ error: 'Database error replacing user' })
  }
}

// ✅ Delete user
export async function deleteUser(req, res) {
  try {
    const db = getDb()
    const id = toNumId(req.params.id)
    const [result] = await db.execute('DELETE FROM users WHERE id = ?', [id])

    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' })

    res.json({ message: 'User deleted successfully', id })
  } catch (err) {
    console.error('Error deleting user:', err)
    res.status(500).json({ error: 'Database error deleting user' })
  }
}

export async function refreshToken(req, res) {
  try {
    const db = getDb()
    const { token } = req.body
    if (!token) return res.status(401).json({ error: 'Missing refresh token' })

    // Check if token exists in DB
    const [rows] = await db.execute('SELECT * FROM refresh_tokens WHERE token = ?', [token])
    if (rows.length === 0) return res.status(403).json({ error: 'Invalid refresh token' })

    const savedToken = rows[0]

    // Verify token validity
    jwt.verify(token, REFRESH_SECRET, async (err, decoded) => {
      if (err) return res.status(403).json({ error: 'Expired or invalid refresh token' })

      // Generate new access token
      const newAccessToken = jwt.sign(
        { id: decoded.id },
        JWT_SECRET,
        { expiresIn: '12h' }
      )

      res.json({ accessToken: newAccessToken })
    })
  } catch (err) {
    console.error('Error refreshing token:', err)
    res.status(500).json({ error: 'Server error while refreshing token' })
  }
}


export const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const employeeId = req.body.employeeId
    if (!employeeId) {
      return res.status(400).json({ error: 'Missing employeeId' })
    }

    // Build image path for DB
    const filePath = `/uploads/profile/${req.file.filename}`

    // Save to database
    const db = await getDb()
    await db.execute('UPDATE users SET profile_image = ? WHERE id = ?', [filePath, employeeId])

    res.json({
      message: 'Profile picture uploaded successfully',
      file: filePath,
    })
  } catch (err) {
    console.error('Upload failed:', err)
    res.status(500).json({ error: 'Server error during upload' })
  }
}