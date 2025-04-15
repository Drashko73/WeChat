const authService = require('../services/authService');
const path = require('path');
const crypto = require('crypto');
const VerificationCode = require('../models/verificationCode');
const config = require('../common/config');

exports.register = async (req, res) => {
  try {
    const { full_name, email, username, password } = req.body;
    let profilePicPath = null;
    if (req.file) {
      profilePicPath = path.join('uploads/profile_pics', req.file.filename);
    }

    // Call service to handle registration
    const { user, error, status } = await authService.registerUser({
      full_name,
      email,
      username,
      password,
      profile_pic_path: profilePicPath
    });

    if (error) {
      return res.status(status).json({ message: error });
    }

    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        full_name: user.full_name,
        profile_pic_path: user.profile_pic_path
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.sendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    // Check if email is valid
    if (!require('../utils/validationUtils').validateEmailAddress(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    // Check if user with this email exists
    const user = await authService.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is already verified
    if (user.isVerified) {
      return res.status(400).json({ message: 'User is already verified' });
    }

    // Check if user is deleted
    if (user.is_deleted) {
      return res.status(400).json({ message: 'User is deleted' });
    }
    
    // Check if verification code already exists
    // and it is not expired nor used
    // In this case, delete the old code
    const oldCode = await VerificationCode.findOne({ email });
    if (oldCode) {
      const now = new Date();
      if (oldCode.expiresAt > now && !oldCode.used) {
        await VerificationCode.deleteOne({ email });
      }
    }

    // Generate code
    const codeLength = parseInt(config.VERIFICATION_CODE_LENGTH, 10);
    const code = Array.from({ length: codeLength }, () => Math.floor(Math.random() * 10)).join('');
    // Encrypt code
    const encryptedCode = crypto.createHash('sha256').update(code).digest('hex');
    // Set expiration
    const expiresAt = new Date(Date.now() + parseInt(config.VERIFICATION_CODE_EXPIRATION_MINUTES, 10) * 60000);
    // Save to DB
    await VerificationCode.create({ email, code: encryptedCode, expiresAt });
    // Send code via email
    const { sendVerificationCodeEmail } = require('../utils/sendMail');
    await sendVerificationCodeEmail(email, code);
    return res.status(200).json({ message: 'Verification code sent' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};