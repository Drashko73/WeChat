const friendService = require('../services/friendService');
const CreateFriendRequestDto = require('../dtos/request/createFriendRequestDto');
const RespondFriendRequestDto = require('../dtos/request/respondFriendRequestDto');

/**
 * Controller for handling friend-related operations
 */
class FriendController {
  /**
   * Send a friend request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async sendFriendRequest(req, res) {
    try {
      const senderId = req.user.id; // From JWT authentication
      const dto = new CreateFriendRequestDto(req.body);
      
      // Validate the DTO
      const validation = dto.validate();
      if (!validation.isValid) {
        return res.status(400).json({ success: false, error: validation.error });
      }
      
      const result = await friendService.createFriendRequest(
        senderId, 
        dto.receiverId, 
        dto.message
      );
      
      // If request created successfully, send real-time notification to receiver
      if (result.success && result.data) {
        // Check if WebSocket server is initialized and access it from the global object
        if (global.websocketServer && typeof global.websocketServer.sendToUser === 'function') {
          global.websocketServer.sendToUser(
            dto.receiverId, 
            'friend_request', 
            result.data
          );
        } else {
          console.log('WebSocket server not properly initialized or sendToUser method not available');
        }
      }
      
      return res.status(result.status).json({
        success: result.success,
        data: result.data,
        message: result.message,
        error: result.error
      });
    } catch (error) {
      console.error('Error in sendFriendRequest controller:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * Respond to a friend request (accept/reject)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async respondToFriendRequest(req, res) {
    try {
      const userId = req.user.id; // From JWT authentication
      const dto = new RespondFriendRequestDto(req.body);
      
      // Validate the DTO
      const validation = dto.validate();
      if (!validation.isValid) {
        return res.status(400).json({ success: false, error: validation.error });
      }
      
      const result = await friendService.respondToFriendRequest(
        userId,
        dto.requestId,
        dto.action
      );

      console.log(result)
      
      // If request accepted, send real-time notification to sender
      // If request rejected, send real-time notification to sender
      if (result.success && result.data) {
        // The FriendRequestDto might have a different structure than expected
        // Let's safely extract the sender ID with proper debugging
        let senderId;
        if (result.data.sender) {
          if (typeof result.data.sender === 'object') {
            senderId = result.data.sender.id || result.data.sender._id;
            console.log('Extracted sender ID from object:', senderId);
          } else {
            senderId = result.data.sender;
            console.log('Using sender ID directly:', senderId);
          }
        } else {
          console.error('No sender found in the response:', result.data);
        }

        if (!senderId) {
          console.error('Failed to extract sender ID:', result.data);
          return res.status(400).json({ success: false, error: 'Invalid response structure' });
        }

        if (global.websocketServer && typeof global.websocketServer.sendToUser === 'function') {
          // Create a friend object from the current user to send to the other user
          const currentUser = req.user;
          const friendData = {
            id: currentUser.id,
            username: currentUser.username,
            full_name: currentUser.full_name,
            profile_picture: currentUser.profile_pic_path || null,
            status: 'online',
            lastSeen: new Date().toISOString()
          };
          if (dto.action === 'accept') {
            console.log(`Sending friend_request_accepted notification to: ${senderId}`);
            global.websocketServer.sendToUser(
              senderId, 
              'friend_request_accepted', 
              friendData
            );
          }
          else if (dto.action === 'reject') {
            console.log(`Sending friend_request_rejected notification to: ${senderId}`);
            global.websocketServer.sendToUser(
              senderId, 
              'friend_request_rejected', 
              { requestId: dto.requestId }
            );
          }
        }
      }
      
      return res.status(result.status).json({
        success: result.success,
        data: result.data,
        message: result.message,
        error: result.error
      });
    } catch (error) {
      console.error('Error in respondToFriendRequest controller:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * Get all friend requests for the current user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getFriendRequests(req, res) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const direction = req.query.direction === 'outgoing' ? 'outgoing' : 'incoming';
      
      const result = await friendService.getFriendRequests(userId, page, limit, direction);
      
      return res.status(result.status).json({
        success: result.success,
        data: result.data,
        error: result.error
      });
    } catch (error) {
      console.error('Error in getFriendRequests controller:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * Get friends list for the current user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getFriends(req, res) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';
      
      const result = await friendService.getFriends(userId, page, limit, search);
      
      return res.status(result.status).json({
        success: result.success,
        data: result.data,
        error: result.error
      });
    } catch (error) {
      console.error('Error in getFriends controller:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * Remove a friend
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async removeFriend(req, res) {
    try {
      const userId = req.user.id;
      const friendId = req.params.friendId;
      
      const result = await friendService.removeFriend(userId, friendId);
      
      // If friend removed successfully, send real-time notification to both users
      if (result.success) {
        if (global.websocketServer && typeof global.websocketServer.sendToUser === 'function') {
          // Send notification to the friend that they were removed
          console.log(`Sending friend_removed notification to: ${friendId}`);
          global.websocketServer.sendToUser(
            friendId, 
            'friend_removed', 
            { 
              removedById: userId,
              removedByUsername: req.user.username,
              removedByFullName: req.user.full_name,
              timestamp: new Date().toISOString()
            }
          );
          
          // Send confirmation to the user who removed the friend
          console.log(`Sending friend_removal_confirmed notification to: ${userId}`);
          global.websocketServer.sendToUser(
            userId, 
            'friend_removal_confirmed', 
            { 
              removedFriendId: friendId,
              timestamp: new Date().toISOString()
            }
          );
        }
      }
      
      return res.status(result.status).json({
        success: result.success,
        message: result.message,
        error: result.error
      });
    } catch (error) {
      console.error('Error in removeFriend controller:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * Cancel a previously sent friend request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async cancelFriendRequest(req, res) {
    try {
      const userId = req.user.id;
      const requestId = req.params.requestId;
      
      const result = await friendService.cancelFriendRequest(userId, requestId);
      
      // If request cancelled successfully, send real-time notification to receiver
      if (result.success && result.data) {
        if (global.websocketServer && typeof global.websocketServer.sendToUser === 'function') {
          // Send notification to the receiver that the request was cancelled
          let receiverId;
          if (result.data.receiver) {
            if (typeof result.data.receiver === 'object') {
              receiverId = result.data.receiver.id || result.data.receiver._id;
            } else {
              receiverId = result.data.receiver;
            }
          }
          
          if (receiverId) {
            console.log(`Sending friend_request_cancelled notification to: ${receiverId}`);
            global.websocketServer.sendToUser(
              receiverId, 
              'friend_request_cancelled', 
              result.data
            );
          }
        }
      }
      
      return res.status(result.status).json({
        success: result.success,
        message: result.message,
        error: result.error
      });
    } catch (error) {
      console.error('Error in cancelFriendRequest controller:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
  
  /**
   * Check friendship status with another user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async checkFriendshipStatus(req, res) {
    try {
      const userId = req.user.id;
      const otherUserId = req.params.userId;
      
      const result = await friendService.checkFriendshipStatus(userId, otherUserId);
      
      return res.status(result.statusCode || 200).json({
        success: result.success,
        status: result.status,
        error: result.error
      });
    } catch (error) {
      console.error('Error in checkFriendshipStatus controller:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}

module.exports = new FriendController();
