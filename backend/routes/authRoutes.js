const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const authController = require('../controllers/authController');

// Multer setup for profile picture uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/profile_pics'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Register a new user with validations and profile picture upload.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: johndoe@example.com
 *               username:
 *                 type: string
 *                 example: johndoe
 *               password:
 *                 type: string
 *                 example: StrongPassword123
 *               profile_pic:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User registered successfully
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     username:
 *                       type: string
 *                     full_name:
 *                       type: string
 *                     profile_pic_path:
 *                       type: string
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email or username already exists
 */
router.post('/register', upload.single('profile_pic'), authController.register);

/**
 * @swagger
 * /api/auth/send-verification:
 *   post:
 *     summary: Send email verification code
 *     description: Sends a verification code to the specified email for confirmation.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: johndoe@example.com
 *     responses:
 *       200:
 *         description: Verification code sent
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/send-verification', authController.sendVerificationCode);

module.exports = router;