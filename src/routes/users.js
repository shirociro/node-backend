import express from 'express'
import { verifyToken } from '../middleware/verifyToken.js'
import { uploadProfile } from '../config/multer.js'
import * as ctrl from '../controllers/userController.js'


const router = express.Router()

router.get('/total', ctrl.getUsersTotal) 
router.get('/:id', ctrl.getUserById)
// router.post('/', ctrl.createUser) 
router.post('/', uploadProfile.single('image'), ctrl.createUser)
router.post('/login', ctrl.loginUser)
router.post('/refresh', ctrl.refreshToken)
router.patch('/:id', ctrl.patchUser) 
router.delete('/:id', ctrl.deleteUser) 
router.get('/', verifyToken, ctrl.listUsersBatch)
router.post('/upload', uploadProfile.single('image'), ctrl.uploadProfilePicture)

export default router
