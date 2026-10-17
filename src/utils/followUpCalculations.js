/**
 * Pure Follow-Up Calculations & Timeline Utilities
 * Handles follow-up checkmarks, streak counts, and overdue rules.
 */

/**
 * Returns follow-up map for a specific month from customer data
 * @param {Object} customer 
 * @param {string} targetMonth - 'YYYY-MM'
 * @returns {Object} Map of day number to boolean: { 1: true, 2: false, ... }
 */
export function getFollowUpMapForMonth(customer, targetMonth) {
    if (!customer) return {};
    if (customer.followUpByMonth && customer.followUpByMonth[targetMonth]) {
        return customer.followUpByMonth[targetMonth];
    }
    // Fallback to legacy flat followUp map if targetMonth matches campaignMonth
    if (customer.campaignMonth === targetMonth && customer.followUp) {
        return customer.followUp;
    }
    return {};
}

/**
 * Calculates total attended days for a customer in a given month
 * @param {Object} customer 
 * @param {string} targetMonth 
 * @returns {number}
 */
export function countAttendedDays(customer, targetMonth) {
    const fMap = getFollowUpMapForMonth(customer, targetMonth);
    return Object.values(fMap).filter(Boolean).length;
}

/**
 * Calculates follow-up completion percentage for a customer in a month
 * @param {Object} customer 
 * @param {string} targetMonth 
 * @param {number} daysInMonth 
 * @returns {number}
 */
export function calculateCustomerFollowUpRate(customer, targetMonth, daysInMonth = 30) {
    const attended = countAttendedDays(customer, targetMonth);
    if (!daysInMonth || daysInMonth <= 0) return 0;
    return Math.round((attended / daysInMonth) * 100);
}

/**
 * Checks whether customer was followed up on a specific day
 * @param {Object} customer 
 * @param {string} targetMonth 
 * @param {number} dayNumber 
 * @returns {boolean}
 */
export function isFollowedUpOnDay(customer, targetMonth, dayNumber) {
    const fMap = getFollowUpMapForMonth(customer, targetMonth);
    return Boolean(fMap[dayNumber]);
}

/**
 * Checks if a customer is overdue (registered >= 3 days ago, has not deposited, not followed up recently)
 * @param {Object} customer 
 * @param {Date} [currentDate] 
 * @returns {boolean}
 */
export function isCustomerOverdue(customer, currentDate = new Date()) {
    if (!customer) return false;
    if (customer.hasDeposited || Number(customer.totalDeposit) > 0) return false;

    const regDateStr = customer.registrationDate || customer.createdAt;
    if (!regDateStr) return false;

    const regTime = new Date(regDateStr).getTime();
    if (isNaN(regTime)) return false;

    const nowTime = currentDate.getTime();
    const diffDays = Math.floor((nowTime - regTime) / (1000 * 60 * 60 * 24));
    return diffDays >= 3;
}
