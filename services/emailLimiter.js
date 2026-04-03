const redis = require("../config/redis");

/**
 * Service to track the 100 emails/day quota for Resend Free.
 * Slots: 90 for Bulk/Non-priority, 10 reserved for Critical/OTP.
 */
class EmailLimiter {
  constructor() {
    this.DAILY_LIMIT = 100;
    this.BULK_THRESHOLD = 90; // Stop bulk emails after 90 to save 10 for OTPs
  }

  /**
   * Get the Redis key for the current day.
   */
  getTodayKey() {
    const today = new Date().toISOString().split("T")[0];
    return `email_count:${today}`;
  }

  /**
   * Check if we can send an email based on priority.
   * @param {string} type - 'bulk' or 'critical'
   * @param {number} amount - Number of emails to send
   * @returns {Promise<{canSend: boolean, count: number}>}
   */
  async checkQuota(type = "bulk", amount = 1) {
    const key = this.getTodayKey();
    let count = await redis.get(key);
    count = count ? parseInt(count) : 0;

    if (type === "critical") {
      return { canSend: (count + amount) <= this.DAILY_LIMIT, count };
    } else {
      return { canSend: (count + amount) <= this.BULK_THRESHOLD, count };
    }
  }

  /**
   * Increase the sent count for today.
   * @param {number} amount - Number of emails sent
   */
  async incrementSent(amount = 1) {
    const key = this.getTodayKey();
    await redis.incrby(key, amount);
    await redis.expire(key, 172800);
  }

  /**
   * Get the current status for debugging or admin dashboard.
   */
  async getStatus() {
    const key = this.getTodayKey();
    const count = await redis.get(key);
    return {
      count: count ? parseInt(count) : 0,
      limit: this.DAILY_LIMIT,
      bulkLimit: this.BULK_THRESHOLD,
      remaining: Math.max(0, this.DAILY_LIMIT - (count || 0))
    };
  }
}

module.exports = new EmailLimiter();
