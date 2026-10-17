/**
 * Pure Duplicate Detection & Validation Utilities
 */

import { sanitizePhone, normalizeKey } from './depositMatcher';

/**
 * Checks if a username already exists in customer list (excluding a specific customer ID if editing)
 * @param {string} username 
 * @param {Array} customers 
 * @param {string|number|null} excludeId 
 * @returns {Object|null} The matched customer if duplicate, otherwise null
 */
export function checkDuplicateUsername(username, customers = [], excludeId = null) {
    const cleanUser = normalizeKey(username);
    if (!cleanUser) return null;

    const list = Array.isArray(customers) ? customers : [];
    return list.find(c => c.id !== excludeId && normalizeKey(c.username) === cleanUser) || null;
}

/**
 * Checks if a phone number already exists in customer list
 * @param {string} phone 
 * @param {Array} customers 
 * @param {string|number|null} excludeId 
 * @returns {Object|null} The matched customer if duplicate, otherwise null
 */
export function checkDuplicatePhone(phone, customers = [], excludeId = null) {
    const cleanPhone = sanitizePhone(phone);
    if (!cleanPhone || cleanPhone.length < 8) return null;

    const list = Array.isArray(customers) ? customers : [];
    return list.find(c => c.id !== excludeId && sanitizePhone(c.phone) === cleanPhone) || null;
}

/**
 * Checks if LINE OA already exists in customer list
 * @param {string} lineOA 
 * @param {Array} customers 
 * @param {string|number|null} excludeId 
 * @returns {Object|null} The matched customer if duplicate, otherwise null
 */
export function checkDuplicateLineOA(lineOA, customers = [], excludeId = null) {
    const cleanLine = normalizeKey(lineOA);
    if (!cleanLine) return null;

    const list = Array.isArray(customers) ? customers : [];
    return list.find(c => c.id !== excludeId && normalizeKey(c.lineOA) === cleanLine) || null;
}

/**
 * Runs comprehensive duplicate check across username, phone, and lineOA
 * @param {Object} input - { username, phone, lineOA }
 * @param {Array} customers 
 * @param {string|number|null} excludeId 
 * @returns {Object} { isDuplicate: boolean, duplicates: { username, phone, lineOA } }
 */
export function validateCustomerDuplicates(input = {}, customers = [], excludeId = null) {
    const dupUser = checkDuplicateUsername(input.username, customers, excludeId);
    const dupPhone = checkDuplicatePhone(input.phone, customers, excludeId);
    const dupLine = checkDuplicateLineOA(input.lineOA, customers, excludeId);

    const isDuplicate = Boolean(dupUser || dupPhone || dupLine);

    return {
        isDuplicate,
        duplicates: {
            username: dupUser,
            phone: dupPhone,
            lineOA: dupLine
        }
    };
}
