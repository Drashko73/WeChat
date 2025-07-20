const router = require('express').Router();
const { authenticateJWT } = require('../middlewares/auth');
const statsController = require('../controllers/statsController');

// Apply authentication middleware to all stats routes
router.use(authenticateJWT);

/**
 * @swagger
 * /api/stats/dashboard:
 *   get:
 *     summary: Get dashboard statistics
 *     description: Get comprehensive statistics for the user dashboard
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     friends:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         pendingRequests:
 *                           type: number
 *                         sentRequests:
 *                           type: number
 *                     chats:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         unreadMessages:
 *                           type: number
 *                     messages:
 *                       type: object
 *                       properties:
 *                         sent:
 *                           type: number
 *                         received:
 *                           type: number
 *                         total:
 *                           type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/dashboard', statsController.getDashboardStats);

/**
 * @swagger
 * /api/stats/activity:
 *   get:
 *     summary: Get user activity statistics
 *     description: Get user activity statistics over a specified time period
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *         description: Number of days to look back for activity data
 *     responses:
 *       200:
 *         description: Activity statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/activity', statsController.getActivityStats);

/**
 * @swagger
 * /api/stats/message-types:
 *   get:
 *     summary: Get message type statistics
 *     description: Get statistics about the types of messages sent by the user
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Message type statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/message-types', statsController.getMessageTypeStats);

/**
 * @swagger
 * /api/stats/active-chats:
 *   get:
 *     summary: Get most active chats
 *     description: Get the most active chats based on message count
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Number of chats to return
 *     responses:
 *       200:
 *         description: Most active chats retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/active-chats', statsController.getMostActiveChats);

module.exports = router;
