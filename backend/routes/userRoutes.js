const router = require('express').Router();
const { authenticateJWT } = require('../middlewares/auth');
const userController = require('../controllers/userController');

// Apply authentication middleware to all user routes
router.use(authenticateJWT);

/**
 * @swagger
 * /api/users/search:
 *   get:
 *     summary: Search for users
 *     description: Search for users by username or full name
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: searchTerm
 *         schema:
 *           type: string
 *         required: true
 *         description: Term to search for in usernames and names
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of users matching the search term
 *       400:
 *         description: Invalid input
 */
router.get('/search', userController.searchUsers);

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get current user profile
 *     description: Get the current authenticated user's profile information
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "64a7b8c9d1e2f3a4b5c6d7e8"
 *                     username:
 *                       type: string
 *                       example: "johndoe"
 *                     full_name:
 *                       type: string
 *                       example: "John Doe"
 *                     email:
 *                       type: string
 *                       example: "johndoe@example.com"
 *                     profile_picture:
 *                       type: string
 *                       nullable: true
 *                       example: "uploads/profile_pics/1234567890-123456789.jpg"
 *                     email_confirmed:
 *                       type: boolean
 *                       example: true
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/profile', userController.getCurrentUserProfile);

module.exports = router;
