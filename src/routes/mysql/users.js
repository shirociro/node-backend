// routes/users.js
import express from 'express'
import { verifyToken } from '../../middleware/verifyToken.js'
import { uploadProfile } from '../../config/multer.js'
import * as ctrl from '../../controllers/mysql/userController.js'


const router = express.Router()

// --- User Routes ---
router.get('/total', ctrl.getUsersTotal) // Get total count of users
// router.get('/', ctrl.listUsersBatch)           // Get paginated list of users
router.get('/:id', ctrl.getUserById) // ✅ Get single user by ID
router.post('/', ctrl.createUser) // Create new user (no password)
router.post('/login', ctrl.loginUser)
router.post('/refresh', ctrl.refreshToken)
router.patch('/:id', ctrl.patchUser) // Update specific user fields
// router.put('/:id', ctrl.putUser)               // Replace user record
router.delete('/:id', ctrl.deleteUser) // Delete user by ID
router.get('/', verifyToken, ctrl.listUsersBatch)

router.post('/upload', uploadProfile.single('image'), ctrl.uploadProfilePicture)
export default router
