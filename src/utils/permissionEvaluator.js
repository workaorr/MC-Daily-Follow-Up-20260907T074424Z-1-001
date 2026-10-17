/**
 * Pure Staff Permission & Role Evaluation Utilities
 */

/**
 * Determines if an agent has supervisor privileges
 * @param {Object} agent 
 * @returns {boolean}
 */
export function isSupervisorAgent(agent) {
    if (!agent) return false;
    const role = String(agent.role || '').toLowerCase();
    return role.includes('supervisor') || role.includes('admin') || role.includes('หัวหน้า');
}

/**
 * Checks if an agent has permission to access a specific CRM view mode
 * @param {Object} agent 
 * @param {string} viewMode - 'supervisor', 'agent', 'upload-deposits', 'new-customer', 'audit', 'backoffice', 'audit-logs', 'recycle-bin'
 * @returns {boolean}
 */
export function canAccessViewMode(agent, viewMode) {
    if (!agent) return false;
    if (isSupervisorAgent(agent)) return true;

    const perms = agent.permissions || {};

    switch (viewMode) {
        case 'supervisor':
        case 'dashboard':
            return perms.canDashboard !== false;
        case 'agent':
        case 'follow-up':
            return perms.canFollowUp !== false;
        case 'upload-deposits':
        case 'upload':
            return true; // standard deposit upload access
        case 'new-customer':
            return perms.canNewCustomer !== false;
        case 'audit':
            return Boolean(perms.canAudit);
        case 'backoffice':
        case 'audit-logs':
        case 'recycle-bin':
            return Boolean(perms.canBackOffice);
        default:
            return true;
    }
}

/**
 * Checks if an agent can perform a specific granular action
 * @param {Object} agent 
 * @param {string} action - 'editCustomer', 'deleteCustomer', 'manageStaff', 'exportData'
 * @returns {boolean}
 */
export function canPerformAction(agent, action) {
    if (!agent) return false;
    if (isSupervisorAgent(agent)) return true;

    const perms = agent.permissions || {};

    switch (action) {
        case 'editCustomer':
            return perms.canEdit !== false;
        case 'deleteCustomer':
            return Boolean(perms.canDelete || perms.canBackOffice);
        case 'manageStaff':
            return Boolean(perms.canBackOffice);
        case 'exportData':
            return perms.canExport !== false;
        default:
            return true;
    }
}
