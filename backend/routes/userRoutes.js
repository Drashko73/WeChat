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

module.exports = router;
