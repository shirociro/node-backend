import express from 'express'
import * as ctrl from '../controllers/tasksController.js'

const router = express.Router()

// router.get('/', ctrl.listTasks)
router.get('/total', ctrl.getTasksTotal)
router.get('/', ctrl.listTasksBatch)
router.post('/', ctrl.createTask)
router.patch('/:id', ctrl.patchTask)
router.put('/:id', ctrl.putTask)
router.delete('/:id', ctrl.deleteTask)

export default router
