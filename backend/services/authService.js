const User = require('../models/user');
const RefreshToken = require('../models/refreshToken');
const VerificationCode = require('../models/verificationCode');
const PasswordResetCode = require('../models/passwordResetCode');
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
  if (!validators.validatePassword(password, username, full_name)) {
    return { error: 'Invalid password format', status: 400 };
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
  if (user.email_confirmed) {
    return { error: 'User has already verified email address.', status: 400 };
  }

  // Check if user is deleted
  if (user.is_deleted) {
    return { error: 'User is deleted.', status: 400 };
  }

  // Check if verification code already exists
  // and it is not expired nor used
  // In this case, delete the old code
  const oldCode = await VerificationCode.findOne({ userId: user._id });
  if (oldCode) {
    const now = new Date();
    if (oldCode.expiresAt > now && !oldCode.used) {
      await VerificationCode.deleteOne({ userId: user._id });
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
  await VerificationCode.create({ userId: user._id, code: encryptedCode, expiresAt });
  // Send code via email
  emailSender.sendVerificationCodeEmail(email, code).catch(console.error);

  return { message: 'Verification code sent successfully', status: 200 };
}

async function confirmEmail(email, code) {
  // Validate input
  if (!email || !code) {
    return { error: 'Email and code are required', status: 400 };
  }

  if (!validators.validateEmailAddress(email)) {
    return { error: 'Invalid email format', status: 400 };
  }

  if (!validators.validateVerificationCode(code)) {
    return { error: 'Invalid verification code format', status: 400 };
  }

  // Check if user with this email exists
  const user = await User.findOne({ email });
  if (!user) {
    return { error: 'User not found', status: 404 };
  }

  // Check if user is already verified
  if (user.email_confirmed) {
    return { error: 'User has already verified email address.', status: 400 };
  }

  // Check if user is deleted
  if (user.is_deleted) {
    return { error: 'User is deleted.', status: 400 };
  }

  // Check if verification code exists
  const verificationCode = await VerificationCode.findOne({ userId: user._id });
  if (!verificationCode) {
    return { error: 'Verification code not found', status: 404 };
  }
  
  // Check if code is expired
  const now = new Date();
  if (verificationCode.expiresAt < now) {
    return { error: 'Verification code expired', status: 400 };
  }

  // Check if code is used
  if (verificationCode.used) {
    return { error: 'Verification code already used', status: 400 };
  }

  // Check if code is correct
  const encryptedCode = crypto.createHash('sha256').update(code).digest('hex');
  if (verificationCode.code !== encryptedCode) {
    return { error: 'Invalid verification code', status: 400 };
  }

  // Mark code as used
  verificationCode.used = true;
  await verificationCode.save();

  // Update user as verified
  user.email_confirmed = true;
  await user.save();

  // Send confirmation email
  emailSender.sendEmailConfirmationEmail(user.email, user.full_name).catch(console.error);
  
  return { message: 'Email confirmed successfully', status: 200 };
}

async function loginUser(email, password, deviceIdHeader) {
  // Check if device ID is provided in the request HEADER
  // If not, return error immediately
  if(!deviceIdHeader) {
    return { error: 'Device ID is required', status: 400 };
  }
  
  // Validate input
  if (!email || !password) {
    return { error: 'Email and password are required', status: 400 };
  }
  if (!validators.validateEmailAddress(email)) {
    return { error: 'Invalid email format', status: 400 };
  }
  if (!validators.validatePassword(password)) {
    return { error: 'Invalid password format', status: 400 };
  }

  // Check if user with this email exists
  const user = await User.findOne({ email });
  if (!user) {
    return { error: 'User not found', status: 404 };
  }

  // Check if user is deleted
  if (user.is_deleted) {
    return { error: 'User is deleted.', status: 400 };
  }

  // Check if user has confirmed email address
  if (!user.email_confirmed) {
    return { error: 'User has not confirmed email address.', status: 400 };
  }

  // Check if password is correct
  const isPasswordValid = await user.validatePassword(password);
  if (!isPasswordValid) {
    return { error: 'Invalid password', status: 401 };
  }

  // Generate access token
  access_token = user.generateAccessToken();
  // Generate refresh token
  // Check if refresh token already exists
  // Token must not be used, expired and must belong to
  // the same user and device
  const existingRefreshToken = await RefreshToken.findOne({ 
    $and: [
      { userId: user._id },
      { deviceId: deviceIdHeader },
      { used: false },
      { expiresAt: { $gt: new Date() } }
    ]
  });

  let refresh_token;
  if (existingRefreshToken) {
    refresh_token = existingRefreshToken.token;
  }
  else {
    refresh_token = user.generateRefreshToken();
    const expiresAt = new Date(Date.now() + parseInt(config.REFRESH_TOKEN_EXPIRATION_MINUTES, 10) * 60000);
    await RefreshToken.create({ 
      userId: user._id,
      deviceId: deviceIdHeader,
      token: refresh_token,
      expiresAt: expiresAt,
      used: false
    });
  }

  return { access_token, refresh_token };
}

async function refreshToken(refreshTokenValue, deviceId) {
  // Validate inputs
  if (!refreshTokenValue) {
    return { error: 'Refresh token is required', status: 400 };
  }
  if (!deviceId) {
    return { error: 'Device ID is required', status: 400 };
  }

  try {
    // Find the refresh token in the database
    const refreshTokenDoc = await RefreshToken.findOne({ 
      token: refreshTokenValue,
      deviceId: deviceId,
      used: false,
      expiresAt: { $gt: new Date() }
    });

    // If no valid token found, return error
    if (!refreshTokenDoc) {
      return { error: 'Invalid or expired refresh token', status: 401 };
    }

    // Find the user associated with the token
    const user = await User.findById(refreshTokenDoc.userId);
    if (!user || user.is_deleted || !user.email_confirmed) {
      return { error: 'User not found or unavailable', status: 404 };
    }

    // Mark the current refresh token as used
    refreshTokenDoc.used = true;
    await refreshTokenDoc.save();

    // Generate a new access token
    const access_token = user.generateAccessToken();

    // Generate a new refresh token
    const refresh_token = user.generateRefreshToken();
    const expiresAt = new Date(Date.now() + parseInt(config.REFRESH_TOKEN_EXPIRATION_MINUTES, 10) * 60000);
    
    // Save the new refresh token
    await RefreshToken.create({
      userId: user._id,
      deviceId: deviceId,
      token: refresh_token,
      expiresAt: expiresAt,
      used: false
    });

    return { access_token, refresh_token };
  } catch (error) {
    console.error('Error refreshing token:', error);
    return { error: 'Internal server error', status: 500 };
  }
}

async function getUserByEmail(email) {  
  return await User.findOne({ email });
};

async function requestPasswordReset(email) {
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

  // Check if user email is confirmed
  if (!user.email_confirmed) {
    return { error: 'Email address is not verified', status: 400 };
  }

  // Check if user is deleted
  if (user.is_deleted) {
    return { error: 'User is deleted', status: 400 };
  }

  // Check if password reset code already exists and is not expired nor used
  // In this case, delete the old code
  const oldCode = await PasswordResetCode.findOne({ userId: user._id });
  if (oldCode) {
    const now = new Date();
    if (oldCode.expiresAt > now && !oldCode.used) {
      await PasswordResetCode.deleteOne({ userId: user._id });
    }
  }

  // Generate new password reset code
  const codeLength = parseInt(config.PASSWORD_RESET_CODE_LENGTH || config.VERIFICATION_CODE_LENGTH, 10);
  const code = Array.from({ length: codeLength }, () => Math.floor(Math.random() * 10)).join('');
  
  // Encrypt code
  const encryptedCode = crypto.createHash('sha256').update(code).digest('hex');
  
  // Set expiration
  const expirationMinutes = parseInt(config.PASSWORD_RESET_CODE_EXPIRATION_MINUTES || 30, 10);
  const expiresAt = new Date(Date.now() + expirationMinutes * 60000);
  
  // Save to DB
  await PasswordResetCode.create({ userId: user._id, code: encryptedCode, expiresAt });
  
  // Send code via email
  emailSender.sendPasswordResetCodeEmail(email, code, expirationMinutes).catch(console.error);

  return { message: 'Password reset code sent successfully', status: 200 };
}

async function resetPassword(email, code, newPassword) {
  // Validate input
  if (!email || !code || !newPassword) {
    return { error: 'Email, code and new password are required', status: 400 };
  }

  if (!validators.validateEmailAddress(email)) {
    return { error: 'Invalid email format', status: 400 };
  }

  if (!validators.validatePasswordResetCode(code)) {
    return { error: 'Invalid reset code format', status: 400 };
  }

  // Check if user with this email exists
  const user = await User.findOne({ email });
  if (!user) {
    return { error: 'User not found', status: 404 };
  }

  // Check if user email is confirmed
  if (!user.email_confirmed) {
    return { error: 'Email address is not verified', status: 400 };
  }

  // Check if user is deleted
  if (user.is_deleted) {
    return { error: 'User is deleted', status: 400 };
  }

  // Validate new password
  if (!validators.validatePassword(newPassword, user.username, user.full_name)) {
    return { error: 'Invalid password format', status: 400 };
  }

  // Check if password reset code exists
  const passwordResetCode = await PasswordResetCode.findOne({ userId: user._id });
  if (!passwordResetCode) {
    return { error: 'Password reset code not found', status: 404 };
  }

  // Check if code is expired
  const now = new Date();
  if (passwordResetCode.expiresAt < now) {
    return { error: 'Password reset code expired', status: 400 };
  }

  // Check if code is used
  if (passwordResetCode.used) {
    return { error: 'Password reset code already used', status: 400 };
  }

  // Check if code is correct
  const encryptedCode = crypto.createHash('sha256').update(code).digest('hex');
  if (passwordResetCode.code !== encryptedCode) {
    return { error: 'Invalid password reset code', status: 400 };
  }

  // Mark code as used
  passwordResetCode.used = true;
  await passwordResetCode.save();

  // Update user password
  await user.setPassword(newPassword);
  user.updated_at = new Date();
  await user.save();

  // Send password changed confirmation email
  emailSender.sendPasswordChangedEmail(user.email, user.full_name).catch(console.error);

  return { message: 'Password reset successfully', status: 200 };
}

module.exports = { 
  registerUser,
  sendVerificationCode,
  confirmEmail,
  loginUser,
  getUserByEmail,
  refreshToken,
  requestPasswordReset,
  resetPassword
};