const router = require('express').Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the status of the server.
 *     tags: [Health Check]
 *     responses:
 *       200:
 *         description: Server is running.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "OK"
 */
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

/**
 * @swagger
 * /api/virtualTime:
 *   get:
 *    summary: Get virtual time
 *    description: Returns the current virtual time.
 *    tags: [Health Check]
 *    responses:
 *      200:
 *        description: Virtual time retrieved successfully.
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                virtualTime:
 *                  type: string
 *                  example: "2025-10-04T12:00:00Z"
 */
router.get('/virtualTime', (req, res) => {
  const virtualTime = new Date().toISOString();
  res.status(200).json({ virtualTime: virtualTime });
});

module.exports = router;