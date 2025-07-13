/**
 * DTO for friend details in responses
 */
class FriendDto {
  constructor(user, lastInteraction = null) {
    this.id = user._id;
    this.username = user.username;
    this.full_name = user.full_name;
    this.profile_picture = user.profile_pic_path || null;
    this.status = user.status || 'offline';
    this.lastSeen = user.last_active || null;
    
    if (lastInteraction) {
      this.lastInteractionAt = lastInteraction;
    }
  }
}

module.exports = FriendDto;
