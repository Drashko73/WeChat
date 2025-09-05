/**
 * DTO for responding to a friend request (accept/reject)
 */
class RespondFriendRequestDto {
  constructor(data) {
    this.requestId = data.requestId;
    this.action = data.action; // 'accept' or 'reject'
  }

  validate() {
    if (!this.requestId) {
      return { isValid: false, error: 'Friend request ID is required' };
    }

    if (!this.action) {
      return { isValid: false, error: 'Action is required' };
    }

    if (this.action !== 'accept' && this.action !== 'reject') {
      return { isValid: false, error: 'Action must be either "accept" or "reject"' };
    }

    return { isValid: true };
  }
}

module.exports = RespondFriendRequestDto;
