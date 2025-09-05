const User = require('../models/user');
const Chat = require('../models/chat');
const Message = require('../models/message');
const Friendship = require('../models/friendship');
const FriendRequest = require('../models/friendRequest');
const mongoose = require('mongoose');

/**
 * Controller for user statistics and dashboard data
 */
class StatsController {
  /**
   * Get user dashboard statistics
   */
  async getDashboardStats(req, res) {
    try {
      const userId = req.user.id;

      // Get basic counts
      const [
        totalFriends,
        totalChats,
        unreadMessages,
        pendingFriendRequests,
        sentFriendRequests,
        totalMessagesSent,
        totalMessagesReceived
      ] = await Promise.all([
        // Total friends count
        Friendship.countDocuments({
          $or: [{ user1: userId }, { user2: userId }],
          status: 'accepted'
        }),
        
        // Total chats count
        Chat.countDocuments({
          participants: userId,
          isActive: true
        }),
        
        // Unread messages count
        Message.countDocuments({
          'readBy.user': { $ne: userId },
          sender: { $ne: userId },
          chat: { $in: await Chat.find({ participants: userId }).distinct('_id') }
        }),
        
        // Pending friend requests received
        FriendRequest.countDocuments({
          receiver: userId,
          status: 'pending'
        }),
        
        // Sent friend requests pending
        FriendRequest.countDocuments({
          sender: userId,
          status: 'pending'
        }),
        
        // Total messages sent by user
        Message.countDocuments({
          sender: userId
        }),
        
        // Total messages received by user
        Message.countDocuments({
          sender: { $ne: userId },
          chat: { $in: await Chat.find({ participants: userId }).distinct('_id') }
        })
      ]);

      res.json({
        success: true,
        message: 'Dashboard statistics retrieved successfully',
        data: {
          friends: {
            total: totalFriends,
            pendingRequests: pendingFriendRequests,
            sentRequests: sentFriendRequests
          },
          chats: {
            total: totalChats,
            unreadMessages: unreadMessages
          },
          messages: {
            sent: totalMessagesSent,
            received: totalMessagesReceived,
            total: totalMessagesSent + totalMessagesReceived
          }
        }
      });
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get dashboard statistics',
        error: error.message
      });
    }
  }

  /**
   * Get user activity statistics over time
   */
  async getActivityStats(req, res) {
    try {
      const userId = req.user.id;
      const { days = 7 } = req.query;
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      // Get messages sent per day
      const messageStats = await Message.aggregate([
        {
          $match: {
            sender: new mongoose.Types.ObjectId(userId),
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      // Get chats created per day
      const chatStats = await Chat.aggregate([
        {
          $match: {
            participants: new mongoose.Types.ObjectId(userId),
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      // Get friends added per day
      const friendStats = await Friendship.aggregate([
        {
          $match: {
            $or: [{ user1: new mongoose.Types.ObjectId(userId) }, { user2: new mongoose.Types.ObjectId(userId) }],
            status: 'accepted',
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      res.json({
        success: true,
        message: 'Activity statistics retrieved successfully',
        data: {
          period: `${days} days`,
          messages: messageStats,
          chats: chatStats,
          friends: friendStats
        }
      });
    } catch (error) {
      console.error('Error getting activity stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get activity statistics',
        error: error.message
      });
    }
  }

  /**
   * Get message type statistics
   */
  async getMessageTypeStats(req, res) {
    try {
      const userId = req.user.id;

      const messageTypeStats = await Message.aggregate([
        {
          $match: {
            sender: new mongoose.Types.ObjectId(userId)
          }
        },
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      res.json({
        success: true,
        message: 'Message type statistics retrieved successfully',
        data: messageTypeStats
      });
    } catch (error) {
      console.error('Error getting message type stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get message type statistics',
        error: error.message
      });
    }
  }

  /**
   * Get most active chats
   */
  async getMostActiveChats(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 5 } = req.query;

      const activeChats = await Chat.aggregate([
        {
          $match: {
            participants: new mongoose.Types.ObjectId(userId),
            isActive: true
          }
        },
        {
          $lookup: {
            from: 'messages',
            localField: '_id',
            foreignField: 'chat',
            as: 'messages'
          }
        },
        {
          $addFields: {
            messageCount: { $size: '$messages' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'participants',
            foreignField: '_id',
            as: 'participantDetails'
          }
        },
        {
          $addFields: {
            otherParticipants: {
              $filter: {
                input: '$participantDetails',
                cond: { $ne: ['$$this._id', new mongoose.Types.ObjectId(userId)] }
              }
            }
          }
        },
        {
          $project: {
            _id: 1,
            messageCount: 1,
            lastActivity: 1,
            otherParticipants: {
              $map: {
                input: '$otherParticipants',
                as: 'participant',
                in: {
                  id: '$$participant._id',
                  username: '$$participant.username',
                  fullName: '$$participant.full_name',
                  profilePicture: '$$participant.profile_pic_path'
                }
              }
            }
          }
        },
        {
          $sort: { messageCount: -1 }
        },
        {
          $limit: parseInt(limit)
        }
      ]);

      res.json({
        success: true,
        message: 'Most active chats retrieved successfully',
        data: activeChats
      });
    } catch (error) {
      console.error('Error getting most active chats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get most active chats',
        error: error.message
      });
    }
  }
}

module.exports = new StatsController();
