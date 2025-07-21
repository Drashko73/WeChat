const express = require('express');
const { body, param, query } = require('express-validator');
const chatController = require('../controllers/chatController');
const { authenticateJWT: auth } = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/chat_files');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allow images, documents, and other common file types
  const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx|txt|mp4|avi|mov|wmv|webm|mp3|wav|ogg|m4a|aac/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('File type not allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

// Validation middleware
const validateObjectId = (field) => {
  return param(field)
    .isMongoId()
    .withMessage(`${field} must be a valid MongoDB ObjectId`);
};

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

const validateSendMessage = [
  body('content')
    .notEmpty()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Content must be between 1 and 5000 characters'),
  body('type')
    .optional()
    .isIn(['text', 'image', 'file'])
    .withMessage('Type must be text, image, or file'),
  body('replyToId')
    .optional()
    .isMongoId()
    .withMessage('Reply to ID must be a valid MongoDB ObjectId')
];

const validateEditMessage = [
  body('content')
    .notEmpty()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Content must be between 1 and 5000 characters')
];

const validateReaction = [
  body('emoji')
    .notEmpty()
    .isLength({ min: 1, max: 10 })
    .withMessage('Emoji must be between 1 and 10 characters')
];

const validateMarkAsRead = [
  body('messageIds')
    .optional()
    .isArray()
    .withMessage('Message IDs must be an array'),
  body('messageIds.*')
    .optional()
    .isMongoId()
    .withMessage('Each message ID must be a valid MongoDB ObjectId')
];

// Routes

/**
 * @route GET /api/chats
 * @desc Get all chats for the authenticated user
 * @access Private
 */
router.get('/',
  auth,
  validatePagination,
  chatController.getUserChats
);

/**
 * @route GET /api/chats/unread-count
 * @desc Get unread message count for the authenticated user
 * @access Private
 */
router.get('/unread-count',
  auth,
  chatController.getUnreadMessageCount
);

/**
 * @route GET /api/chats/private/:friendId
 * @desc Get or create a private chat with another user
 * @access Private
 */
router.get('/private/:friendId',
  auth,
  validateObjectId('friendId'),
  chatController.getOrCreatePrivateChat
);

/**
 * @route GET /api/chats/:chatId/messages
 * @desc Get messages for a specific chat
 * @access Private
 */
router.get('/:chatId/messages',
  auth,
  validateObjectId('chatId'),
  validatePagination,
  chatController.getChatMessages
);

/**
 * @route POST /api/chats/:chatId/messages
 * @desc Send a message in a chat
 * @access Private
 */
router.post('/:chatId/messages',
  auth,
  upload.array('files', 5), // Allow up to 5 files
  validateObjectId('chatId'),
  validateSendMessage,
  chatController.sendMessage
);

/**
 * @route PUT /api/chats/:chatId/read
 * @desc Mark messages as read in a chat
 * @access Private
 */
router.put('/:chatId/read',
  auth,
  validateObjectId('chatId'),
  validateMarkAsRead,
  chatController.markMessagesAsRead
);

/**
 * @route PUT /api/chats/messages/:messageId
 * @desc Edit a message
 * @access Private
 */
router.put('/messages/:messageId',
  auth,
  validateObjectId('messageId'),
  validateEditMessage,
  chatController.editMessage
);

/**
 * @route DELETE /api/chats/messages/:messageId
 * @desc Delete a message
 * @access Private
 */
router.delete('/messages/:messageId',
  auth,
  validateObjectId('messageId'),
  chatController.deleteMessage
);

/**
 * @route POST /api/chats/messages/:messageId/reactions
 * @desc Add reaction to a message
 * @access Private
 */
router.post('/messages/:messageId/reactions',
  auth,
  validateObjectId('messageId'),
  validateReaction,
  chatController.addReaction
);

/**
 * @route DELETE /api/chats/messages/:messageId/reactions
 * @desc Remove reaction from a message
 * @access Private
 */
router.delete('/messages/:messageId/reactions',
  auth,
  validateObjectId('messageId'),
  chatController.removeReaction
);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 10MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 5 files per message.'
      });
    }
  }
  
  if (error.message === 'File type not allowed') {
    return res.status(400).json({
      success: false,
      message: 'File type not allowed. Supported types: images, documents, audio, video.'
    });
  }
  
  next(error);
});

module.exports = router;
