/**
 * DTO for friend request details in responses
 */
class FriendRequestDto {
  constructor(friendRequest, includeDetails = false) {
    this.id = friendRequest._id;
    this.status = friendRequest.status;
    this.sentAt = friendRequest.sentAt;
    this.updatedAt = friendRequest.updatedAt;
    
    if (includeDetails && friendRequest.message) {
      this.message = friendRequest.message;
    }

    // Populate sender and receiver if they are populated in the source object
    if (friendRequest.sender) {
      if (typeof friendRequest.sender === 'object') {
        this.sender = {
          id: friendRequest.sender._id ? friendRequest.sender._id.toString() : undefined,
          username: friendRequest.sender.username,
          full_name: friendRequest.sender.full_name,
          profile_picture: friendRequest.sender.profile_picture || null
        };
      } else {
        this.sender = friendRequest.sender.toString();
      }
    }

    if (friendRequest.receiver) {
      if (typeof friendRequest.receiver === 'object') {
        this.receiver = {
          id: friendRequest.receiver._id ? friendRequest.receiver._id.toString() : undefined,
          username: friendRequest.receiver.username,
          full_name: friendRequest.receiver.full_name,
          profile_picture: friendRequest.receiver.profile_picture || null
        };
      } else {
        this.receiver = friendRequest.receiver.toString();
      }
    }
  }
}

module.exports = FriendRequestDto;
