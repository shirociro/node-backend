import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()

export function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Missing token' })
  }

  console.log('verifyToken using secret:', process.env.JWT_SECRET)
  console.log('token (first 30 chars):', token?.slice(0, 30))

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    console.error('JWT verify error:', err.name, err.message)
    if (err.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'TokenExpired' })
    }
    return res.status(403).json({ error: 'Invalid token' })
  }
}
