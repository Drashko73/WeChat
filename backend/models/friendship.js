const mongoose = require('mongoose');

const friendshipSchema = new mongoose.Schema({
  user1: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  user2: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now, required: true },
  lastInteractionAt: { type: Date, default: Date.now },
  // The source of this friendship - which friend request led to this friendship
  sourceRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'FriendRequest' }
}, { timestamps: true });

// Make sure the combination of user1 and user2 is unique
// This prevents duplicate friendships
friendshipSchema.index({ user1: 1, user2: 1 }, { unique: true });

// For faster friend lookup queries
friendshipSchema.index({ user1: 1 });
friendshipSchema.index({ user2: 1 });

// Helper static method to check if two users are friends
friendshipSchema.statics.areFriends = async function(userId1, userId2) {
  const friendship = await this.findOne({
    $or: [
      { user1: userId1, user2: userId2 },
      { user1: userId2, user2: userId1 }
    ]
  });
  
  return !!friendship;
};

// Helper static method to find a friendship between two users
friendshipSchema.statics.findFriendship = async function(userId1, userId2) {
  return this.findOne({
    $or: [
      { user1: userId1, user2: userId2 },
      { user1: userId2, user2: userId1 }
    ]
  });
};

const Friendship = mongoose.model('Friendship', friendshipSchema);

module.exports = Friendship;
