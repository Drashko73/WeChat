const mongoose = require('mongoose');

const verificationCodeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  code: { type: String, required: true }, // Encrypted
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('VerificationCode', verificationCodeSchema);