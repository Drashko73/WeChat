const router = require('express').Router();
const { authenticateJWT } = require('../middlewares/auth');

/**
 * @swagger
 * /api/protected/profile:
 *   get:
 *     summary: Get user's profile information
 *     description: Protected route that requires authentication. Returns the current user's profile information.
 *     tags: [Protected]
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
 *                 message:
 *                   type: string
 *                   example: Access granted to protected route
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     full_name:
 *                       type: string
 *       401:
 *         description: Unauthorized - Invalid or missing token
 */
router.get('/profile', authenticateJWT, (req, res) => {
  // req.user is set by the authenticateJWT middleware
  return res.status(200).json({
    message: 'Access granted to protected route',
    user: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      full_name: req.user.full_name
    }
  });
});

/**
 * @swagger
 * /api/protected/test:
 *   get:
 *     summary: Test protected route
 *     description: A simple test endpoint to verify that authentication is working properly.
 *     tags: [Protected]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Authentication successful! This is a protected route.
 *       401:
 *         description: Unauthorized - Invalid or missing token
 */
router.get('/test', authenticateJWT, (req, res) => {
  return res.status(200).json({
    message: 'Authentication successful! This is a protected route.'
  });
});

module.exports = router;
