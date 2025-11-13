// src/config/multerConfig.js
import multer from 'multer'
import fs from 'fs'
import path from 'path'

// 📁 Resolve absolute directory path for uploads (safe & cross-platform)
const profileDir = path.join(process.cwd(), 'uploads', 'profile')

// ✅ Ensure the directory exists (recursive handles nested folders)
if (!fs.existsSync(profileDir)) {
  fs.mkdirSync(profileDir, { recursive: true })
  console.log(`📂 Created upload directory: ${profileDir}`)
}

// 🧠 Multer disk storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profileDir)
  },
  // filename: (req, file, cb) => {
  //   // ✅ path.extname safely extracts file extension (".png", ".jpg", etc.)
  //   const ext = path.extname(file.originalname).toLowerCase()
  //   const employeeId = req.body.employeeId || 'unknown'
  //   cb(null, `employee-id-${employeeId}${ext}`)
  // },
  filename: (req, file, cb) => {
  // ✅ Extract file extension safely
    const ext = path.extname(file.originalname).toLowerCase()

    // Use firstname + lastname directly
    const firstname = req.body.firstname.replace(/\s+/g, '_')
    const lastname = req.body.lastname.replace(/\s+/g, '_')

    // Add timestamp to prevent collisions
    const timestamp = Date.now()

    cb(null, `${firstname}_${lastname}_${timestamp}${ext}`)
  },
})

// 🧹 File validation
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/jpg']
  if (allowed.includes(file.mimetype)) cb(null, true)
  else cb(new Error('❌ Invalid file type. Only JPG and PNG are allowed.'))
}

// 🚀 Export a configured Multer instance
export const uploadProfile = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
})
