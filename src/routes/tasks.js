import express from 'express'
import { verifyToken } from '../middleware/verifyToken.js'
import * as ctrl from '../controllers/tasksController.js'
const router = express.Router()

router.get('/total', verifyToken,ctrl.getTasksTotal)
router.get('/', verifyToken,ctrl.listTasksBatch)
router.post('/', ctrl.createTask)
router.patch('/:id', ctrl.patchTask)
router.put('/:id', ctrl.putTask)
router.delete('/:id', ctrl.deleteTask)

export default router
