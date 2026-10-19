// Default MC Staff and normalization helper

export const DEFAULT_AGENTS = [
    { id: 1, name: 'คุณศรัณยา (Sarah)', role: 'AGENT', loginUsername: 'sarah_mc', passcode: '1234', permissions: { canDashboard: true, canFollowUp: true, canNewCustomer: true, canAudit: false, canBackOffice: false }, isActive: true },
    { id: 2, name: 'คุณเอมิกา (Emma)', role: 'AGENT', loginUsername: 'emma_mc', passcode: '1234', permissions: { canDashboard: true, canFollowUp: true, canNewCustomer: true, canAudit: false, canBackOffice: false }, isActive: true },
    { id: 3, name: 'คุณเดชา (David)', role: 'AGENT', loginUsername: 'david_mc', passcode: '1234', permissions: { canDashboard: true, canFollowUp: true, canNewCustomer: true, canAudit: false, canBackOffice: false }, isActive: true },
    { id: 4, name: 'คุณมนัสพงษ์ (Michael)', role: 'AGENT', loginUsername: 'michael_mc', passcode: '1234', permissions: { canDashboard: true, canFollowUp: true, canNewCustomer: true, canAudit: false, canBackOffice: false }, isActive: true },
    { id: 5, name: 'คุณอ้อที่สวยสวย', role: 'SUPERVISOR', loginUsername: 'aor_supervisor', passcode: '1234', permissions: { canDashboard: true, canFollowUp: true, canNewCustomer: true, canAudit: true, canBackOffice: true }, isActive: true }
];

export const normalizeAgent = (a, idx = 0) => {
    const name = typeof a === 'string' ? a : (a.name || 'พนักงาน');
    const role = a.role || 'AGENT';
    const isSuper = role === 'SUPERVISOR';
    const defaultPerms = isSuper ? {
        canDashboard: true, canFollowUp: true, canNewCustomer: true, canAudit: true, canBackOffice: true
    } : {
        canDashboard: true, canFollowUp: true, canNewCustomer: true, canAudit: false, canBackOffice: false
    };
    let parsedPerms = a.permissions;
    if (typeof parsedPerms === 'string') {
        try { parsedPerms = JSON.parse(parsedPerms); } catch (e) { parsedPerms = null; }
    }
    const isActive = a.is_active !== undefined ? Boolean(a.is_active) : (a.isActive !== undefined ? Boolean(a.isActive) : true);
    const lastLoginAt = a.last_login_at || a.lastLoginAt || null;
    const isArchived = Boolean(a.isArchived || (parsedPerms && parsedPerms.isArchived));
    const archivedAt = a.archivedAt || (parsedPerms && parsedPerms.archivedAt) || null;
    const isLocked = Boolean(a.isLocked || a.is_locked || (parsedPerms && parsedPerms.isLocked));
    const lockedReason = a.lockedReason || a.locked_reason || (parsedPerms && parsedPerms.lockedReason) || null;
    const lockedAt = a.lockedAt || a.locked_at || (parsedPerms && parsedPerms.lockedAt) || null;
    return {
        id: a.id || (Date.now() + idx),
        name: name,
        role: role,
        loginUsername: a.loginUsername || a.login_username || '',
        passcode: a.passcode || '1234',
        permissions: (parsedPerms && typeof parsedPerms === 'object') ? { ...defaultPerms, ...parsedPerms } : defaultPerms,
        isActive: isActive,
        isLocked: isLocked,
        lockedReason: lockedReason,
        lockedAt: lockedAt,
        lastLoginAt: lastLoginAt,
        isArchived: isArchived,
        archivedAt: archivedAt,
        archivedBy: archivedBy
    };
};
