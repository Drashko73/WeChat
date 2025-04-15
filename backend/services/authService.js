const User = require('../models/user');
const validators = require('../utils/validationUtils');
const sendWelcomeEmail = require('../utils/sendMail');

exports.registerUser = async ({ full_name, email, username, password, profile_pic_path }) => {
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
  sendWelcomeEmail(user.email, user.full_name).catch(console.error);

  return { user };
};

async function getUserByEmail(email) {  
  return await User.findOne({ email });
};

module.exports = { 
  getUserByEmail
};