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

  /**
   * Get current user's profile information
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCurrentUserProfile(req, res) {
    try {
      const userId = req.user.id;
      const user = await userService.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: {
          id: user._id,
          username: user.username,
          full_name: user.full_name,
          email: user.email,
          profile_picture: user.profile_pic_path || null,
          email_confirmed: user.email_confirmed,
          created_at: user.created_at,
          updated_at: user.updated_at
        }
      });
    } catch (error) {
      console.error('Error in getCurrentUserProfile controller:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}

module.exports = new UserController();
