const User = require('../models/user');
const VerificationCode = require('../models/verificationCode');
const crypto = require('crypto');
const validators = require('../utils/validationUtils');
const emailSender = require('../utils/sendMail');
const config = require('../common/config');

async function registerUser(full_name, email, username, password, profile_pic_path) {
  // Validate input
  if (!full_name || !email || !username || !password) {
    return { error: 'All fields are required', status: 400 };
  }
  if (!validators.validateFullName(full_name)) {
    return { error: 'Invalid full name format', status: 400 };
  }
  if (!validators.validateEmailAddress(email)) {
    return { error: 'Invalid email format', status: 400 };
  }
  if (!validators.validateUsername(username)) {
    return { error: 'Invalid username format', status: 400 };
  }

  // Check for unique email and username
  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    return { error: 'Email already exists', status: 409 };
  }
  const existingUsername = await User.findOne({ username });
  if (existingUsername) {
    return { error: 'Username already exists', status: 409 };
  }

  // Create user
  const user = new User({
    full_name,
    email,
    username,
    profile_pic_path
  });
  await user.setPassword(password);
  await user.save();

  // Send welcome email
  emailSender.sendWelcomeEmail(user.email, user.full_name).catch(console.error);

  return { user };
};

async function sendVerificationCode(email) {
  if (!email) {
    return { error: 'Email is required', status: 400 };
  }
  if (!validators.validateEmailAddress(email)) {
    return { error: 'Invalid email format', status: 400 };
  }

  // Check if user with this email exists
  const user = await User.findOne({ email });
  if (!user) {
    return { error: 'User not found', status: 404 };
  }

  // Check if user is already verified
  if (user.isVerified) {
    return { error: 'User is already verified', status: 400 };
  }

  // Check if user is deleted
  if (user.is_deleted) {
    return { error: 'User is deleted', status: 400 };
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

  // Generate new verification code
  const codeLength = parseInt(config.VERIFICATION_CODE_LENGTH, 10);
  const code = Array.from({ length: codeLength }, () => Math.floor(Math.random() * 10)).join('');
  // Encrypt code
  const encryptedCode = crypto.createHash('sha256').update(code).digest('hex');
  // Set expiration
  const expiresAt = new Date(Date.now() + parseInt(config.VERIFICATION_CODE_EXPIRATION_MINUTES, 10) * 60000);
  // Save to DB
  await VerificationCode.create({ email, code: encryptedCode, expiresAt });
  // Send code via email
  emailSender.sendVerificationCodeEmail(email, code).catch(console.error);

  return { message: 'Verification code sent successfully', status: 200 };
}

async function getUserByEmail(email) {  
  return await User.findOne({ email });
};

module.exports = { 
  registerUser,
  sendVerificationCode,
  getUserByEmail
};