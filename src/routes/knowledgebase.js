import express from 'express'
import * as ctrl from '../controllers/knowledgebase.js'

const router = express.Router()

// router.get('/', ctrl.listTasks)
router.get('/total', ctrl.getKBsTotal)
router.get('/', ctrl.listKBsBatch)
router.post('/', ctrl.createKB)
router.patch('/:id', ctrl.patchKB)
router.put('/:id', ctrl.putKB)
router.delete('/:id', ctrl.deleteKB)

export default router
