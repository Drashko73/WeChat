const userService = require('../services/userService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../common/config');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/profile_pics');
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Create unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

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

  /**
   * Update current user's profile information
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { full_name } = req.body;
      
      // Prepare update data
      const updateData = {};
      if (full_name && full_name.trim()) {
        updateData.full_name = full_name.trim();
      }
      
      // Handle profile picture upload
      if (req.file) {
        updateData.profile_pic_path = `uploads/profile_pics/${req.file.filename}`;
      }
      
      // If no data to update
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid data provided for update'
        });
      }
      
      const result = await userService.updateUserProfile(userId, updateData);
      
      return res.status(result.status).json({
        success: result.success,
        data: result.data,
        error: result.error
      });
    } catch (error) {
      console.error('Error in updateProfile controller:', error);
      
      // Clean up uploaded file if there was an error
      if (req.file) {
        const filePath = path.join(__dirname, '../uploads/profile_pics', req.file.filename);
        fs.unlink(filePath, (err) => {
          if (err) console.error('Error deleting uploaded file:', err);
        });
      }
      
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  // Middleware for profile picture upload
  uploadProfilePicture = upload.single('profile_picture');
}

module.exports = new UserController();
