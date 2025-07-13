const mongoose = require('mongoose');
const validators = require('../utils/validationUtils');
const bcrypt = require('bcrypt');
const config = require('../common/config');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  full_name: {
    type: String,
    required: [true, 'Full name is required'],
    maxLength: 255,
    validate: {
      validator: function (v) {
        return validators.validateFullName(v);
      },
      message: props => `${props.value} is not a valid name! Only letters and spaces are allowed.`
    }
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    maxLength: 255,
    validate: {
      validator: function (v) {
        return validators.validateEmailAddress(v);
      },
      message: props => `${props.value} is not a valid email!`
    }
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    maxLength: 255,
    validate: {
      validator: function (v) {
        return validators.validateUsername(v);
      },
      message: props => `${props.value} is not a valid username! Only letters, numbers and underscores are allowed.`
    }
  },
  profile_pic_path: {
    type: String,
    default: null
  },
  password_hash: {
    type: String,
    required: [true, 'Password hash is required'],
    maxLength: 255
  },
  password_salt: {
    type: String,
    required: [true, 'Password salt is required'],
    maxLength: 255
  },
  email_confirmed: {
    type: Boolean,
    default: false
  },
  is_deleted: {
    type: Boolean,
    default: false
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
})

UserSchema.methods.setPassword = async function(password) {
  this.password_salt = await bcrypt.genSalt(Number(config.SALT_ROUNDS));
  this.password_hash = await bcrypt.hash(password, this.password_salt);
}

UserSchema.methods.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.password_hash);
}

UserSchema.methods.generateAccessToken = function() {
  return jwt.sign({
    id: this._id,
    email: this.email,
    username: this.username,
    full_name: this.full_name,
    profile_pic_path: this.profile_pic_path,
    email_confirmed: this.email_confirmed,
    is_deleted: this.is_deleted,
    created_at: this.created_at,
    updated_at: this.updated_at
  }, config.JWT_SECRET_KEY, {
    expiresIn: config.JWT_EXPIRATION_TIME,
    algorithm: config.JWT_ALGORITHM,
    issuer: config.JWT_ISSUER
  });
}

UserSchema.methods.generateRefreshToken = function() {
  // Generate a cryptographically secure random token
  // Default length: 32 bytes (256 bits)
  const tokenLength = config.REFRESH_TOKEN_LENGTH || 32;
  return crypto.randomBytes(tokenLength).toString('hex');
}

const UserModel = mongoose.model('User', UserSchema);

module.exports = UserModel;