const User = require('../models/user');
const Friendship = require('../models/friendship');
const FriendRequest = require('../models/friendRequest');
const FriendDto = require('../dtos/response/friendDto');
const PaginatedResponseDto = require('../dtos/response/paginatedResponseDto');

/**
 * Service for user search and discovery
 */
class UserService {
  /**
   * Search for users by username or full name
   * @param {String} searchTerm - Term to search for
   * @param {String} currentUserId - Current user's ID
   * @param {Number} page - Page number for pagination
   * @param {Number} limit - Number of items per page
   * @returns {Object} - Paginated result with users
   */
  async searchUsers(searchTerm, currentUserId, page = 1, limit = 10) {
    try {
      if (!searchTerm || searchTerm.trim() === '') {
        return { success: false, error: 'Search term is required', status: 400 };
      }

      // Create a case-insensitive regex for the search term
      const searchRegex = new RegExp(searchTerm.trim(), 'i');
      
      // Find users matching the search term, excluding the current user and deleted users
      const query = {
        $or: [
          { username: searchRegex },
          { full_name: searchRegex }
        ],
        _id: { $ne: currentUserId },
        is_deleted: { $ne: true }
      };
      
      const total = await User.countDocuments(query);
      
      const users = await User.find(query)
        .select('_id username full_name profile_pic_path')
        .skip((page - 1) * limit)
        .limit(limit);
      
      // Get friendship status for each user
      const usersWithStatus = await Promise.all(users.map(async user => {
        const status = await this.getFriendshipStatus(currentUserId, user._id);
        
        return {
          id: user._id,
          username: user.username,
          full_name: user.full_name,
          profile_picture: user.profile_pic_path || null,
          friendStatus: status
        };
      }));
      
      return {
        success: true,
        data: new PaginatedResponseDto(usersWithStatus, page, limit, total),
        status: 200
      };
    } catch (error) {
      console.error('Error searching users:', error);
      return { success: false, error: error.message, status: 500 };
    }
  }
  
  /**
   * Get friendship status between two users
   * @param {String} userId1 - First user ID
   * @param {String} userId2 - Second user ID
   * @returns {String} - Friendship status
   */
  async getFriendshipStatus(userId1, userId2) {
    // Check if they're already friends
    const friendship = await Friendship.findFriendship(userId1, userId2);
    if (friendship) {
      return 'friends';
    }
    
    // Check for pending friend requests
    const friendRequest = await FriendRequest.findOne({
      $or: [
        { sender: userId1, receiver: userId2 },
        { sender: userId2, receiver: userId1 }
      ],
      status: 'pending'
    });
    
    if (!friendRequest) {
      return 'none';
    }
    
    if (friendRequest.sender.toString() === userId1.toString()) {
      return 'request-sent';
    } else {
      return 'request-received';
    }
  }

  /**
   * Get user by ID
   * @param {String} userId - User ID
   * @returns {Object} - User object or null
   */
  async getUserById(userId) {
    try {
      const user = await User.findById(userId);
      return user;
    } catch (error) {
      console.error('Error in getUserById:', error);
      return null;
    }
  }
}

module.exports = new UserService();
