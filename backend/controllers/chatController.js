const chatService = require('../services/chatService');
const { validationResult } = require('express-validator');

class ChatController {
  /**
   * Get all chats for the authenticated user
   */
  async getUserChats(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      const result = await chatService.getUserChats(userId, page, limit);

      return res.status(200).json({
        success: true,
        message: 'Chats retrieved successfully',
        data: result
      });
    } catch (error) {
      console.error('Error getting user chats:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get user chats'
      });
    }
  }

  /**
   * Get or create a private chat with another user
   */
  async getOrCreatePrivateChat(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user.id;
      const { friendId } = req.params;

      if (userId === friendId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot create chat with yourself'
        });
      }

      const chat = await chatService.getOrCreatePrivateChat(userId, friendId);

      return res.status(200).json({
        success: true,
        message: 'Chat retrieved successfully',
        data: { chat }
      });
    } catch (error) {
      console.error('Error getting or creating private chat:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get or create private chat'
      });
    }
  }

  /**
   * Get messages for a specific chat
   */
  async getChatMessages(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user.id;
      const { chatId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;

      const result = await chatService.getChatMessages(chatId, userId, page, limit);

      return res.status(200).json({
        success: true,
        message: 'Messages retrieved successfully',
        data: result
      });
    } catch (error) {
      console.error('Error getting chat messages:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get chat messages'
      });
    }
  }

  /**
   * Send a message in a chat
   */
  async sendMessage(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user.id;
      const { chatId } = req.params;
      const { content, type = 'text', replyToId } = req.body;

      // Handle file attachments if any
      const attachments = req.files ? req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path
      })) : [];

      const message = await chatService.sendMessage(
        chatId,
        userId,
        content,
        type,
        replyToId,
        attachments
      );

      // Send real-time notification to chat participants via WebSocket
      if (global.websocketServer) {
        // Get chat participants
        const Chat = require('../models/chat');
        const chat = await Chat.findById(chatId).populate('participants', '_id');
        
        if (chat) {
          const participantIds = chat.participants
            .map(p => p._id.toString())
            .filter(id => id !== userId); // Exclude sender
          
          // Send new message notification to other participants
          global.websocketServer.sendToUsers(participantIds, 'new_message', {
            message,
            chatId,
            timestamp: new Date().toISOString()
          });
        }
      }

      return res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: { message }
      });
    } catch (error) {
      console.error('Error sending message:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to send message'
      });
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user.id;
      const { chatId } = req.params;
      const { messageIds } = req.body; // Optional array of specific message IDs

      await chatService.markMessagesAsRead(chatId, userId, messageIds);

      // Send real-time read receipt notification via WebSocket
      if (global.websocketServer) {
        const Chat = require('../models/chat');
        const chat = await Chat.findById(chatId).populate('participants', '_id');
        
        if (chat) {
          const participantIds = chat.participants
            .map(p => p._id.toString())
            .filter(id => id !== userId); // Exclude the reader
          
          // Send read receipt to other participants
          global.websocketServer.sendToUsers(participantIds, 'messages_read', {
            chatId,
            userId,
            messageIds: messageIds || 'all',
            readAt: new Date().toISOString()
          });
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Messages marked as read successfully'
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to mark messages as read'
      });
    }
  }

  /**
   * Edit a message
   */
  async editMessage(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user.id;
      const { messageId } = req.params;
      const { content } = req.body;

      const message = await chatService.editMessage(messageId, userId, content);

      // Send real-time message edit notification via WebSocket
      if (global.websocketServer) {
        const Chat = require('../models/chat');
        const chat = await Chat.findById(message.chat).populate('participants', '_id');
        
        if (chat) {
          const participantIds = chat.participants
            .map(p => p._id.toString())
            .filter(id => id !== userId); // Exclude editor
          
          // Send edited message notification to other participants
          global.websocketServer.sendToUsers(participantIds, 'message_edited', {
            message,
            timestamp: new Date().toISOString()
          });
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Message edited successfully',
        data: { message }
      });
    } catch (error) {
      console.error('Error editing message:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to edit message'
      });
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user.id;
      const { messageId } = req.params;

      const message = await chatService.deleteMessage(messageId, userId);

      // Send real-time message delete notification via WebSocket
      if (global.websocketServer) {
        const Chat = require('../models/chat');
        const chat = await Chat.findById(message.chat).populate('participants', '_id');
        
        if (chat) {
          const participantIds = chat.participants
            .map(p => p._id.toString()) // send to all participants so that they can update their UI
          
          // Send deleted message notification to other participants
          global.websocketServer.sendToUsers(participantIds, 'message_deleted', {
            messageId,
            chatId: message.chat,
            timestamp: new Date().toISOString()
          });
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Message deleted successfully',
        data: { message }
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete message'
      });
    }
  }

  /**
   * Add reaction to a message
   */
  async addReaction(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user.id;
      const { messageId } = req.params;
      const { emoji } = req.body;

      const message = await chatService.addReaction(messageId, userId, emoji);

      // Send real-time reaction notification via WebSocket
      if (global.websocketServer) {
        const Chat = require('../models/chat');
        const chat = await Chat.findById(message.chat).populate('participants', '_id');
        
        if (chat) {
          const participantIds = chat.participants
            .map(p => p._id.toString())
            .filter(id => id !== userId); // Exclude reactor
          
          // Send reaction notification to other participants
          global.websocketServer.sendToUsers(participantIds, 'message_reaction_added', {
            messageId,
            userId,
            emoji,
            chatId: message.chat,
            timestamp: new Date().toISOString()
          });
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Reaction added successfully',
        data: { message }
      });
    } catch (error) {
      console.error('Error adding reaction:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to add reaction'
      });
    }
  }

  /**
   * Remove reaction from a message
   */
  async removeReaction(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user.id;
      const { messageId } = req.params;

      const message = await chatService.removeReaction(messageId, userId);

      return res.status(200).json({
        success: true,
        message: 'Reaction removed successfully',
        data: { message }
      });
    } catch (error) {
      console.error('Error removing reaction:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to remove reaction'
      });
    }
  }

  /**
   * Get unread message count for the authenticated user
   */
  async getUnreadMessageCount(req, res) {
    try {
      const userId = req.user.id;
      const unreadCount = await chatService.getUnreadMessageCount(userId);

      return res.status(200).json({
        success: true,
        message: 'Unread message count retrieved successfully',
        data: { unreadCount }
      });
    } catch (error) {
      console.error('Error getting unread message count:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get unread message count'
      });
    }
  }
}

module.exports = new ChatController();
