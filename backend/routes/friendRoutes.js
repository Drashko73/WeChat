const router = require('express').Router();
const { authenticateJWT } = require('../middlewares/auth');
const friendController = require('../controllers/friendController');

// Apply authentication middleware to all friend routes
router.use(authenticateJWT);

/**
 * @swagger
 * /api/friends/requests:
 *   post:
 *     summary: Send a friend request
 *     description: Sends a friend request to another user
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - receiverId
 *             properties:
 *               receiverId:
 *                 type: string
 *                 description: ID of the user to send the request to
 *               message:
 *                 type: string
 *                 description: Optional message to include with the request
 *     responses:
 *       201:
 *         description: Friend request sent successfully
 *       400:
 *         description: Invalid input or already friends
 *       404:
 *         description: User not found
 */
router.post('/requests', friendController.sendFriendRequest);

/**
 * @swagger
 * /api/friends/requests/respond:
 *   post:
 *     summary: Respond to a friend request
 *     description: Accept or reject a friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - requestId
 *               - action
 *             properties:
 *               requestId:
 *                 type: string
 *                 description: ID of the friend request
 *               action:
 *                 type: string
 *                 enum: [accept, reject]
 *                 description: Action to take on the request
 *     responses:
 *       200:
 *         description: Request responded to successfully
 *       400:
 *         description: Invalid input or request already processed
 *       404:
 *         description: Friend request not found
 */
router.post('/requests/respond', friendController.respondToFriendRequest);

/**
 * @swagger
 * /api/friends/requests:
 *   get:
 *     summary: Get friend requests
 *     description: Get incoming or outgoing friend requests for the current user
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: direction
 *         schema:
 *           type: string
 *           enum: [incoming, outgoing]
 *           default: incoming
 *         description: Direction of friend requests
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
 *         description: List of friend requests
 */
router.get('/requests', friendController.getFriendRequests);

/**
 * @swagger
 * /api/friends:
 *   get:
 *     summary: Get friends list
 *     description: Get the current user's friends list
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for filtering friends by name or username
 *     responses:
 *       200:
 *         description: List of friends
 */
router.get('/', friendController.getFriends);

/**
 * @swagger
 * /api/friends/{friendId}:
 *   delete:
 *     summary: Remove a friend
 *     description: Remove a user from friends list
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: friendId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the friend to remove
 *     responses:
 *       200:
 *         description: Friend removed successfully
 *       404:
 *         description: Friendship not found
 */
router.delete('/:friendId', friendController.removeFriend);

/**
 * @swagger
 * /api/friends/requests/{requestId}:
 *   delete:
 *     summary: Cancel a friend request
 *     description: Cancel a previously sent friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the request to cancel
 *     responses:
 *       200:
 *         description: Friend request canceled successfully
 *       404:
 *         description: Friend request not found
 */
router.delete('/requests/:requestId', friendController.cancelFriendRequest);

/**
 * @swagger
 * /api/friends/status/{userId}:
 *   get:
 *     summary: Check friendship status
 *     description: Check friendship status with another user
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the user to check status with
 *     responses:
 *       200:
 *         description: Friendship status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 status:
 *                   type: string
 *                   enum: [none, friends, request-sent, request-received, accepted, rejected, self]
 */
router.get('/status/:userId', friendController.checkFriendshipStatus);

module.exports = router;
