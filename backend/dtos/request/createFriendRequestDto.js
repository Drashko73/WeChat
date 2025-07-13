/**
 * DTO for creating a new friend request
 */
class CreateFriendRequestDto {
  constructor(data) {
    this.receiverId = data.receiverId;
    this.message = data.message || '';
  }

  validate() {
    if (!this.receiverId) {
      return { isValid: false, error: 'Receiver ID is required' };
    }
    
    if (this.message && this.message.length > 500) {
      return { isValid: false, error: 'Message cannot exceed 500 characters' };
    }

    return { isValid: true };
  }
}

module.exports = CreateFriendRequestDto;
