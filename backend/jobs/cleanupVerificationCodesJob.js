const VerificationCode = require('../models/verificationCode');
const config = require('../common/config');

function cleanupVerificationCodesJob() {
  setInterval(async () => {
    try {
    const now = new Date();
    await VerificationCode.deleteMany({
      $or: [
      { expiresAt: { $lte: now } },
      { used: true }
      ]
    });
    // Optionally log cleanup
    console.log('[VC Cleanup Job] Executed at:', now);
    } catch (err) {
      console.error('Verification code cleanup error:', err);
    }
  }, parseInt(config.VERIFICATION_CODE_CLEANUP_INTERVAL_MINUTES, 10) * 60000);
}

module.exports = {
  cleanupVerificationCodesJob
}