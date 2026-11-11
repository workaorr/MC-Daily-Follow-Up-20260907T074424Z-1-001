/**
 * Daily Performance & Trend Statistics Utilities
 * Pure aggregation helpers for daily inquiries, registrations, deposits,
 * follow-up activity, and agent actual-vs-target comparison charts.
 */

const getResolvedMonthStr = (targetMonth) => {
    if (targetMonth && /^\d{4}-\d{2}$/.test(String(targetMonth))) {
        return String(targetMonth);
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Extracts local { year, monthStr, day, dateStr } from an ISO or YYYY-MM-DD value.
 * Avoids off-by-one UTC shift for pure date strings while honoring local time for timestamps.
 */
export function extractLocalDateParts(dateVal) {
    if (!dateVal) return null;
    const raw = String(dateVal).trim();
    if (!raw) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw) || raw.endsWith('T00:00:00.000Z')) {
        const dateOnly = raw.slice(0, 10);
        const [y, m, d] = dateOnly.split('-').map(Number);
        if (!y || !m || !d) return null;
        return {
            year: y,
            month: m,
            monthStr: `${y}-${String(m).padStart(2, '0')}`,
            day: d,
            dateStr: dateOnly
        };
    }

    const parsed = new Date(raw);
    if (isNaN(parsed.getTime())) return null;
    const y = parsed.getFullYear();
    const m = parsed.getMonth() + 1;
    const d = parsed.getDate();
    return {
        year: y,
        month: m,
        monthStr: `${y}-${String(m).padStart(2, '0')}`,
        day: d,
        dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    };
}

/**
 * Resolves customer deposit amount according to metric mode ('TOTAL' | 'FIRST').
 */
export function getCustomerDepositAmount(customer, depositMetricMode = 'TOTAL') {
    if (!customer || !customer.hasDeposited) return 0;
    if (depositMetricMode === 'FIRST') {
        const ftd = parseFloat(customer.returnedDepositAmount || 0);
        if (!isNaN(ftd) && ftd > 0) return ftd;
    }
    const total = parseFloat(customer.totalDeposit || 0);
    return isNaN(total) ? 0 : total;
}

/**
 * Aggregates daily statistics (Day 1 to End of Month) for a given campaign month.
 * @param {Array} customers - Non-deleted customer records
 * @param {string} targetMonth - 'YYYY-MM' (falls back to current month if 'ALL')
 * @param {string} depositMetricMode - 'TOTAL' | 'FIRST'
 * @param {Object} options - Optional { startDateFilter, endDateFilter }
 * @returns {Object} { month, daysInMonth, days, totals, peaks }
 */
export function buildDailyTrendStats(
    customers = [],
    targetMonth = '',
    depositMetricMode = 'TOTAL',
    options = {}
) {
    const resolvedMonth = getResolvedMonthStr(targetMonth);
    const [yearNum, monthNum] = resolvedMonth.split('-').map(Number);
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    const { startDateFilter = '', endDateFilter = '' } = options || {};

    const days = Array.from({ length: daysInMonth }, (_, idx) => {
        const day = idx + 1;
        return {
            day,
            dayLabel: String(day),
            dateStr: `${resolvedMonth}-${String(day).padStart(2, '0')}`,
            inquiries: 0,
            registered: 0,
            depositors: 0,
            depositAmount: 0,
            followUps: 0,
            conversionRate: 0
        };
    });

    const list = Array.isArray(customers) ? customers : [];

    list.forEach((c) => {
        if (!c || c.deletedAt) return;

        const createdParts = extractLocalDateParts(c.createdAt);
        const custMonth = c.campaignMonth || (createdParts ? createdParts.monthStr : '');
        const belongsToMonth = targetMonth === 'ALL'
            ? (createdParts?.monthStr === resolvedMonth || custMonth === resolvedMonth)
            : (custMonth ? custMonth === resolvedMonth : createdParts?.monthStr === resolvedMonth);

        // Date range filter check (if active)
        if (startDateFilter || endDateFilter) {
            const cDateStr = createdParts ? createdParts.dateStr : '';
            if (!cDateStr) return;
            if (startDateFilter && cDateStr < startDateFilter) return;
            if (endDateFilter && cDateStr > endDateFilter) return;
        }

        if (belongsToMonth) {
            const inquiryDay = (createdParts && createdParts.monthStr === resolvedMonth && createdParts.day >= 1 && createdParts.day <= daysInMonth)
                ? createdParts.day
                : 1;
            const bucket = days[inquiryDay - 1];
            bucket.inquiries += 1;

            if (c.username && String(c.username).trim() !== '') {
                bucket.registered += 1;
            }

            if (c.hasDeposited) {
                const depParts = extractLocalDateParts(c.depositDate);
                const depDay = (depParts && depParts.monthStr === resolvedMonth && depParts.day >= 1 && depParts.day <= daysInMonth)
                    ? depParts.day
                    : inquiryDay;
                const depBucket = days[depDay - 1];
                depBucket.depositors += 1;
                depBucket.depositAmount += getCustomerDepositAmount(c, depositMetricMode);
            }
        }

        // Daily follow-up checkmarks recorded inside resolvedMonth
        const fMap = (c.followUpByMonth && c.followUpByMonth[resolvedMonth])
            || (custMonth === resolvedMonth ? c.followUp : null);
        if (fMap && typeof fMap === 'object') {
            for (let d = 1; d <= daysInMonth; d++) {
                if (fMap[String(d)] === true) {
                    days[d - 1].followUps += 1;
                }
            }
        }
    });

    let totalInquiries = 0;
    let totalRegistered = 0;
    let totalDepositors = 0;
    let totalDepositAmount = 0;
    let totalFollowUps = 0;
    let activeDays = 0;

    let maxInquiries = 0;
    let maxInquiriesDay = null;
    let maxRegistered = 0;
    let maxDepositors = 0;
    let maxDepositAmount = 0;
    let maxDepositDay = null;
    let maxFollowUps = 0;

    days.forEach((d) => {
        d.conversionRate = d.registered > 0 ? Math.round((d.depositors / d.registered) * 100) : 0;

        totalInquiries += d.inquiries;
        totalRegistered += d.registered;
        totalDepositors += d.depositors;
        totalDepositAmount += d.depositAmount;
        totalFollowUps += d.followUps;

        if (d.inquiries > 0 || d.depositAmount > 0 || d.followUps > 0) {
            activeDays += 1;
        }
        if (d.inquiries > maxInquiries) {
            maxInquiries = d.inquiries;
            maxInquiriesDay = d.day;
        }
        if (d.registered > maxRegistered) {
            maxRegistered = d.registered;
        }
        if (d.depositors > maxDepositors) {
            maxDepositors = d.depositors;
        }
        if (d.depositAmount > maxDepositAmount) {
            maxDepositAmount = d.depositAmount;
            maxDepositDay = d.day;
        }
        if (d.followUps > maxFollowUps) {
            maxFollowUps = d.followUps;
        }
    });

    return {
        month: resolvedMonth,
        daysInMonth,
        days,
        totals: {
            inquiries: totalInquiries,
            registered: totalRegistered,
            depositors: totalDepositors,
            depositAmount: totalDepositAmount,
            followUps: totalFollowUps,
            avgDailyDeposit: activeDays > 0 ? Math.round(totalDepositAmount / activeDays) : 0,
            activeDays
        },
        peaks: {
            maxInquiries,
            maxInquiriesDay,
            maxRegistered,
            maxDepositors,
            maxDepositAmount,
            maxDepositDay,
            maxFollowUps
        }
    };
}

/**
 * Formats per-agent statistics into sorted data for Actual vs Target bar charts.
 */
export function buildAgentTargetComparisonData(agentStats = [], depositMetricMode = 'TOTAL') {
    const list = Array.isArray(agentStats) ? agentStats : [];
    return list
        .map((ag) => {
            const actualDeposit = depositMetricMode === 'FIRST'
                ? (Number(ag.firstDeposit) || 0)
                : (Number(ag.totalDeposit) || 0);
            const targetAmount = Number(ag.monthlyTarget) || 0;
            const pct = targetAmount > 0 ? Math.round((actualDeposit / targetAmount) * 100) : 0;
            return {
                name: ag.name,
                role: ag.role || 'AGENT',
                actualDeposit,
                targetAmount,
                pct,
                remaining: Math.max(0, targetAmount - actualDeposit),
                isExceeded: targetAmount > 0 && actualDeposit >= targetAmount,
                inquiriesCount: Number(ag.totalContacted) || 0,
                depositorsCount: Number(ag.registeredAndDeposited) || 0
            };
        })
        .sort((a, b) => b.actualDeposit - a.actualDeposit || b.targetAmount - a.targetAmount);
}
