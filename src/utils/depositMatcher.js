/**
 * Pure Deposit Matching Logic & Parsing Utilities
 * Compares transaction records with customer database without DOM/React side-effects.
 */

/**
 * Normalizes string for fuzzy comparison (lowercase, trimmed, space collapsed)
 * @param {string} val 
 * @returns {string}
 */
export function normalizeKey(val) {
    if (!val) return '';
    return String(val).trim().toLowerCase().replace(/\s+/g, '');
}

/**
 * Extracts digits only from telephone string
 * @param {string} phone 
 * @returns {string}
 */
export function sanitizePhone(phone) {
    if (!phone) return '';
    return String(phone).replace(/\D/g, '');
}

/**
 * Matches an array of raw deposit transactions against the customer database
 * @param {Array} rawTransactions - Extracted transactions from CSV/Excel
 * @param {Array} customers - Current customer database list
 * @returns {Object} { matchedTransactions, unmatchedTransactions, stats }
 */
export function matchDepositsWithCustomers(rawTransactions = [], customers = []) {
    const custList = Array.isArray(customers) ? customers : [];
    const txList = Array.isArray(rawTransactions) ? rawTransactions : [];

    // Pre-index customers by username and phone for O(1) matching
    const byUsername = new Map();
    const byPhone = new Map();
    const byFullName = new Map();

    custList.forEach(c => {
        if (c.username) byUsername.set(normalizeKey(c.username), c);
        const cleanP = sanitizePhone(c.phone);
        if (cleanP && cleanP.length >= 8) byPhone.set(cleanP, c);
        if (c.fullName) byFullName.set(normalizeKey(c.fullName), c);
    });

    const matched = [];
    const unmatched = [];

    txList.forEach((tx, idx) => {
        const txUsernameKey = normalizeKey(tx.username);
        const txPhoneKey = sanitizePhone(tx.phone);
        const txNameKey = normalizeKey(tx.fullName || tx.name);

        let matchedCustomer = null;
        let matchField = null;

        if (txUsernameKey && byUsername.has(txUsernameKey)) {
            matchedCustomer = byUsername.get(txUsernameKey);
            matchField = 'username';
        } else if (txPhoneKey && byPhone.has(txPhoneKey)) {
            matchedCustomer = byPhone.get(txPhoneKey);
            matchField = 'phone';
        } else if (txNameKey && byFullName.has(txNameKey)) {
            matchedCustomer = byFullName.get(txNameKey);
            matchField = 'fullName';
        }

        const depositAmount = parseFloat(tx.amount || tx.deposit || 0);

        if (matchedCustomer) {
            const isFirstTime = !matchedCustomer.hasDeposited && (Number(matchedCustomer.totalDeposit) <= 0);
            matched.push({
                ...tx,
                id: tx.id || `tx-${Date.now()}-${idx}`,
                matchedCustomerId: matchedCustomer.id,
                matchedCustomer,
                matchField,
                amount: depositAmount,
                matchType: isFirstTime ? 'NEW_DEPOSIT' : 'REPEAT_DEPOSIT'
            });
        } else {
            unmatched.push({
                ...tx,
                id: tx.id || `unmatched-${Date.now()}-${idx}`,
                amount: depositAmount,
                matchType: 'UNMATCHED'
            });
        }
    });

    const totalMatchedAmount = matched.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalUnmatchedAmount = unmatched.reduce((sum, item) => sum + (item.amount || 0), 0);

    return {
        matched,
        unmatched,
        stats: {
            totalCount: txList.length,
            matchedCount: matched.length,
            unmatchedCount: unmatched.length,
            newDepositorsCount: matched.filter(m => m.matchType === 'NEW_DEPOSIT').length,
            repeatDepositorsCount: matched.filter(m => m.matchType === 'REPEAT_DEPOSIT').length,
            totalMatchedAmount,
            totalUnmatchedAmount
        }
    };
}
