import { getDb } from '../models/db.js'

export async function getMetaData(req, res) {
  try {
    const db = getDb()

    // You can filter which sets to fetch via query params later (optional)
    const [positions] = await db.execute(
      'SELECT id, name FROM positions ORDER BY name ASC'
    )

    const [roles] = await db.execute(
      'SELECT id, name FROM roles ORDER BY name ASC'
    )

    const [users] = await db.execute(
      'SELECT id, first_name, last_name FROM users ORDER BY first_name ASC'
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
