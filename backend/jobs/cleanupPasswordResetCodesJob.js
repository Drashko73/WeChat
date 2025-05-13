const PasswordResetCode = require('../models/passwordResetCode');
const config = require('../common/config');

function cleanupPasswordResetCodesJob() {
  setInterval(async () => {
    try {
      const now = new Date();
      await PasswordResetCode.deleteMany({
        $or: [
          { expiresAt: { $lte: now } },
          { used: true }
        ]
      });
      // Optionally log cleanup
      console.log('[PRC Cleanup Job] Executed at:', now);
    } catch (err) {
      console.error('Password reset code cleanup error:', err);
    }
  }, parseInt(config.PASSWORD_RESET_CODE_CLEANUP_INTERVAL_MINUTES || 60, 10) * 60000);
}

module.exports = {
  cleanupPasswordResetCodesJob
}