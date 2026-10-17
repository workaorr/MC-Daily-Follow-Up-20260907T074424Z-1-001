/**
 * Pure Retention & Recycle Bin Calculation Utilities
 * Calculates 30-day countdowns and expired purge statuses.
 */

const RETENTION_DAYS_DEFAULT = 30;

/**
 * Calculates remaining days in recycle bin
 * @param {string|Date} deletedAt 
 * @param {number} [retentionDays=30] 
 * @param {Date} [currentDate=new Date()] 
 * @returns {number} Days remaining (0 if expired)
 */
export function calculateRetentionDaysRemaining(deletedAt, retentionDays = RETENTION_DAYS_DEFAULT, currentDate = new Date()) {
    if (!deletedAt) return retentionDays;
    const deletedTime = new Date(deletedAt).getTime();
    if (isNaN(deletedTime)) return retentionDays;

    const msPerDay = 1000 * 60 * 60 * 24;
    const elapsedDays = Math.floor((currentDate.getTime() - deletedTime) / msPerDay);
    const remaining = retentionDays - elapsedDays;
    return Math.max(0, remaining);
}

/**
 * Checks whether an archived or soft-deleted item has exceeded the retention window
 * @param {string|Date} deletedAt 
 * @param {number} [retentionDays=30] 
 * @param {Date} [currentDate=new Date()] 
 * @returns {boolean}
 */
export function isRetentionExpired(deletedAt, retentionDays = RETENTION_DAYS_DEFAULT, currentDate = new Date()) {
    return calculateRetentionDaysRemaining(deletedAt, retentionDays, currentDate) <= 0;
}

/**
 * Calculates the exact expiry timestamp when an item will be permanently purged
 * @param {string|Date} deletedAt 
 * @param {number} [retentionDays=30] 
 * @returns {Date|null}
 */
export function calculatePurgeDeadline(deletedAt, retentionDays = RETENTION_DAYS_DEFAULT) {
    if (!deletedAt) return null;
    const date = new Date(deletedAt);
    if (isNaN(date.getTime())) return null;
    date.setDate(date.getDate() + retentionDays);
    return date;
}
