const Chat = require('../models/chat');
const Message = require('../models/message');
const User = require('../models/user');
const Friendship = require('../models/friendship');
const mongoose = require('mongoose');

class ChatService {
  /**
   * Get all chats for a user
   * @param {String} userId - User ID
   * @param {Number} page - Page number (default: 1)
   * @param {Number} limit - Number of chats per page (default: 20)
   * @returns {Object} - Paginated chats with messages
   */
  async getUserChats(userId, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      
      const chats = await Chat.find({
        participants: userId,
        isActive: true
      })
      .populate({
        path: 'participants',
        select: 'full_name username profile_pic_path',
        match: { _id: { $ne: userId } } // Exclude current user from participants
      })
      .populate({
        path: 'lastMessage',
        select: 'content type sender createdAt isDeleted',
        populate: {
          path: 'sender',
          select: 'full_name username'
        }
      })
      .sort({ lastActivity: -1 })
      .skip(skip)
      .limit(limit);

      const totalChats = await Chat.countDocuments({
        participants: userId,
        isActive: true
      });

      return {
        chats,
        totalChats,
        currentPage: page,
        totalPages: Math.ceil(totalChats / limit),
        hasNextPage: page < Math.ceil(totalChats / limit),
        hasPrevPage: page > 1
      };
    } catch (error) {
      throw new Error(`Failed to get user chats: ${error.message}`);
    }
  }

  /**
   * Get or create a private chat between two users
   * @param {String} userId1 - First user ID
   * @param {String} userId2 - Second user ID
   * @returns {Object} - Chat object
   */
  async getOrCreatePrivateChat(userId1, userId2) {
    try {
      // Check if users are friends
      const areFriends = await Friendship.areFriends(userId1, userId2);
      if (!areFriends) {
        throw new Error('Users must be friends to start a chat');
      }

      // Find or create the chat
      const chat = await Chat.findOrCreatePrivateChat(userId1, userId2);
      
      // Populate participants (excluding current user)
      await chat.populate({
        path: 'participants',
        select: 'full_name username profile_pic_path',
        match: { _id: { $ne: userId1 } }
      });

      return chat;
    } catch (error) {
      throw new Error(`Failed to get or create private chat: ${error.message}`);
    }
  }

  /**
   * Get messages for a specific chat
   * @param {String} chatId - Chat ID
   * @param {String} userId - User ID (for authorization)
   * @param {Number} page - Page number (default: 1)
   * @param {Number} limit - Number of messages per page (default: 50)
   * @returns {Object} - Paginated messages
   */
  async getChatMessages(chatId, userId, page = 1, limit = 50) {
    try {
      // Verify user is a participant in this chat
      const chat = await Chat.findById(chatId);
      if (!chat || !chat.isParticipant(userId)) {
        throw new Error('Chat not found or user is not a participant');
      }

      const skip = (page - 1) * limit;
      
      const messages = await Message.find({
        chat: chatId,
        isDeleted: false
      })
      .populate({
        path: 'sender',
        select: 'full_name username profile_pic_path'
      })
      .populate({
        path: 'replyTo',
        select: 'content sender type createdAt',
        populate: {
          path: 'sender',
          select: 'full_name username'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

      const totalMessages = await Message.countDocuments({
        chat: chatId,
        isDeleted: false
      });

      // Mark messages as delivered to the requesting user
      const undeliveredMessages = messages.filter(message => 
        message.sender.toString() !== userId &&
        !message.deliveredTo.some(delivery => 
          delivery.user.toString() === userId
        )
      );

      // Mark as delivered in bulk
      if (undeliveredMessages.length > 0) {
        await Message.updateMany(
          {
            _id: { $in: undeliveredMessages.map(msg => msg._id) },
            'deliveredTo.user': { $ne: userId }
          },
          {
            $push: {
              deliveredTo: {
                user: userId,
                deliveredAt: new Date()
              }
            }
          }
        );
      }

      return {
        messages: messages.reverse(), // Return in chronological order
        totalMessages,
        currentPage: page,
        totalPages: Math.ceil(totalMessages / limit),
        hasNextPage: page < Math.ceil(totalMessages / limit),
        hasPrevPage: page > 1
      };
    } catch (error) {
      throw new Error(`Failed to get chat messages: ${error.message}`);
    }
  }

  /**
   * Send a message in a chat
   * @param {String} chatId - Chat ID
   * @param {String} senderId - Sender ID
   * @param {String} content - Message content
   * @param {String} type - Message type (default: 'text')
   * @param {String} replyToId - ID of message being replied to (optional)
   * @param {Array} attachments - File attachments (optional)
   * @returns {Object} - Created message
   */
  async sendMessage(chatId, senderId, content, type = 'text', replyToId = null, attachments = []) {
    try {
      // Verify chat exists and user is a participant
      const chat = await Chat.findById(chatId);
      if (!chat || !chat.isParticipant(senderId)) {
        throw new Error('Chat not found or user is not a participant');
      }

      // Create the message
      const message = new Message({
        chat: chatId,
        sender: senderId,
        content,
        type,
        replyTo: replyToId,
        attachments
      });

      await message.save();

      // Update chat's last message and activity
      chat.lastMessage = message._id;
      chat.lastActivity = new Date();
      await chat.save();

      // Populate sender information
      await message.populate({
        path: 'sender',
        select: 'full_name username profile_pic_path'
      });

      if (replyToId) {
        await message.populate({
          path: 'replyTo',
          select: 'content sender type createdAt',
          populate: {
            path: 'sender',
            select: 'full_name username'
          }
        });
      }

      return message;
    } catch (error) {
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  /**
   * Mark messages as read
   * @param {String} chatId - Chat ID
   * @param {String} userId - User ID
   * @param {Array} messageIds - Array of message IDs (optional, marks all if not provided)
   * @returns {Boolean} - Success status
   */
  async markMessagesAsRead(chatId, userId, messageIds = null) {
    try {
      // Verify user is a participant in this chat
      const chat = await Chat.findById(chatId);
      if (!chat || !chat.isParticipant(userId)) {
        throw new Error('Chat not found or user is not a participant');
      }

      let query = {
        chat: chatId,
        sender: { $ne: userId }, // Don't mark own messages as read
        'readBy.user': { $ne: userId } // Only unread messages
      };

      if (messageIds && messageIds.length > 0) {
        query._id = { $in: messageIds };
      }

      await Message.updateMany(
        query,
        {
          $push: {
            readBy: {
              user: userId,
              readAt: new Date()
            }
          }
        }
      );

      return true;
    } catch (error) {
      throw new Error(`Failed to mark messages as read: ${error.message}`);
    }
  }

  /**
   * Edit a message
   * @param {String} messageId - Message ID
   * @param {String} userId - User ID (must be sender)
   * @param {String} newContent - New message content
   * @returns {Object} - Updated message
   */
  async editMessage(messageId, userId, newContent) {
    try {
      const message = await Message.findById(messageId);
      
      if (!message) {
        throw new Error('Message not found');
      }

      if (message.sender.toString() !== userId) {
        throw new Error('Only the sender can edit their message');
      }

      if (message.isDeleted) {
        throw new Error('Cannot edit a deleted message');
      }

      await message.editContent(newContent);
      
      await message.populate({
        path: 'sender',
        select: 'full_name username profile_pic_path'
      });

      return message;
    } catch (error) {
      throw new Error(`Failed to edit message: ${error.message}`);
    }
  }

  /**
   * Delete a message
   * @param {String} messageId - Message ID
   * @param {String} userId - User ID (must be sender)
   * @returns {Object} - Updated message
   */
  async deleteMessage(messageId, userId) {
    try {
      const message = await Message.findById(messageId);
      
      if (!message) {
        throw new Error('Message not found');
      }

      if (message.sender.toString() !== userId) {
        throw new Error('Only the sender can delete their message');
      }

      await message.softDelete();
      
      await message.populate({
        path: 'sender',
        select: 'full_name username profile_pic_path'
      });

      return message;
    } catch (error) {
      throw new Error(`Failed to delete message: ${error.message}`);
    }
  }

  /**
   * Add reaction to a message
   * @param {String} messageId - Message ID
   * @param {String} userId - User ID
   * @param {String} emoji - Emoji reaction
   * @returns {Object} - Updated message
   */
  async addReaction(messageId, userId, emoji) {
    try {
      const message = await Message.findById(messageId);
      
      if (!message) {
        throw new Error('Message not found');
      }

      await message.addReaction(userId, emoji);
      
      await message.populate({
        path: 'sender',
        select: 'full_name username profile_pic_path'
      });

      return message;
    } catch (error) {
      throw new Error(`Failed to add reaction: ${error.message}`);
    }
  }

  /**
   * Remove reaction from a message
   * @param {String} messageId - Message ID
   * @param {String} userId - User ID
   * @returns {Object} - Updated message
   */
  async removeReaction(messageId, userId) {
    try {
      const message = await Message.findById(messageId);
      
      if (!message) {
        throw new Error('Message not found');
      }

      await message.removeReaction(userId);
      
      await message.populate({
        path: 'sender',
        select: 'full_name username profile_pic_path'
      });

      return message;
    } catch (error) {
      throw new Error(`Failed to remove reaction: ${error.message}`);
    }
  }

  /**
   * Get unread message count for user
   * @param {String} userId - User ID
   * @returns {Number} - Unread message count
   */
  async getUnreadMessageCount(userId) {
    try {
      const userChats = await Chat.find({
        participants: userId,
        isActive: true
      }).select('_id');

      const chatIds = userChats.map(chat => chat._id);

      const unreadCount = await Message.countDocuments({
        chat: { $in: chatIds },
        sender: { $ne: userId },
        'readBy.user': { $ne: userId },
        isDeleted: false
      });

      return unreadCount;
    } catch (error) {
      throw new Error(`Failed to get unread message count: ${error.message}`);
    }
  }
}

module.exports = new ChatService();
