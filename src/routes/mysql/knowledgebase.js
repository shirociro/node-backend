// routes/tasks.js
import express from 'express'
import { verifyToken } from '../../middleware/verifyToken.js'
import * as ctrl from '../../controllers/mysql/knowledgebaseController.js'
const router = express.Router()

router.get('/total',verifyToken, ctrl.getKBsTotal)
router.get('/',verifyToken, ctrl.listKBsBatch)
router.post('/', ctrl.createKB)
router.patch('/:id', ctrl.patchKB)
router.put('/:id', ctrl.putKB)
router.delete('/:id', ctrl.deleteTask)

export default router
