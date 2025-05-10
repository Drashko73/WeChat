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
 *         description: Validation error or X-Device-ID header missing
 *       500:
 *         description: Internal server error
 */
router.post('/send-verification', authController.sendVerificationCode);

/**
 * @swagger
 * /api/auth/confirm-email:
 *  post:
 *    summary: Confirm email address
 *    description: Confirm the email address using the verification code sent to the user's email.
 *    tags: [Auth]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              email:
 *                type: string
 *                example: johndoe@example.com
 *              verification_code:
 *                type: string
 *                example: 123456
 *    responses:
 *      200:
 *        description: Email confirmed successfully
 *      400:
 *        description: Validation error
 *      404:
 *        description: Verification code or user with provided email not found
 *      500:
 *        description: Internal server error
 */
router.post('/confirm-email', authController.confirmEmail);

/**
 * @swagger
 * /api/auth/login:
 *  post:
 *    summary: User login
 *    description: Login a user with email and password.
 *    tags: [Auth]
 *    parameters:
 *      - in: header
 *        name: X-Device-ID
 *        schema:
 *          type: string
 *        required: true
 *        description: Unique identifier for the device
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              email:
 *                type: string
 *                example: johndoe@example.com
 *              password:
 *                type: string
 *                example: StrongPassword123
 *    responses:
 *      200:
 *        description: User logged in successfully
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                message:
 *                  type: string
 *                  example: User logged in successfully
 *                access_token:
 *                  type: string
 *                  example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                refresh_token:
 *                  type: string
 *                  example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *      400:
 *        description: Validation error
 *      401:
 *        description: Invalid credentials
 *      500:
 *        description: Internal server error
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /api/auth/refresh:
 *  post:
 *    summary: Refresh access token
 *    description: Get a new access token using a refresh token
 *    tags: [Auth]
 *    parameters:
 *      - in: header
 *        name: X-Device-ID
 *        schema:
 *          type: string
 *        required: true
 *        description: Unique identifier for the device, must match the device that was used to get the refresh token
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              refresh_token:
 *                type: string
 *                example: 7b12f8f64a234b29be732e998520ea89
 *    responses:
 *      200:
 *        description: Token refreshed successfully
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                message:
 *                  type: string
 *                  example: Token refreshed successfully
 *                access_token:
 *                  type: string
 *                  example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                refresh_token:
 *                  type: string
 *                  example: 89eda4c37b91af84ce734e9a0d34e123
 *      400:
 *        description: Bad request - missing refresh token or device ID
 *      401:
 *        description: Unauthorized - invalid, expired or used refresh token
 *      404:
 *        description: User not found or unavailable
 *      500:
 *        description: Internal server error
 */
router.post('/refresh', authController.refresh);

module.exports = router;