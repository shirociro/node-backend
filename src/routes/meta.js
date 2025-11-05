import express from 'express'
import { verifyToken } from '../middleware/verifyToken.js'
import * as ctrl from '../controllers/metaController.js'

const router = express.Router()

router.get('/', verifyToken, ctrl.getMetaData)

export default router
