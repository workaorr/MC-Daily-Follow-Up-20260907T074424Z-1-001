import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { StaffRow } from './StaffRow';
import { ChannelCard } from './ChannelCard';
import { formatKeyedDateTime } from '../../utils/dateFormatters';
import { formatChannelDisplayName } from '../../utils/customerFormatters';
import { hashPasscode } from '../../utils/auth';
import { pushAgentToCloud, pushCustomerToCloud } from '../../services/supabase';
import { 
  ShieldAlert, 
  ShieldCheck, 
  LayoutGrid, 
  Users, 
  Tag, 
  Server, 
  Database, 
  Trash2, 
  Plus, 
  Clock, 
  User, 
  DownloadCloud, 
  UploadCloud, 
  CheckCircle, 
  Activity, 
  Search, 
  RotateCcw, 
  Edit 
} from 'lucide-react';

export default function BackOfficeView() {
  const {
    agents,
    setAgents,
    customers,
    setCustomers,
    sourceChannels,
    setSourceChannels,
    sourceChannelsMeta,
    setSourceChannelsMeta,
    activeAgent,
    activeAgentName,
    isSupervisor,
    lang,
    theme,
    lastKeepAliveTime,
    setSelectedCustForModal,
    setArchiveAgentModalData,
    setViewMode,
    supabaseClient,
    writeLog
  } = useApp();

  const [backOfficeSubTab, setBackOfficeSubTab] = useState('all'); // 'all', 'staff', 'channels', 'customers', 'backup'
  const [editingAgentId, setEditingAgentId] = useState(null);

  // New staff form state
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffLoginUsername, setNewStaffLoginUsername] = useState('');
  const [newStaffPasscode, setNewStaffPasscode] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('AGENT');
  const [showNewStaffForm, setShowNewStaffForm] = useState(false);

  // New channel state
  const [newChannelInput, setNewChannelInput] = useState('');

  // Customer DB filters
  const [boSearchQuery, setBoSearchQuery] = useState('');
  const [boAgentFilter, setBoAgentFilter] = useState('ทั้งหมด');
  const [boChannelFilter, setBoChannelFilter] = useState('ทั้งหมด');
  const [boDepositFilter, setBoDepositFilter] = useState('ทั้งหมด');

  // Permission check
  const canBackOffice = isSupervisor || 
                        activeAgent?.username === 'ROOT_ADMIN' || 
                        activeAgent?.permissions?.canBackOffice;

  // Active agents (non-archived)
  const activeStaffList = useMemo(() => {
    return agents.filter(a => !a.isArchived);
  }, [agents]);

  const archivedStaffCount = useMemo(() => {
    return agents.filter(a => a.isArchived).length;
  }, [agents]);

  // Non-deleted customers
  const nonDeletedCustomers = useMemo(() => {
    return customers.filter(c => !c.deletedAt);
  }, [customers]);

  // Filtered customers for Database Control Center
  const filteredBoCustomers = useMemo(() => {
    return nonDeletedCustomers.filter(c => {
      if (boAgentFilter !== 'ทั้งหมด' && c.createdBy !== boAgentFilter) return false;
      if (boChannelFilter !== 'ทั้งหมด' && (c.sourceChannel || '').toLowerCase() !== boChannelFilter.toLowerCase()) return false;
      if (boDepositFilter === 'DEPOSITED' && !c.hasDeposited) return false;
      if (boDepositFilter === 'NOT_DEPOSITED' && c.hasDeposited) return false;

      if (boSearchQuery.trim()) {
        const q = boSearchQuery.trim().toLowerCase();
        const matchName = (c.fullName || '').toLowerCase().includes(q);
        const matchUser = (c.username || '').toLowerCase().includes(q);
        const matchPhone = (c.phone || '').toLowerCase().includes(q);
        const matchLine = (c.lineOA || '').toLowerCase().includes(q);
        if (!matchName && !matchUser && !matchPhone && !matchLine) return false;
      }

      return true;
    });
  }, [nonDeletedCustomers, boAgentFilter, boChannelFilter, boDepositFilter, boSearchQuery]);

  const isBoFilterActive = boSearchQuery || boAgentFilter !== 'ทั้งหมด' || boChannelFilter !== 'ทั้งหมด' || boDepositFilter !== 'ทั้งหมด';

  const handleResetBoFilters = () => {
    setBoSearchQuery('');
    setBoAgentFilter('ทั้งหมด');
    setBoChannelFilter('ทั้งหมด');
    setBoDepositFilter('ทั้งหมด');
  };

  // Staff Management Handlers
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    const nameVal = newStaffName.trim();
    const usernameVal = newStaffLoginUsername.trim().toLowerCase();
    const passVal = newStaffPasscode.trim();

    if (!nameVal || !usernameVal || !passVal) {
      alert(lang === 'TH' ? '⚠️ กรุณากรอกข้อมูลพนักงานให้ครบถ้วน' : 'Please fill all fields');
      return;
    }

    if (agents.some(a => a.loginUsername && a.loginUsername.toLowerCase() === usernameVal)) {
      alert(lang === 'TH' ? `⚠️ Login Username "${usernameVal}" ซ้ำกับในระบบ` : `Username "${usernameVal}" already exists`);
      return;
    }

    const hashed = await hashPasscode(passVal);
    const newAgent = {
      id: Date.now(),
      name: nameVal,
      loginUsername: usernameVal,
      passcode: hashed,
      role: newStaffRole,
      isActive: true,
      permissions: {
        canDashboard: true,
        canFollowUp: true,
        canNewCustomer: true,
        canAudit: newStaffRole === 'SUPERVISOR',
        canBackOffice: newStaffRole === 'SUPERVISOR'
      }
    };

    const updated = [...agents, newAgent];
    setAgents(updated);

    if (supabaseClient) {
      pushAgentToCloud(supabaseClient, newAgent);
    }

    writeLog('STAFF_ADD', `เพิ่มพนักงานใหม่ [${nameVal}] (${newStaffRole})`, 'success', activeAgentName);
    setNewStaffName('');
    setNewStaffLoginUsername('');
    setNewStaffPasscode('');
    setShowNewStaffForm(false);
  };

  const handleSaveStaffEdit = (agentId, updatedData) => {
    const updated = agents.map(a => {
      if (a.id !== agentId) return a;
      const merged = { ...a, ...updatedData };
      if (supabaseClient) {
        pushAgentToCloud(supabaseClient, merged);
      }
      return merged;
    });
    setAgents(updated);
    setEditingAgentId(null);
    writeLog('STAFF_UPDATE', `แก้ไขข้อมูลพนักงาน ID: ${agentId}`, 'info', activeAgentName);
  };

  const handleToggleActiveStaff = (agentId) => {
    const updated = agents.map(a => {
      if (a.id !== agentId) return a;
      const newActive = !a.isActive;
      const merged = { ...a, isActive: newActive };
      if (supabaseClient) {
        pushAgentToCloud(supabaseClient, merged);
      }
      return merged;
    });
    setAgents(updated);
    writeLog('STAFF_STATUS', `สลับสถานะพนักงาน ID: ${agentId}`, 'warning', activeAgentName);
  };

  const handleDeleteStaff = (agent) => {
    setArchiveAgentModalData(agent);
  };

  // Channels Management Handlers
  const handleAddChannel = () => {
    const val = newChannelInput.trim().toLowerCase();
    if (!val) return;
    if (sourceChannels.includes(val)) {
      alert(lang === 'TH' ? 'ช่องทางนี้มีอยู่แล้ว' : 'Channel already exists');
      return;
    }
    const updated = [...sourceChannels, val];
    setSourceChannels(updated);
    localStorage.setItem('mc_source_channels', JSON.stringify(updated));

    const meta = {
      ...(sourceChannelsMeta || {}),
      [val]: {
        createdAt: new Date().toISOString(),
        createdBy: activeAgentName || 'Admin'
      }
    };
    setSourceChannelsMeta(meta);
    localStorage.setItem('mc_source_channels_meta', JSON.stringify(meta));

    writeLog('CHANNEL_ADD', `เพิ่มช่องทางการตลาดใหม่ [${val}]`, 'info', activeAgentName);
    setNewChannelInput('');
  };

  const handleDeleteChannel = (channelName) => {
    if (!window.confirm(lang === 'TH' ? `ยืนยันการลบช่องทาง "${channelName}"?` : `Delete channel "${channelName}"?`)) return;
    const updated = sourceChannels.filter(c => c !== channelName);
    setSourceChannels(updated);
    localStorage.setItem('mc_source_channels', JSON.stringify(updated));
    writeLog('CHANNEL_DELETE', `ลบช่องทางการตลาด [${channelName}]`, 'warning', activeAgentName);
  };

  // Customer Delete Handler (Soft-delete to Recycle Bin)
  const handleDeleteCustomer = (customerId, username) => {
    if (!window.confirm(lang === 'TH' ? `ต้องการย้ายลูกค้า [${username || customerId}] ไปยังถังขยะหรือไม่?` : `Move customer [${username || customerId}] to Recycle Bin?`)) return;

    const nowIso = new Date().toISOString();
    const updated = customers.map(c => {
      if (c.id !== customerId) return c;
      const softDeleted = {
        ...c,
        deletedAt: nowIso,
        deletedBy: activeAgentName || 'Supervisor',
        isDeleted: true
      };
      if (supabaseClient) {
        pushCustomerToCloud(supabaseClient, softDeleted);
      }
      return softDeleted;
    });

    setCustomers(updated);
    writeLog('CUSTOMER_DELETE', `ย้ายลูกค้า [${username || customerId}] ไปยังถังขยะ`, 'warning', activeAgentName);
  };

  // Full System JSON Backup
  const handleFullSystemBackup = () => {
    const backupData = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      exportedBy: activeAgentName || 'Supervisor',
      customers: customers,
      agents: agents,
      sourceChannels: sourceChannels,
      sourceChannelsMeta: sourceChannelsMeta
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MC_CRM_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    writeLog('BACKUP_EXPORT', 'ดาวน์โหลดไฟล์สำรองข้อมูลระบบแบบสมบูรณ์ (Full JSON Backup)', 'info', activeAgentName);
  };

  // Full System JSON Restore
  const handleFullSystemRestore = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed || (!parsed.customers && !parsed.agents)) {
          alert(lang === 'TH' ? '❌ โครงสร้างไฟล์สำรองไม่ถูกต้อง' : 'Invalid backup file structure');
          return;
        }

        if (!window.confirm(lang === 'TH' ? '⚠️ คำเตือน: การกู้คืนระบบจะแทนที่ข้อมูลเดิมทั้งหมด ยืนยันการดำเนินการ?' : 'Warning: Restore will overwrite existing system data. Proceed?')) return;

        if (Array.isArray(parsed.customers)) {
          setCustomers(parsed.customers);
          localStorage.setItem('mc_customers', JSON.stringify(parsed.customers));
        }
        if (Array.isArray(parsed.agents)) {
          setAgents(parsed.agents);
          localStorage.setItem('mc_agents', JSON.stringify(parsed.agents));
        }
        if (Array.isArray(parsed.sourceChannels)) {
          setSourceChannels(parsed.sourceChannels);
          localStorage.setItem('mc_source_channels', JSON.stringify(parsed.sourceChannels));
        }
        if (parsed.sourceChannelsMeta) {
          setSourceChannelsMeta(parsed.sourceChannelsMeta);
          localStorage.setItem('mc_source_channels_meta', JSON.stringify(parsed.sourceChannelsMeta));
        }

        alert(lang === 'TH' ? '✅ กู้คืนระบบสำเร็จสมบูรณ์!' : 'System restore successful!');
        writeLog('BACKUP_RESTORE', `กู้คืนระบบสำเร็จจากไฟล์ ${file.name}`, 'warning', activeAgentName);
      } catch (err) {
        alert(lang === 'TH' ? `❌ เกิดข้อผิดพลาดในการอ่านไฟล์: ${err.message}` : `Error reading file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  if (!canBackOffice) {
    return (
      <div 
        className="restricted-access-card" 
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(244, 63, 94, 0.25)',
          borderRadius: '24px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
          textAlign: 'center',
          maxWidth: '560px',
          margin: '40px auto'
        }}
      >
        <div style={{
          padding: '16px',
          borderRadius: '20px',
          background: 'rgba(244, 63, 94, 0.12)',
          color: '#fb7185',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          marginBottom: '16px'
        }}>
          <ShieldAlert style={{ width: '42px', height: '42px' }} />
        </div>
        <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>
          {lang === 'TH' ? '⛔ สิทธิ์การเข้าถึงพื้นที่สงวน (Access Restricted)' : '⛔ Access Restricted'}
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '24px' }}>
          {lang === 'TH' ? (
            <>บัญชีของคุณ [<strong>{activeAgentName}</strong>] มีระดับสิทธิ์เป็นพนักงาน (MC Agent) ยังไม่ได้รับอนุมัติสิทธิ์ในการเข้าถึงระบบจัดการหลังบ้าน หากต้องการเข้าใช้งาน กรุณาติดต่อหัวหน้า (Supervisor) เพื่อเปิดสิทธิ์การเข้าถึง "⚙️ จัดการหลังบ้าน & Audit Logs"</>
          ) : (
            <>Your account [<strong>{activeAgentName}</strong>] has MC Agent role and is not authorized to access Back Office. Please contact a Supervisor.</>
          )}
        </p>
        <button 
          className="btn btn-secondary"
          onClick={() => setViewMode('agent')}
          style={{ padding: '10px 20px', fontSize: '12px' }}
        >
          {lang === 'TH' ? 'กลับไปยังหน้าการติดตามลูกค้า (MC Agent)' : 'Back to Follow-Up Table (MC Agent)'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header Banner & Sub-Tabs Controller */}
      <div id="tour-bo-panel" className="panel" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        padding: '16px 20px',
        background: theme === 'light' ? '#ffffff' : 'rgba(15, 23, 42, 0.75)',
        border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(168, 85, 247, 0.25)',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="bo-banner-icon" style={{ padding: '10px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
              <ShieldCheck style={{ width: '24px', height: '24px' }} />
            </div>
            <div>
              <h3 className="banner-title" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                {lang === 'TH' ? 'ระบบจัดการหลังบ้านและสิทธิ์การใช้งาน (Back Office)' : 'Back Office & System Audit Control'}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                {lang === 'TH' ? 'จัดการพนักงาน MC, กำหนดระดับสิทธิ์การเข้าถึงเมนู, ซิงค์คลาวด์ Supabase' : 'Manage MC Staff, Configure Roles & Permissions, Cloud Database Sync'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="bo-admin-badge" style={{ fontSize: '11.5px', fontWeight: 700, padding: '5px 12px', borderRadius: '20px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
              {lang === 'TH' ? `👑 ผู้ดูแลระบบ: ${activeAgentName}` : `👑 Administrator: ${activeAgentName}`}
            </span>
          </div>
        </div>

        {/* Sub-Tabs Bar */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          borderTop: theme === 'light' ? '1px solid #f1f5f9' : '1px solid rgba(255, 255, 255, 0.06)',
          paddingTop: '12px',
          width: '100%'
        }}>
          <button
            type="button"
            className={`btn ${backOfficeSubTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setBackOfficeSubTab('all')}
            style={{ flex: '1 1 auto', padding: '7px 12px', fontSize: '12px', fontWeight: backOfficeSubTab === 'all' ? 700 : 500, borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <LayoutGrid style={{ width: '13px', height: '13px' }} />
            <span>{lang === 'TH' ? '📑 ทั้งหมด' : '📑 All'}</span>
          </button>

          <button
            type="button"
            className={`btn ${backOfficeSubTab === 'staff' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setBackOfficeSubTab('staff')}
            style={{ flex: '1 1 auto', padding: '7px 12px', fontSize: '12px', fontWeight: backOfficeSubTab === 'staff' ? 700 : 500, borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Users style={{ width: '13px', height: '13px' }} />
            <span>{lang === 'TH' ? `👥 พนักงาน & สิทธิ์ (${activeStaffList.length})` : `👥 Staff & Roles (${activeStaffList.length})`}</span>
          </button>

          <button
            type="button"
            className={`btn ${backOfficeSubTab === 'channels' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setBackOfficeSubTab('channels')}
            style={{ flex: '1 1 auto', padding: '7px 12px', fontSize: '12px', fontWeight: backOfficeSubTab === 'channels' ? 700 : 500, borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Tag style={{ width: '13px', height: '13px' }} />
            <span>{lang === 'TH' ? `🏷️ ช่องทางการตลาด (${sourceChannels.length})` : `🏷️ Channels (${sourceChannels.length})`}</span>
          </button>

          <button
            type="button"
            className={`btn ${backOfficeSubTab === 'customers' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setBackOfficeSubTab('customers')}
            style={{ flex: '1 1 auto', padding: '7px 12px', fontSize: '12px', fontWeight: backOfficeSubTab === 'customers' ? 700 : 500, borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Server style={{ width: '13px', height: '13px' }} />
            <span>{lang === 'TH' ? '🗄️ จัดการฐานข้อมูลลูกค้ารวม' : '🗄️ Customer DB'}</span>
          </button>

          <button
            type="button"
            className={`btn ${backOfficeSubTab === 'backup' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setBackOfficeSubTab('backup')}
            style={{ flex: '1 1 auto', padding: '7px 12px', fontSize: '12px', fontWeight: backOfficeSubTab === 'backup' ? 700 : 500, borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Database style={{ width: '13px', height: '13px' }} />
            <span>{lang === 'TH' ? '💾 สำรองข้อมูลฉุกเฉิน' : '💾 Emergency Backup'}</span>
          </button>
        </div>
      </div>

      {/* Section 1: Staff & Role Manager */}
      {(backOfficeSubTab === 'all' || backOfficeSubTab === 'staff') && (
        <div className="panel">
          <h3 className="panel-title" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users /> {lang === 'TH' ? 'จัดการรายชื่อพนักงาน MC และสิทธิ์การใช้งาน (MC Users & Role Manager)' : 'MC Users & Role Manager'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setViewMode('recycle-bin')}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  borderRadius: '8px',
                  background: archivedStaffCount > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                  color: archivedStaffCount > 0 ? '#ef4444' : 'var(--text-muted)',
                  border: archivedStaffCount > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Trash2 style={{ width: '12px', height: '12px' }} />
                <span>{lang === 'TH' ? `ถังขยะพนักงาน (${archivedStaffCount})` : `Trash (${archivedStaffCount})`}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowNewStaffForm(!showNewStaffForm)}
                className="btn btn-primary"
                style={{ padding: '4px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus style={{ width: '12px', height: '12px' }} />
                <span>{lang === 'TH' ? 'เพิ่มพนักงานใหม่' : 'Add Staff'}</span>
              </button>
            </div>
          </h3>

          {/* New Staff Form */}
          {showNewStaffForm && (
            <form onSubmit={handleCreateStaff} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', padding: '12px', background: theme === 'light' ? '#f8fafc' : 'rgba(255,255,255,0.03)', borderRadius: '10px', marginBottom: '14px', border: '1px dashed var(--primary)' }}>
              <input
                type="text"
                placeholder={lang === 'TH' ? 'ชื่อพนักงาน...' : 'Staff name...'}
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                className="select-input"
                style={{ flex: 1, minWidth: '130px' }}
                required
              />
              <input
                type="text"
                placeholder={lang === 'TH' ? 'Login Username...' : 'Login Username...'}
                value={newStaffLoginUsername}
                onChange={(e) => setNewStaffLoginUsername(e.target.value)}
                className="select-input"
                style={{ flex: 1, minWidth: '130px' }}
                required
              />
              <input
                type="password"
                placeholder={lang === 'TH' ? 'Passcode 4-6 หลัก...' : 'Passcode...'}
                value={newStaffPasscode}
                onChange={(e) => setNewStaffPasscode(e.target.value)}
                className="select-input"
                style={{ flex: 1, minWidth: '120px' }}
                required
              />
              <select
                value={newStaffRole}
                onChange={(e) => setNewStaffRole(e.target.value)}
                className="select-input"
                style={{ minWidth: '120px' }}
              >
                <option value="AGENT">MC Agent</option>
                <option value="SUPERVISOR">Supervisor</option>
              </select>
              <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '12px' }}>
                {lang === 'TH' ? 'บันทึก' : 'Save'}
              </button>
            </form>
          )}

          {/* Staff Table */}
          <div className="table-responsive">
            <table className="data-table" style={{ width: '100%', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th>{lang === 'TH' ? 'ชื่อพนักงาน / บัญชี' : 'Staff / Account'}</th>
                  <th>{lang === 'TH' ? 'บทบาท (Role)' : 'Role'}</th>
                  <th style={{ textAlign: 'center' }}>{lang === 'TH' ? 'สถานะ' : 'Status'}</th>
                  <th style={{ textAlign: 'center' }}>{lang === 'TH' ? 'สิทธิ์การเข้าถึงเมนู' : 'Permissions'}</th>
                  <th style={{ textAlign: 'center' }}>{lang === 'TH' ? 'เข้าสู่ระบบล่าสุด' : 'Last Login'}</th>
                  <th style={{ textAlign: 'center' }}>{lang === 'TH' ? 'การจัดการ' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {activeStaffList.map(agent => (
                  <StaffRow
                    key={agent.id}
                    agent={agent}
                    isEditing={editingAgentId === agent.id}
                    onStartEdit={() => setEditingAgentId(agent.id)}
                    onCancelEdit={() => setEditingAgentId(null)}
                    onSaveEdit={(data) => handleSaveStaffEdit(agent.id, data)}
                    onToggleActive={() => handleToggleActiveStaff(agent.id)}
                    onDelete={() => handleDeleteStaff(agent)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 2: Marketing Channels */}
      {(backOfficeSubTab === 'all' || backOfficeSubTab === 'channels') && (
        <div className="panel">
          <h3 className="panel-title" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
            <Tag /> {lang === 'TH' ? 'จัดการช่องทางการตลาด (Marketing Channels)' : 'Marketing Channels Manager'}
          </h3>

          <div style={{ display: 'flex', gap: '8px', margin: '14px 0', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={newChannelInput}
              onChange={(e) => setNewChannelInput(e.target.value)}
              placeholder={lang === 'TH' ? 'พิมพ์ชื่อช่องทางใหม่ เช่น instagram, telegram, tiktok...' : 'Enter new channel e.g. instagram, telegram...'}
              className="select-input"
              style={{ flex: '1 1 240px', padding: '8px 12px', fontSize: '12px' }}
              onKeyDown={(e) => e.key === 'Enter' && handleAddChannel()}
            />
            <button
              type="button"
              onClick={handleAddChannel}
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus style={{ width: '14px', height: '14px' }} />
              <span>{lang === 'TH' ? 'เพิ่มช่องทางใหม่' : 'Add Channel'}</span>
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table" style={{ width: '100%', fontSize: '12.5px' }}>
              <thead>
                <tr>
                  <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                  <th>{lang === 'TH' ? 'ชื่อช่องทางการตลาด' : 'Channel Name'}</th>
                  <th style={{ width: '145px', textAlign: 'center' }}>{lang === 'TH' ? 'ประเภท' : 'Type'}</th>
                  <th style={{ width: '135px', textAlign: 'center' }}>{lang === 'TH' ? 'ลูกค้าที่สมัคร' : 'Customers'}</th>
                  <th>{lang === 'TH' ? 'สร้างเมื่อ' : 'Created Date'}</th>
                  <th>{lang === 'TH' ? 'สร้างโดย' : 'Created By'}</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>{lang === 'TH' ? 'การจัดการ' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {sourceChannels.map((ch, idx) => (
                  <ChannelCard
                    key={ch}
                    channel={ch}
                    index={idx}
                    onDelete={handleDeleteChannel}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 3: Central Database Control Center */}
      {(backOfficeSubTab === 'all' || backOfficeSubTab === 'customers') && (
        <div className="panel">
          <div className="panel-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
            <h3 className="panel-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Server /> {lang === 'TH' ? 'จัดการฐานข้อมูลลูกค้ารวม (Central Database Control Center)' : 'Central Database Control Center'}
            </h3>
            {isBoFilterActive && (
              <button 
                onClick={handleResetBoFilters}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <RotateCcw style={{ width: '12px', height: '12px' }} />
                <span>{lang === 'TH' ? 'ล้างตัวกรองทั้งหมด' : 'Reset Filters'}</span>
              </button>
            )}
          </div>

          {/* Filters Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '10px',
            margin: '12px 0 16px 0',
            padding: '12px',
            background: theme === 'light' ? '#f8fafc' : 'rgba(255,255,255,0.03)',
            borderRadius: '10px'
          }}>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '13px', height: '13px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder={lang === 'TH' ? 'ค้นหาชื่อ, ยูส, เบอร์...' : 'Search customer...'}
                value={boSearchQuery}
                onChange={(e) => setBoSearchQuery(e.target.value)}
                className="select-input"
                style={{ width: '100%', paddingLeft: '30px', fontSize: '12px' }}
              />
            </div>

            <select
              value={boAgentFilter}
              onChange={(e) => setBoAgentFilter(e.target.value)}
              className="select-input"
              style={{ fontSize: '12px' }}
            >
              <option value="ทั้งหมด">{lang === 'TH' ? 'พนักงานทั้งหมด' : 'All Agents'}</option>
              {agents.map(a => (
                <option key={a.id} value={a.name}>{a.name}</option>
              ))}
            </select>

            <select
              value={boChannelFilter}
              onChange={(e) => setBoChannelFilter(e.target.value)}
              className="select-input"
              style={{ fontSize: '12px' }}
            >
              <option value="ทั้งหมด">{lang === 'TH' ? 'ทุกช่องทาง' : 'All Channels'}</option>
              {sourceChannels.map(ch => (
                <option key={ch} value={ch}>{formatChannelDisplayName(ch, lang)}</option>
              ))}
            </select>

            <select
              value={boDepositFilter}
              onChange={(e) => setBoDepositFilter(e.target.value)}
              className="select-input"
              style={{ fontSize: '12px' }}
            >
              <option value="ทั้งหมด">{lang === 'TH' ? 'ทุกสถานะฝาก' : 'All Deposit Status'}</option>
              <option value="DEPOSITED">{lang === 'TH' ? '🟢 ฝากแล้ว' : 'Deposited'}</option>
              <option value="NOT_DEPOSITED">{lang === 'TH' ? '🔴 ยังไม่ฝาก' : 'Pending Deposit'}</option>
            </select>
          </div>

          {/* Customers Table */}
          <div className="table-responsive">
            <table className="data-table" style={{ width: '100%', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th>{lang === 'TH' ? 'ชื่อลูกค้า / ยูสเซอร์' : 'Customer / Username'}</th>
                  <th>{lang === 'TH' ? 'ข้อมูลติดต่อ' : 'Contact'}</th>
                  <th>{lang === 'TH' ? 'ช่องทาง' : 'Channel'}</th>
                  <th>{lang === 'TH' ? 'ผู้ดูแล' : 'Owner'}</th>
                  <th style={{ textAlign: 'right' }}>{lang === 'TH' ? 'เงินสะสม' : 'Total Deposits'}</th>
                  <th style={{ textAlign: 'center' }}>{lang === 'TH' ? 'สถานะ' : 'Status'}</th>
                  <th style={{ textAlign: 'center' }}>{lang === 'TH' ? 'การจัดการ' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredBoCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      {lang === 'TH' ? 'ไม่พบข้อมูลลูกค้าตรงตามเงื่อนไข' : 'No customers match criteria'}
                    </td>
                  </tr>
                ) : (
                  filteredBoCustomers.slice(0, 100).map(cust => (
                    <tr key={cust.id}>
                      <td>
                        <strong>{cust.fullName || '-'}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--primary)' }}>@{cust.username || 'unregistered'}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '11px' }}>📞 {cust.phone || '-'}</div>
                        <div style={{ fontSize: '11px', color: '#34d399' }}>💬 {cust.lineOA || '-'}</div>
                      </td>
                      <td>
                        <span className="badge badge-source">{formatChannelDisplayName(cust.sourceChannel, lang)}</span>
                      </td>
                      <td>
                        <span className="badge badge-owner">{cust.createdBy || '-'}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        ฿{(cust.totalDeposit || 0).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {cust.hasDeposited ? (
                          <span className="badge badge-saved">🟢 {lang === 'TH' ? 'ฝากแล้ว' : 'Deposited'}</span>
                        ) : (
                          <span className="badge badge-pending">🔴 {lang === 'TH' ? 'รอฝาก' : 'Pending'}</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '3px 8px', fontSize: '10px', marginRight: '4px' }}
                          onClick={() => setSelectedCustForModal(cust)}
                        >
                          <Edit style={{ width: '11px', height: '11px' }} />
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '3px 8px', fontSize: '10px', color: '#f43f5e' }}
                          onClick={() => handleDeleteCustomer(cust.id, cust.username)}
                        >
                          <Trash2 style={{ width: '11px', height: '11px' }} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 4: Disaster Recovery & Backup/Restore */}
      {(backOfficeSubTab === 'all' || backOfficeSubTab === 'backup') && (
        <div className="panel" style={{
          marginTop: '24px',
          background: theme === 'light' ? '#ffffff' : 'rgba(15, 23, 42, 0.75)',
          border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: '16px',
          padding: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}>
                <ShieldAlert style={{ width: '22px', height: '22px' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {lang === 'TH' ? 'ระบบสำรองและกู้คืนฐานข้อมูลฉุกเฉิน (Disaster Recovery Control)' : 'Disaster Recovery & Database Backup'}
                  <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: 600 }}>
                    {lastKeepAliveTime ? `🟢 Keep-Alive: ${lastKeepAliveTime}` : '🟢 Keep-Alive: Active'}
                  </span>
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  {lang === 'TH' 
                    ? 'สำรองข้อมูลทั้งหมดหรือกู้คืนระบบฉุกเฉินด้วยไฟล์ JSON มาตรฐาน' 
                    : 'One-click full JSON backup & disaster restore.'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleFullSystemBackup}
                style={{ padding: '10px 18px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <DownloadCloud style={{ width: '16px', height: '16px' }} />
                <span>{lang === 'TH' ? 'ดาวน์โหลดสำรองข้อมูลเต็มระบบ (Full Backup)' : 'Download Full Backup'}</span>
              </button>

              <label
                className="btn btn-secondary"
                style={{ padding: '10px 18px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              >
                <UploadCloud style={{ width: '16px', height: '16px', color: '#f59e0b' }} />
                <span>{lang === 'TH' ? 'กู้คืนระบบจากไฟล์ Backup (Restore JSON)' : 'Restore from Backup'}</span>
                <input
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files && e.target.files[0];
                    if (file) {
                      handleFullSystemRestore(file);
                      e.target.value = '';
                    }
                  }}
                />
              </label>
            </div>
          </div>

          {/* Security & Health Notice */}
          <div style={{
            marginTop: '16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '12px'
          }}>
            <div style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: theme === 'light' ? '#eff6ff' : 'rgba(59, 130, 246, 0.08)',
              border: theme === 'light' ? '1px solid #bfdbfe' : '1px solid rgba(59, 130, 246, 0.2)',
              fontSize: '12px',
              color: theme === 'light' ? '#1e40af' : '#93c5fd'
            }}>
              <div style={{ fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle style={{ width: '14px', height: '14px' }} />
                <span>{lang === 'TH' ? 'ความปลอดภัยระดับสูง (SHA-256 + Salt)' : 'Hardened Security'}</span>
              </div>
              <span>{lang === 'TH' ? 'รหัสผ่านพนักงานทั้งหมดถูกเข้ารหัส SHA-256 ผสม Salt และมาสก์มิดชิด ป้องกันการดักจับข้อมูล' : 'Agent passcodes are secured with SHA-256.'}</span>
            </div>

            <div style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: theme === 'light' ? '#f0fdf4' : 'rgba(16, 185, 129, 0.08)',
              border: theme === 'light' ? '1px solid #bbf7d0' : '1px solid rgba(16, 185, 129, 0.2)',
              fontSize: '12px',
              color: theme === 'light' ? '#166534' : '#6ee7b7'
            }}>
              <div style={{ fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity style={{ width: '14px', height: '14px' }} />
                <span>{lang === 'TH' ? 'ระบบ Keep-Alive คลาวด์อัตโนมัติ' : 'Cloud Keep-Alive Engine'}</span>
              </div>
              <span>{lang === 'TH' ? 'ระบบส่งสัญญาณ Heartbeat ไปยัง Supabase ทุก 4 นาทีโดยอัตโนมัติ เพื่อป้องกันฐานข้อมูลหลับ' : 'Heartbeat pings Supabase every 4 minutes.'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { BackOfficeView };
