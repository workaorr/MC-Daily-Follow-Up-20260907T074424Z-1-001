// Left Sidebar Navigation
import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
    PieChart, 
    Users, 
    UploadCloud, 
    UserPlus, 
    ShieldCheck, 
    Shield, 
    History, 
    Trash2, 
    HelpCircle 
} from 'lucide-react';

export const Sidebar = ({ onStartTour }) => {
    const { 
        viewMode, 
        setViewMode, 
        lang, 
        theme, 
        agents, 
        deletedCustomers, 
        activeAgent, 
        isSupervisor 
    } = useApp();

    const perms = activeAgent?.permissions || {};
    const canDashboard = isSupervisor || perms.canDashboard !== false;
    const canFollowUp = isSupervisor || perms.canFollowUp !== false;
    const canNewCustomer = isSupervisor || perms.canNewCustomer !== false;
    const canAudit = isSupervisor || Boolean(perms.canAudit);
    const canBackOffice = isSupervisor || Boolean(perms.canBackOffice);

    const archivedStaffCount = (agents || []).filter(a => a.isArchived).length;
    const totalRecycleCount = archivedStaffCount + (deletedCustomers || []).length;

    return (
        <aside id="tour-sidebar" className="app-sidebar">
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '4px 12px 6px 12px' }}>
                {lang === 'TH' ? 'เมนูการทำงาน' : 'Navigation Menu'}
            </div>

            <div className="sidebar-menu">
                {canDashboard && (
                    <button 
                        className={`sidebar-btn ${viewMode === 'supervisor' ? 'active' : ''}`}
                        onClick={() => setViewMode('supervisor')}
                    >
                        <PieChart size={17} />
                        <span>{lang === 'TH' ? 'แดชบอร์ดสรุป (Supervisor)' : 'Supervisor Dashboard'}</span>
                    </button>
                )}

                {canFollowUp && (
                    <button 
                        className={`sidebar-btn ${viewMode === 'agent' ? 'active' : ''}`}
                        onClick={() => setViewMode('agent')}
                    >
                        <Users size={17} />
                        <span>{lang === 'TH' ? 'การติดตามลูกค้า (MC Agent)' : 'Customer Follow-Up (MC Agent)'}</span>
                    </button>
                )}

                <button 
                    className={`sidebar-btn ${viewMode === 'upload-deposits' ? 'active' : ''}`}
                    onClick={() => setViewMode('upload-deposits')}
                >
                    <UploadCloud size={17} />
                    <span>{lang === 'TH' ? 'อัปโหลดธุรกรรมรายวัน' : 'Upload Daily Deposits'}</span>
                </button>

                {canNewCustomer && (
                    <button 
                        className={`sidebar-btn ${viewMode === 'new-customer' ? 'active' : ''}`}
                        onClick={() => setViewMode('new-customer')}
                    >
                        <UserPlus size={17} />
                        <span>{lang === 'TH' ? 'เพิ่มลูกค้าใหม่รายคน' : 'Add New Customer'}</span>
                    </button>
                )}

                {canAudit && (
                    <button 
                        className={`sidebar-btn ${viewMode === 'audit' ? 'active' : ''}`}
                        onClick={() => setViewMode('audit')}
                    >
                        <ShieldCheck size={17} />
                        <span>{lang === 'TH' ? 'ตรวจสอบงานรายวัน (Supervisor Audit)' : 'Daily Audit (Supervisor Audit)'}</span>
                    </button>
                )}

                {canBackOffice && (
                    <button 
                        className={`sidebar-btn ${viewMode === 'backoffice' ? 'active' : ''}`}
                        onClick={() => setViewMode('backoffice')}
                    >
                        <Shield size={17} />
                        <span>{lang === 'TH' ? 'จัดการหลังบ้าน (Back Office)' : 'Back Office Admin'}</span>
                    </button>
                )}

                {canBackOffice && (
                    <button 
                        className={`sidebar-btn ${viewMode === 'audit-logs' ? 'active' : ''}`}
                        onClick={() => setViewMode('audit-logs')}
                    >
                        <History size={17} />
                        <span>{lang === 'TH' ? 'ประวัติการแก้ไข (Audit Logs)' : 'Audit Logs & History'}</span>
                    </button>
                )}

                {canBackOffice && (
                    <button 
                        className={`sidebar-btn ${viewMode === 'recycle-bin' ? 'active' : ''}`}
                        onClick={() => setViewMode('recycle-bin')}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Trash2 size={17} />
                            <span>{lang === 'TH' ? 'ถังขยะระบบ (Recycle Bin)' : 'System Recycle Bin'}</span>
                        </div>
                        {totalRecycleCount > 0 && (
                            <span style={{
                                background: '#ef4444',
                                color: '#ffffff',
                                fontSize: '10.5px',
                                fontWeight: 800,
                                padding: '2px 7px',
                                borderRadius: '10px',
                                boxShadow: '0 2px 6px rgba(239, 68, 68, 0.35)'
                            }}>
                                {totalRecycleCount}
                            </span>
                        )}
                    </button>
                )}
            </div>

            {/* Subtle sidebar footer */}
            <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', fontSize: '10.5px', color: 'var(--text-muted)', textAlign: 'center' }}>
                MC Operations Gateway
            </div>

            {/* Sidebar Tour Guide Trigger */}
            <button 
                className="sidebar-btn"
                onClick={onStartTour}
                style={{
                    marginTop: '12px',
                    color: theme === 'light' ? '#7c3aed' : '#c084fc',
                    background: theme === 'light' ? '#f5f3ff' : 'rgba(168, 85, 247, 0.08)',
                    border: '1px dashed rgba(168, 85, 247, 0.4)',
                    borderRadius: '8px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}
            >
                <HelpCircle size={16} />
                <span>{lang === 'TH' ? '💡 ทัวร์สอนการใช้งาน' : '💡 Interactive Tour'}</span>
            </button>
        </aside>
    );
};
