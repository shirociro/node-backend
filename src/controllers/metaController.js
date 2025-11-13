import { getDb } from '../models/db.js'

export async function getMetaData(req, res) {
  try {
    const db = getDb()

    // You can filter which sets to fetch via query params later (optional)
    const [positions] = await db.execute(
      'SELECT * FROM user_position ORDER BY name ASC'
    )

    const [roles] = await db.execute(
      'SELECT * FROM user_role ORDER BY name ASC'
    )

    const [users] = await db.execute(
      'SELECT * FROM users ORDER BY firstname ASC'
    )

    // Send all option data together
    return res.json({
      positions,
      roles,
      users
    })
  } catch (err) {
    console.error('Error fetching meta data:', err)
    res.status(500).json({ error: 'Database error while fetching meta data' })
  }
}
