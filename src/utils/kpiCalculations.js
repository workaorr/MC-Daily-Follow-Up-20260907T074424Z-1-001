/**
 * Pure KPI Calculation Utilities
 * Independent of React and DOM. Takes raw data and returns computed metrics.
 */

/**
 * Calculates executive KPI summaries for the dashboard
 * @param {Array} customers - List of customer objects
 * @param {string} selectedMonth - Format 'YYYY-MM' or 'ALL'
 * @returns {Object} Computed KPI metrics
 */
export function calculateExecutiveKpis(customers = [], selectedMonth = 'ALL') {
    const list = Array.isArray(customers) ? customers : [];

    // Filter by campaign month if specified
    const filtered = (selectedMonth && selectedMonth !== 'ALL')
        ? list.filter(c => c.campaignMonth === selectedMonth || !c.campaignMonth)
        : list;

    const totalLeads = filtered.length;
    const depositedCusts = filtered.filter(c => Boolean(c.hasDeposited) || Number(c.totalDeposit) > 0);
    const depositedCount = depositedCusts.length;
    const pendingDepositCount = totalLeads - depositedCount;

    const totalDepositRevenue = depositedCusts.reduce((sum, c) => sum + (Number(c.totalDeposit) || 0), 0);
    const avgDepositPerLead = depositedCount > 0 ? (totalDepositRevenue / depositedCount) : 0;
    const conversionRate = totalLeads > 0 ? ((depositedCount / totalLeads) * 100) : 0;

    return {
        totalLeads,
        depositedCount,
        pendingDepositCount,
        totalDepositRevenue,
        avgDepositPerLead,
        conversionRate: Math.round(conversionRate * 10) / 10
    };
}

/**
 * Calculates top agent performance rankings
 * @param {Array} customers - List of customer objects
 * @param {Array} agents - List of staff agent objects
 * @param {string} selectedMonth - Format 'YYYY-MM' or 'ALL'
 * @returns {Array} Sorted list of agents with performance metrics
 */
export function calculateAgentRankings(customers = [], agents = [], selectedMonth = 'ALL') {
    const list = Array.isArray(customers) ? customers : [];
    const agentList = Array.isArray(agents) ? agents.filter(a => !a.isArchived) : [];

    const filtered = (selectedMonth && selectedMonth !== 'ALL')
        ? list.filter(c => c.campaignMonth === selectedMonth || !c.campaignMonth)
        : list;

    // Group metrics by agent name
    const metricsMap = {};
    agentList.forEach(a => {
        metricsMap[a.name] = {
            agent: a,
            name: a.name,
            totalLeads: 0,
            depositedCount: 0,
            totalDeposit: 0,
            conversionRate: 0
        };
    });

    filtered.forEach(c => {
        const owner = c.createdBy || 'Unknown';
        if (!metricsMap[owner]) {
            metricsMap[owner] = {
                agent: { name: owner, role: 'MC Agent' },
                name: owner,
                totalLeads: 0,
                depositedCount: 0,
                totalDeposit: 0,
                conversionRate: 0
            };
        }
        metricsMap[owner].totalLeads += 1;
        if (Boolean(c.hasDeposited) || Number(c.totalDeposit) > 0) {
            metricsMap[owner].depositedCount += 1;
            metricsMap[owner].totalDeposit += (Number(c.totalDeposit) || 0);
        }
    });

    // Compute conversion rates and sort by revenue descending
    return Object.values(metricsMap)
        .map(item => ({
            ...item,
            conversionRate: item.totalLeads > 0 
                ? Math.round((item.depositedCount / item.totalLeads) * 1000) / 10 
                : 0
        }))
        .sort((a, b) => b.totalDeposit - a.totalDeposit || b.depositedCount - a.depositedCount);
}

/**
 * Calculates marketing acquisition channel breakdown
 * @param {Array} customers - List of customer objects
 * @param {string} selectedMonth - Format 'YYYY-MM' or 'ALL'
 * @returns {Array} Breakdown of channels with lead counts and deposit volumes
 */
export function calculateChannelBreakdown(customers = [], selectedMonth = 'ALL') {
    const list = Array.isArray(customers) ? customers : [];
    const filtered = (selectedMonth && selectedMonth !== 'ALL')
        ? list.filter(c => c.campaignMonth === selectedMonth || !c.campaignMonth)
        : list;

    const channelMap = {};
    filtered.forEach(c => {
        const ch = c.sourceChannel || 'Unknown';
        if (!channelMap[ch]) {
            channelMap[ch] = {
                channel: ch,
                totalLeads: 0,
                depositedCount: 0,
                totalDeposit: 0,
                conversionRate: 0
            };
        }
        channelMap[ch].totalLeads += 1;
        if (Boolean(c.hasDeposited) || Number(c.totalDeposit) > 0) {
            channelMap[ch].depositedCount += 1;
            channelMap[ch].totalDeposit += (Number(c.totalDeposit) || 0);
        }
    });

    return Object.values(channelMap)
        .map(ch => ({
            ...ch,
            conversionRate: ch.totalLeads > 0 
                ? Math.round((ch.depositedCount / ch.totalLeads) * 1000) / 10 
                : 0
        }))
        .sort((a, b) => b.totalLeads - a.totalLeads);
}
