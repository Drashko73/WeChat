const mongoose = require('mongoose');

const friendRequestSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
    required: true
  },
  message: { type: String, maxLength: 500 },
  sentAt: { type: Date, default: Date.now, required: true },
  updatedAt: { type: Date, default: Date.now, required: true }
}, { timestamps: true });

// Add indexes to optimize queries
friendRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true });
friendRequestSchema.index({ status: 1 });
friendRequestSchema.index({ receiver: 1, status: 1 });
friendRequestSchema.index({ sender: 1, status: 1 });

// Prevent multiple friend requests between the same users
friendRequestSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Check if there's already a friend request between these users (in either direction)
    const existingRequest = await mongoose.model('FriendRequest').findOne({
      $or: [
        { sender: this.sender, receiver: this.receiver },
        { sender: this.receiver, receiver: this.sender }
      ]
    });
    
    if (existingRequest) {
      return next(new Error('A friend request already exists between these users'));
    }
  }
  next();
});

const FriendRequest = mongoose.model('FriendRequest', friendRequestSchema);

module.exports = FriendRequest;
