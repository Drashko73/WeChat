const RefreshToken = require('../models/refreshToken');
const config = require('../common/config');

function cleanupRefreshTokensJob() {
  setInterval(async () => {
    try {
      const now = new Date();
      await RefreshToken.deleteMany({
        $or: [
          { expiresAt: { $lte: now } },
          { used: true }
        ]
      });

      console.log("[RF Cleanup Job] Executed at:", now);
    } catch (err) {
      console.log('Refresh token cleanup error:', err);
    }
  }, parseInt(config.REFRESH_TOKEN_CLEANUP_INTERVAL_MINUTES, 10) * 60 * 1000);
}

module.exports = {
  cleanupRefreshTokensJob
}