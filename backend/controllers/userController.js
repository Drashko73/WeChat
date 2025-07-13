const userService = require('../services/userService');

/**
 * Controller for user search and profile operations
 */
class UserController {
  /**
   * Search for users
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async searchUsers(req, res) {
    try {
      const userId = req.user.id;
      const { searchTerm } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      
      if (!searchTerm || searchTerm.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Search term is required'
        });
      }
      
      const result = await userService.searchUsers(searchTerm, userId, page, limit);
      
      return res.status(result.status).json({
        success: result.success,
        data: result.data,
        error: result.error
      });
    } catch (error) {
      console.error('Error in searchUsers controller:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}

module.exports = new UserController();
