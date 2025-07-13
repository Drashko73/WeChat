const FriendRequest = require('../models/friendRequest');
const Friendship = require('../models/friendship');
const User = require('../models/user');
const mongoose = require('mongoose');
const FriendRequestDto = require('../dtos/response/friendRequestDto');
const FriendDto = require('../dtos/response/friendDto');
const PaginatedResponseDto = require('../dtos/response/paginatedResponseDto');

/**
 * Service for handling friend-related operations
 */
class FriendService {
  /**
   * Create a new friend request
   * @param {String} senderId - User ID of the request sender
   * @param {String} receiverId - User ID of the request receiver
   * @param {String} message - Optional message to include with the request
   * @returns {Object} - Result with success status and data or error
   */
  async createFriendRequest(senderId, receiverId, message = '') {
    try {
      // Validate IDs
      if (!mongoose.Types.ObjectId.isValid(senderId) || !mongoose.Types.ObjectId.isValid(receiverId)) {
        return { success: false, error: 'Invalid user ID', status: 400 };
      }

      // Check if users exist
      const [sender, receiver] = await Promise.all([
        User.findById(senderId),
        User.findById(receiverId)
      ]);

      if (!sender) {
        return { success: false, error: 'Sender not found', status: 404 };
      }

      if (!receiver) {
        return { success: false, error: 'Receiver not found', status: 404 };
      }

      // Check if trying to add self as friend
      if (senderId === receiverId) {
        return { success: false, error: 'Cannot send friend request to yourself', status: 400 };
      }

      // Check if already friends
      const alreadyFriends = await Friendship.areFriends(senderId, receiverId);
      if (alreadyFriends) {
        return { success: false, error: 'Users are already friends', status: 400 };
      }

      // Check for existing friend request
      const existingRequest = await FriendRequest.findOne({
        $or: [
          { sender: senderId, receiver: receiverId },
          { sender: receiverId, receiver: senderId }
        ]
      });

      if (existingRequest) {
        if (existingRequest.sender.toString() === senderId) {
          return { success: false, error: 'Friend request already sent', status: 400 };
        } else {
          return { 
            success: false, 
            error: 'You already have a pending request from this user', 
            existingRequestId: existingRequest._id,
            status: 400 
          };
        }
      }

      // Create friend request
      const friendRequest = new FriendRequest({
        sender: senderId,
        receiver: receiverId,
        message: message,
        status: 'pending'
      });

      await friendRequest.save();

      // Populate sender and receiver for the DTO
      await friendRequest.populate('sender receiver');

      return {
        success: true,
        data: new FriendRequestDto(friendRequest, true),
        message: 'Friend request sent successfully',
        status: 201
      };
    } catch (error) {
      console.error('Error creating friend request:', error);
      return { success: false, error: error.message, status: 500 };
    }
  }

  /**
   * Respond to a friend request (accept or reject)
   * @param {String} userId - ID of the user responding to the request
   * @param {String} requestId - ID of the friend request
   * @param {String} action - 'accept' or 'reject'
   * @returns {Object} - Result with success status and data or error
   */
  async respondToFriendRequest(userId, requestId, action) {
    try {
      if (!mongoose.Types.ObjectId.isValid(requestId)) {
        return { success: false, error: 'Invalid request ID', status: 400 };
      }

      // Find the request and check if it exists and is pending
      const friendRequest = await FriendRequest.findById(requestId).populate([
        { path: 'sender', select: '_id username full_name profile_pic_path' },
        { path: 'receiver', select: '_id username full_name profile_pic_path' }
      ]);
      
      if (!friendRequest) {
        return { success: false, error: 'Friend request not found', status: 404 };
      }

      // Check if the user is the intended receiver of the request
      if (friendRequest.receiver._id.toString() !== userId) {
        return { success: false, error: 'Not authorized to respond to this request', status: 403 };
      }

      // Check if the request is still pending
      if (friendRequest.status !== 'pending') {
        return { 
          success: false, 
          error: `Friend request has already been ${friendRequest.status}`,
          status: 400 
        };
      }

      // Update request status based on action
      if (action === 'accept') {
        friendRequest.status = 'accepted';
        friendRequest.updatedAt = new Date();
        await friendRequest.save();
      }
      else if (action === 'reject') {
        // Delete the request if rejected
        let senderId = friendRequest.sender._id.toString();

        await friendRequest.deleteOne();

        return {
          status: 200,
          success: true,
          data: {
            sender: senderId,
          },
          message: 'Friend request rejected successfully',
          error: null
        }
      }

      // If accepted, create a friendship between users
      if (action === 'accept') {
        const friendship = new Friendship({
          user1: friendRequest.sender._id,
          user2: friendRequest.receiver._id,
          sourceRequest: friendRequest._id
        });
        await friendship.save();
      }

      // Create DTO with full details
      const requestDto = new FriendRequestDto(friendRequest, true);
      
      return {
        success: true,
        data: requestDto,
        message: `Friend request ${action === 'accept' ? 'accepted' : 'rejected'} successfully`,
        status: 200
      };
    } catch (error) {
      console.error('Error responding to friend request:', error);
      return { success: false, error: error.message, status: 500 };
    }
  }

  /**
   * Get pending friend requests for a user
   * @param {String} userId - User ID to get requests for
   * @param {Number} page - Page number for pagination
   * @param {Number} limit - Number of items per page
   * @param {String} direction - 'incoming' or 'outgoing' requests
   * @returns {Object} - Paginated result with friend requests
   */
  async getFriendRequests(userId, page = 1, limit = 10, direction = 'incoming') {
    try {
      const query = direction === 'incoming' 
        ? { receiver: userId, status: 'pending' }
        : { sender: userId };
      
      const total = await FriendRequest.countDocuments(query);
      
      const friendRequests = await FriendRequest.find(query)
        .populate('sender receiver')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
      
      const requestDtos = friendRequests.map(req => new FriendRequestDto(req, true));
      
      return {
        success: true,
        data: new PaginatedResponseDto(requestDtos, page, limit, total),
        status: 200
      };
    } catch (error) {
      console.error('Error getting friend requests:', error);
      return { success: false, error: error.message, status: 500 };
    }
  }

  /**
   * Get friends list for a user
   * @param {String} userId - User ID to get friends for
   * @param {Number} page - Page number for pagination
   * @param {Number} limit - Number of items per page
   * @param {String} search - Optional search term for filtering by name or username
   * @returns {Object} - Paginated result with friends list
   */
  async getFriends(userId, page = 1, limit = 10, search = '') {
    try {
      // Find all friendships where the user is involved
      const query = {
        $or: [
          { user1: userId },
          { user2: userId }
        ]
      };
      
      const totalFriendships = await Friendship.countDocuments(query);
      
      const friendships = await Friendship.find(query)
        .sort({ lastInteractionAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
      
      // Get the IDs of the friends (the other user in each friendship)
      const friendIds = friendships.map(friendship => 
        friendship.user1.toString() === userId 
          ? friendship.user2 
          : friendship.user1
      );
      
      // Find user details for all friends
      let friendsQuery = User.find({ _id: { $in: friendIds } });
      
      // Apply search filter if provided
      if (search && search.trim() !== '') {
        const searchRegex = new RegExp(search.trim(), 'i');
        friendsQuery = User.find({
          _id: { $in: friendIds },
          $or: [
            { username: searchRegex },
            { full_name: searchRegex }
          ]
        });
      }
      
      const friends = await friendsQuery.select('_id username full_name profile_pic_path status last_active');
      
      // Map friendship data to friends
      const friendsWithDetails = friends.map(friend => {
        const friendship = friendships.find(f => 
          f.user1.toString() === friend._id.toString() || 
          f.user2.toString() === friend._id.toString()
        );
        
        return new FriendDto(friend, friendship.lastInteractionAt);
      });
      
      return {
        success: true,
        data: new PaginatedResponseDto(friendsWithDetails, page, limit, totalFriendships),
        status: 200
      };
    } catch (error) {
      console.error('Error getting friends list:', error);
      return { success: false, error: error.message, status: 500 };
    }
  }

  /**
   * Remove a friendship
   * @param {String} userId - ID of the user initiating the removal
   * @param {String} friendId - ID of the friend to remove
   * @returns {Object} - Result with success status and data or error
   */
  async removeFriend(userId, friendId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(friendId)) {
        return { success: false, error: 'Invalid friend ID', status: 400 };
      }

      // Get user details before deletion for WebSocket notification
      const friendUser = await User.findById(friendId, 'username full_name');
      if (!friendUser) {
        return { success: false, error: 'Friend not found', status: 404 };
      }

      // Check if the friendship exists
      const friendship = await Friendship.findFriendship(userId, friendId);
      
      if (!friendship) {
        return { success: false, error: 'Friendship not found', status: 404 };
      }

      // Delete the friendship
      await friendship.deleteOne();
      
      // Also delete any associated friend requests
      await FriendRequest.deleteMany({
        $or: [
          { sender: userId, receiver: friendId },
          { sender: friendId, receiver: userId }
        ]
      });

      return {
        success: true,
        message: 'Friend removed successfully',
        data: {
          removedFriendId: friendId,
          removedFriendUsername: friendUser.username,
          removedFriendFullName: friendUser.full_name
        },
        status: 200
      };
    } catch (error) {
      console.error('Error removing friend:', error);
      return { success: false, error: error.message, status: 500 };
    }
  }

  /**
   * Cancel a sent friend request
   * @param {String} userId - ID of the user who sent the request
   * @param {String} requestId - ID of the request to cancel
   * @returns {Object} - Result with success status and data or error
   */
  async cancelFriendRequest(userId, requestId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(requestId)) {
        return { success: false, error: 'Invalid request ID', status: 400 };
      }

      // Find the request with populated sender and receiver
      const friendRequest = await FriendRequest.findById(requestId)
        .populate('sender', 'username full_name profile_pic_path')
        .populate('receiver', 'username full_name profile_pic_path');
      
      if (!friendRequest) {
        return { success: false, error: 'Friend request not found', status: 404 };
      }

      // Check if the user is the sender of the request
      if (friendRequest.sender._id.toString() !== userId) {
        return { success: false, error: 'Not authorized to cancel this request', status: 403 };
      }

      // Check if the request can be canceled (only pending requests)
      if (friendRequest.status !== 'pending') {
        return { 
          success: false, 
          error: `Cannot cancel a request that has been ${friendRequest.status}`,
          status: 400 
        };
      }

      // Create DTO before deleting
      const friendRequestDto = new FriendRequestDto(friendRequest);

      // Delete the friend request
      await friendRequest.deleteOne();

      return {
        success: true,
        message: 'Friend request canceled successfully',
        data: friendRequestDto,
        status: 200
      };
    } catch (error) {
      console.error('Error in cancelFriendRequest service:', error);
      return { success: false, error: 'Internal server error', status: 500 };
    }
  }
  
  /**
   * Check friendship status between two users
   * @param {String} userId1 - First user ID
   * @param {String} userId2 - Second user ID
   * @returns {Object} - Result with friendship status
   */
  async checkFriendshipStatus(userId1, userId2) {
    try {
      if (userId1 === userId2) {
        return { success: true, status: 'self', statusCode: 200 };
      }
      
      // Check if they're already friends
      const friendship = await Friendship.findFriendship(userId1, userId2);
      if (friendship) {
        return { success: true, status: 'friends', statusCode: 200 };
      }
      
      // Check for pending friend requests
      const friendRequest = await FriendRequest.findOne({
        $or: [
          { sender: userId1, receiver: userId2 },
          { sender: userId2, receiver: userId1 }
        ]
      });
      
      if (!friendRequest) {
        return { success: true, status: 'none', statusCode: 200 };
      }
      
      if (friendRequest.status === 'pending') {
        if (friendRequest.sender.toString() === userId1) {
          return { success: true, status: 'request-sent', statusCode: 200 };
        } else {
          return { success: true, status: 'request-received', statusCode: 200 };
        }
      }
      
      return { success: true, status: friendRequest.status, statusCode: 200 };
    } catch (error) {
      console.error('Error checking friendship status:', error);
      return { success: false, error: error.message, status: 500 };
    }
  }
}

module.exports = new FriendService();
