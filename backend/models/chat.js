const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  type: {
    type: String,
    enum: ['private', 'group'],
    default: 'private',
    required: true
  },
  name: {
    type: String,
    // Optional for private chats, required for group chats
    required: function() {
      return this.type === 'group';
    }
  },
  description: {
    type: String,
    maxLength: 500
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Compound index for participants - optimizes finding chats by participants
chatSchema.index({ participants: 1 });

// Index for lastActivity to sort by most recent activity
chatSchema.index({ lastActivity: -1 });

// Helper static method to find a private chat between two users
chatSchema.statics.findPrivateChat = async function(userId1, userId2) {
  return this.findOne({
    type: 'private',
    participants: { 
      $all: [userId1, userId2], 
      $size: 2 
    },
    isActive: true
  });
};

// Helper static method to find or create a private chat between two users
chatSchema.statics.findOrCreatePrivateChat = async function(userId1, userId2) {
  let chat = await this.findPrivateChat(userId1, userId2);
  
  if (!chat) {
    chat = new this({
      participants: [userId1, userId2],
      type: 'private',
      createdBy: userId1,
      isActive: true
    });
    await chat.save();
  }
  
  return chat;
};

// Helper method to check if a user is a participant in this chat
chatSchema.methods.isParticipant = function(userId) {
  return this.participants.some(participantId => 
    participantId.toString() === userId.toString()
  );
};

// Helper method to get the other participant in a private chat
chatSchema.methods.getOtherParticipant = function(currentUserId) {
  if (this.type !== 'private') {
    throw new Error('This method is only for private chats');
  }
  
  return this.participants.find(participantId => 
    participantId.toString() !== currentUserId.toString()
  );
};

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
