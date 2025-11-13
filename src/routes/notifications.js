import express from 'express'
import { verifyToken } from '../middleware/verifyToken.js'
import * as ctrl from '../controllers/notificationsController.js'

const router = express.Router()

router.get('/', verifyToken, ctrl.getNotificationsData)

router.get('/:id', verifyToken, ctrl.getMyNotificationsData)

export default router
