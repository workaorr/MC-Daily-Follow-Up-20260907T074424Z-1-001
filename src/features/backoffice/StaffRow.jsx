import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { formatLastLogin } from '../../utils/dateFormatters';
import { 
    Clock, 
    Edit3, 
    Trash2, 
    PlayCircle, 
    PauseCircle, 
    ShieldCheck, 
    Eye, 
    EyeOff, 
    Check, 
    X,
    Lock,
    Unlock
} from 'lucide-react';

export const StaffRow = ({ 
    agent, 
    isEditing, 
    onStartEdit, 
    onCancelEdit, 
    onSaveEdit, 
    onToggleActive, 
    onDelete,
    onUnlock
}) => {
    const { activeAgentName, agents, lang, theme } = useApp();
    const isSuper = agent.role === 'SUPERVISOR';
    const perms = agent.permissions || {};

    // Editing local state
    const [name, setName] = useState(agent.name || '');
    const [loginUsername, setLoginUsername] = useState(agent.loginUsername || '');
    const [passcode, setPasscode] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [role, setRole] = useState(agent.role || 'AGENT');
    const [isActive, setIsActive] = useState(agent.isActive !== false);
    const [isLockedState, setIsLockedState] = useState(Boolean(agent.isLocked));

    // Granular permissions
    const [permDashboard, setPermDashboard] = useState(perms.canDashboard !== false);
    const [permFollowUp, setPermFollowUp] = useState(perms.canFollowUp !== false);
    const [permNewCustomer, setPermNewCustomer] = useState(perms.canNewCustomer !== false);
    const [permAudit, setPermAudit] = useState(Boolean(perms.canAudit));
    const [permBackOffice, setPermBackOffice] = useState(Boolean(perms.canBackOffice));

    useEffect(() => {
        if (isEditing) {
            setName(agent.name || '');
            setLoginUsername(agent.loginUsername || '');
            setPasscode('');
            setShowPassword(false);
            setRole(agent.role || 'AGENT');
            setIsActive(agent.isActive !== false);
            setIsLockedState(Boolean(agent.isLocked));
            setPermDashboard(perms.canDashboard !== false);
            setPermFollowUp(perms.canFollowUp !== false);
            setPermNewCustomer(perms.canNewCustomer !== false);
            setPermAudit(Boolean(perms.canAudit));
            setPermBackOffice(Boolean(perms.canBackOffice));
        }
    }, [isEditing, agent]);

    const handleRoleChange = (newRole) => {
        setRole(newRole);
        if (newRole === 'SUPERVISOR') {
            setPermDashboard(true);
            setPermFollowUp(true);
            setPermNewCustomer(true);
            setPermAudit(true);
            setPermBackOffice(true);
        } else {
            setPermAudit(false);
            setPermBackOffice(false);
        }
    };

    const handleSave = () => {
        onSaveEdit({
            id: agent.id,
            name: name.trim(),
            loginUsername: loginUsername.trim().toLowerCase(),
            passcode: passcode.trim(),
            role,
            isActive,
            isLocked: isLockedState,
            lockedReason: isLockedState ? agent.lockedReason : null,
            lockedAt: isLockedState ? agent.lockedAt : null,
            permissions: {
                canDashboard: permDashboard,
                canFollowUp: permFollowUp,
                canNewCustomer: permNewCustomer,
                canAudit: permAudit,
                canBackOffice: permBackOffice
            }
        });
    };

    const isSelfOrLastSupervisor = (agent.name === activeAgentName) || 
        (isSuper && agents.filter(x => x.role === 'SUPERVISOR' && x.isActive !== false).length <= 1);

    return (
        <div 
            className={`staff-item-row ${isEditing ? 'is-editing' : ''}`} 
            style={{ 
                background: isEditing ? 'rgba(30, 41, 59, 0.9)' : (agent.isActive === false ? 'rgba(30, 27, 40, 0.6)' : 'rgba(15, 23, 42, 0.7)'), 
                border: isEditing ? '1px solid #a855f7' : (agent.isActive === false ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(255,255,255,0.06)'), 
                borderRadius: '10px', 
                padding: '10px 14px', 
                transition: 'all 0.2s', 
                opacity: agent.isActive === false && !isEditing ? 0.75 : 1 
            }}
        >
            {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                        <input 
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={lang === 'TH' ? "ชื่อพนักงาน..." : "Staff name..."}
                            className="select-input"
                            style={{ flex: '1 1 140px', padding: '6px 10px', fontSize: '12px' }}
                            autoFocus
                        />
                        <input 
                            type="text"
                            value={loginUsername}
                            onChange={(e) => setLoginUsername(e.target.value)}
                            placeholder={lang === 'TH' ? "ยูสเซอร์เนม..." : "Username..."}
                            className="select-input"
                            style={{ width: '120px', padding: '6px 10px', fontSize: '12px', fontFamily: 'monospace', color: '#c084fc' }}
                        />
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                            <input 
                                type={showPassword ? 'text' : 'password'}
                                value={passcode}
                                onChange={(e) => setPasscode(e.target.value)}
                                placeholder={lang === 'TH' ? "รหัสใหม่ (เว้นว่าง=คงเดิม)..." : "New passcode (blank=keep)..."}
                                className="select-input"
                                style={{ width: '165px', padding: '6px 28px 6px 10px', fontSize: '12px', fontFamily: 'monospace' }}
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                            >
                                {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                        </div>
                        <select 
                            value={role}
                            onChange={(e) => handleRoleChange(e.target.value)}
                            className="select-input"
                            style={{ padding: '6px 10px', fontSize: '12px', fontWeight: 700, color: role === 'SUPERVISOR' ? '#fbbf24' : '#34d399' }}
                        >
                            <option value="AGENT">{lang === 'TH' ? '👤 พนักงาน (MC Agent)' : '👤 Agent (MC Agent)'}</option>
                            <option value="SUPERVISOR">{lang === 'TH' ? '👑 หัวหน้า (Supervisor)' : '👑 Supervisor'}</option>
                        </select>
                        <select 
                            value={isActive ? 'ACTIVE' : 'SUSPENDED'}
                            onChange={(e) => setIsActive(e.target.value === 'ACTIVE')}
                            className="select-input"
                            style={{ padding: '6px 10px', fontSize: '12px', fontWeight: 700, color: isActive ? '#34d399' : '#f87171' }}
                        >
                            <option value="ACTIVE">{lang === 'TH' ? '🟢 ใช้งานอยู่ (Active)' : '🟢 Active'}</option>
                            <option value="SUSPENDED">{lang === 'TH' ? '⏸️ พักงาน (Suspended)' : '⏸️ Suspended'}</option>
                        </select>
                        <button 
                            type="button"
                            className="btn btn-primary"
                            style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={handleSave}
                        >
                            <Check size={13} />
                            <span>{lang === 'TH' ? 'บันทึกสิทธิ์' : 'Save Permissions'}</span>
                        </button>
                        <button 
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                            onClick={onCancelEdit}
                        >
                            <X size={13} />
                        </button>
                    </div>

                    {/* Granular Permission Checklist */}
                    <div style={{ paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#c084fc', marginBottom: '6px' }}>
                            {lang === 'TH' ? '⚙️ แก้ไขสิทธิ์เข้าถึงฟังก์ชันรายพนักงาน (Permission Checklist):' : '⚙️ Edit Staff Permissions (Permission Checklist):'}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px', background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                <input 
                                    type="checkbox" 
                                    checked={permDashboard} 
                                    onChange={(e) => setPermDashboard(e.target.checked)} 
                                />
                                <span>{lang === 'TH' ? '📊 แดชบอร์ด' : '📊 Dashboard'}</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                <input 
                                    type="checkbox" 
                                    checked={permFollowUp} 
                                    onChange={(e) => setPermFollowUp(e.target.checked)} 
                                />
                                <span>{lang === 'TH' ? '👥 โต๊ะติดตามลูกค้า' : '👥 Follow-Up Table'}</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                <input 
                                    type="checkbox" 
                                    checked={permNewCustomer} 
                                    onChange={(e) => setPermNewCustomer(e.target.checked)} 
                                />
                                <span>{lang === 'TH' ? '➕ เพิ่มลูกค้าใหม่' : '➕ Add Customer'}</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                <input 
                                    type="checkbox" 
                                    checked={permAudit} 
                                    onChange={(e) => setPermAudit(e.target.checked)} 
                                />
                                <span>{lang === 'TH' ? '🛡️ ตรวจสอบงาน (Audit)' : '🛡️ Daily Audit'}</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                <input 
                                    type="checkbox" 
                                    checked={permBackOffice} 
                                    onChange={(e) => setPermBackOffice(e.target.checked)} 
                                />
                                <span>{lang === 'TH' ? '⚙️ จัดการหลังบ้าน & Audit Logs' : '⚙️ Back Office & Audit Logs'}</span>
                            </label>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: theme === 'light' ? '#0f172a' : '#fff' }}>{agent.name}</span>
                        <span className={`role-badge ${isSuper ? 'role-badge-supervisor' : 'role-badge-agent'}`}>
                            {isSuper ? (lang === 'TH' ? '👑 หัวหน้า' : '👑 Supervisor') : (lang === 'TH' ? '👤 พนักงาน' : '👤 Agent')}
                        </span>
                        {agent.isLocked ? (
                            <span className="role-badge" style={{
                                background: 'rgba(239, 68, 68, 0.2)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                🔒 {lang === 'TH' ? 'ถูกล็อก (รหัสผิด 3 ครั้ง)' : 'Locked (3 failed attempts)'}
                            </span>
                        ) : agent.isActive === false ? (
                            <span className="role-badge staff-status-suspended">
                                {lang === 'TH' ? '⏸️ พักงาน' : '⏸️ Suspended'}
                            </span>
                        ) : (
                            <span className="role-badge staff-status-active">
                                {lang === 'TH' ? '🟢 ใช้งานอยู่' : '🟢 Active'}
                            </span>
                        )}
                        {agent.loginUsername && (
                            <span className="staff-user-pill">
                                {lang === 'TH' ? '🔑 ยูส: ' : '🔑 User: '}{agent.loginUsername}
                            </span>
                        )}
                        <span className="staff-login-time" title={agent.lastLoginAt ? (lang === 'TH' ? `เข้าสู่ระบบล่าสุดเมื่อ: ${agent.lastLoginAt}` : `Last login at: ${agent.lastLoginAt}`) : (lang === 'TH' ? 'ยังไม่มีประวัติเข้าสู่ระบบ' : 'No login history yet')}>
                            <Clock size={11} />
                            <span>
                                {agent.lastLoginAt 
                                    ? `${lang === 'TH' ? 'ล็อกอินล่าสุด:' : 'Last:'} ${formatLastLogin(agent.lastLoginAt, lang)}` 
                                    : (lang === 'TH' ? 'ยังไม่เคยเข้าสู่ระบบ' : 'Never logged in')}
                            </span>
                        </span>
                        {perms.canBackOffice ? (
                            <span className="staff-bo-perm-open">{lang === 'TH' ? '[⚙️ เปิดสิทธิ์หลังบ้าน]' : '[⚙️ Back Office Enabled]'}</span>
                        ) : (
                            <span className="staff-bo-perm-locked">{lang === 'TH' ? '[🔒 ล็อกหลังบ้าน]' : '[🔒 Back Office Locked]'}</span>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {agent.isLocked && onUnlock && (
                            <button 
                                type="button" 
                                style={{ 
                                    border: 'none', 
                                    padding: '5px 12px', 
                                    borderRadius: '6px', 
                                    cursor: 'pointer', 
                                    fontSize: '11px', 
                                    fontWeight: 700, 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    gap: '5px',
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: '#ffffff',
                                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)'
                                }} 
                                onClick={() => onUnlock(agent)} 
                                title={lang === 'TH' ? "ปลดล็อกและกำหนดรหัสผ่านใหม่ให้พนักงาน" : "Unlock and set new passcode for staff"}
                            >
                                <Unlock size={12} />
                                <span>{lang === 'TH' ? '🔓 ปลดล็อกและตั้งรหัสใหม่' : '🔓 Unlock & Reset'}</span>
                            </button>
                        )}
                        {agent.isActive === false ? (
                            <button 
                                type="button" 
                                className="staff-btn-toggle btn-reactivate" 
                                style={{ border: 'none', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }} 
                                onClick={() => onToggleActive(agent.id, agent.name)} 
                                title={lang === 'TH' ? "เปิดใช้งานบัญชีพนักงานอีกครั้ง" : "Reactivate staff"}
                            >
                                <PlayCircle size={13} />
                                <span>{lang === 'TH' ? 'เปิดใช้งาน' : 'Activate'}</span>
                            </button>
                        ) : isSelfOrLastSupervisor ? (
                            <button 
                                type="button" 
                                className="staff-btn-toggle btn-active-admin" 
                                style={{ border: 'none', padding: '5px 10px', borderRadius: '6px', cursor: 'not-allowed', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }} 
                                disabled 
                                title={lang === 'TH' ? "ไม่สามารถพักงานบัญชีหัวหน้าหลักที่กำลังใช้งานอยู่ได้ เพื่อป้องกันไม่ให้ระบบล็อกตัวเอง" : "Cannot suspend the active supervisor account"}
                            >
                                <ShieldCheck size={13} />
                                <span>{lang === 'TH' ? 'บัญชีหลัก' : 'Active Admin'}</span>
                            </button>
                        ) : (
                            <button 
                                type="button" 
                                className="staff-btn-toggle btn-suspend" 
                                style={{ border: 'none', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }} 
                                onClick={() => onToggleActive(agent.id, agent.name)} 
                                title={lang === 'TH' ? "พักงาน / ระงับการใช้งานบัญชีชั่วคราว (เข้าสู่ระบบไม่ได้ แต่ข้อมูลและประวัติยังคงอยู่ 100%)" : "Suspend / Deactivate"}
                            >
                                <PauseCircle size={13} />
                                <span>{lang === 'TH' ? 'พักงาน' : 'Suspend'}</span>
                            </button>
                        )}
                        <button 
                            className="staff-btn-edit" 
                            style={{ border: 'none', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer' }} 
                            onClick={() => onStartEdit(agent)} 
                            title={lang === 'TH' ? "แก้ไขชื่อ/สิทธิ์พนักงาน" : "Edit staff/permissions"}
                        >
                            <Edit3 size={13} />
                        </button>
                        <button 
                            className="staff-btn-del" 
                            style={{ border: 'none', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer' }} 
                            onClick={() => onDelete(agent.id, agent.name)} 
                            title={lang === 'TH' ? "ลบรายชื่อพนักงาน" : "Delete staff"}
                        >
                            <Trash2 size={13} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
