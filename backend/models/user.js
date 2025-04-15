const mongoose = require('mongoose');
const validators = require('../utils/validationUtils');
const bcrypt = require('bcrypt');
const config = require('../common/config');

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

const UserModel = mongoose.model('User', UserSchema);

module.exports = UserModel;