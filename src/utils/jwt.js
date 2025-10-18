import jwt from 'jsonwebtoken'
import config from '../config.js'

export function signToken(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn })
}
