import { getDb } from '../models/db.js'

export async function getNotificationsData(req, res) {
  try {
    const db = getDb()

    // You can filter which sets to fetch via query params later (optional)
    const [rows] = await db.execute(
      'SELECT * FROM notifications'
    )

    // Send all option data together
    return res.json(rows)

   
  } catch (err) {
    console.error('Error fetching meta data:', err)
    res.status(500).json({ error: 'Database error while fetching meta data' })
  }
}

export async function getMyNotificationsData(req, res) {
  try {
    const db = getDb()
    const { id } = req.params
     const [rows] = await db.execute(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      [id]
    )

    return res.json(rows)

  } catch (err) {
    console.error('Error fetching meta data:', err)
    res.status(500).json({ error: 'Database error while fetching meta data' })
  }
}