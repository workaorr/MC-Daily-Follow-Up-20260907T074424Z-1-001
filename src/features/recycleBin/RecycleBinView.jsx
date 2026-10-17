import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { pushAgentToCloud, pushCustomerToCloud } from '../../services/supabase';
import { 
  ShieldAlert, 
  Trash2, 
  Users, 
  UserCheck, 
  CheckCircle, 
  RotateCcw, 
  Trash, 
  AlertTriangle 
} from 'lucide-react';

export default function RecycleBinView() {
  const {
    agents,
    setAgents,
    customers,
    setCustomers,
    deletedCustomers,
    setDeletedCustomers,
    activeAgent,
    activeAgentName,
    isSupervisor,
    lang,
    theme,
    setViewMode,
    supabaseClient,
    writeLog
  } = useApp();

  const [recycleBinTab, setRecycleBinTab] = useState('agents'); // 'agents' or 'customers'

  // Permission check
  const canBackOffice = isSupervisor || 
                        activeAgent?.username === 'ROOT_ADMIN' || 
                        activeAgent?.permissions?.canBackOffice;

  const archivedAgents = useMemo(() => {
    return agents.filter(a => a.isArchived);
  }, [agents]);

  // Restore staff
  const handleRestoreAgent = async (agent) => {
    if (!window.confirm(lang === 'TH' ? `ยืนยันการกู้คืนบัญชีพนักงาน [${agent.name}] กลับเข้าสู่ระบบ?` : `Restore agent [${agent.name}]?`)) return;

    const restoredAgent = {
      ...agent,
      isArchived: false,
      archivedAt: null,
      archivedBy: null,
      isActive: true
    };

    const updated = agents.map(a => a.id === agent.id ? restoredAgent : a);
    setAgents(updated);

    if (supabaseClient) {
      try {
        await supabaseClient
          .from('mc_agents')
          .update({
            is_active: true,
            permissions: {
              ...(restoredAgent.permissions || {}),
              _archived: null
            }
          })
          .eq('id', agent.id);
      } catch (err) {
        console.error('Failed to restore agent in cloud:', err);
      }
    }

    writeLog('RECYCLE', `กู้คืนบัญชีพนักงาน [${agent.name}] กลับสู่ระบบสำเร็จ`, 'success', activeAgentName);
  };

  // Permanently delete staff
  const handlePermanentDeleteAgent = async (agent) => {
    if (!window.confirm(lang === 'TH' ? `⚠️ คำเตือน: คุณต้องการลบพนักงาน [${agent.name}] ออกจากระบบอย่างถาวรใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้!` : `Permanently delete agent [${agent.name}]? This cannot be undone!`)) return;

    const updated = agents.filter(a => a.id !== agent.id);
    setAgents(updated);

    if (supabaseClient) {
      try {
        await supabaseClient
          .from('mc_agents')
          .delete()
          .eq('id', agent.id);
      } catch (err) {
        console.error('Failed to permanently delete agent in cloud:', err);
      }
    }

    writeLog('STAFF_AUDIT', `ลบบัญชีพนักงาน [${agent.name}] ถาวรออกจากฐานข้อมูล`, 'danger', activeAgentName);
  };

  // Restore customer
  const handleRestoreCustomer = async (cust) => {
    if (!window.confirm(lang === 'TH' ? `ยืนยันการกู้คืนลูกค้า [${cust.fullName || cust.username || cust.id}] กลับเข้าสู่ระบบ?` : `Restore customer [${cust.fullName || cust.username || cust.id}]?`)) return;

    const restoredCust = {
      ...cust,
      deletedAt: null,
      deletedBy: null,
      isDeleted: false,
      updatedBy: activeAgentName || 'Supervisor',
      updatedAt: new Date().toISOString()
    };

    // Add to active customers
    const updatedCustomers = [restoredCust, ...customers];
    setCustomers(updatedCustomers);

    // Remove from deletedCustomers
    const updatedDeleted = deletedCustomers.filter(c => c.id !== cust.id);
    setDeletedCustomers(updatedDeleted);

    if (supabaseClient) {
      pushCustomerToCloud(supabaseClient, restoredCust);
    }

    writeLog('RECYCLE', `กู้คืนข้อมูลลูกค้า [${cust.fullName || cust.username || cust.id}] สำเร็จ`, 'success', activeAgentName);
  };

  // Permanently delete single customer
  const handlePermanentDeleteCustomer = async (customerId, nameOrUser) => {
    if (!window.confirm(lang === 'TH' ? `⚠️ ยืนยันการลบลูกค้า [${nameOrUser}] ออกจากฐานข้อมูลอย่างถาวร? ข้อมูลจะไม่สามารถกู้คืนได้อีก` : `Permanently delete [${nameOrUser}]? Cannot be undone.`)) return;

    const updatedDeleted = deletedCustomers.filter(c => c.id !== customerId);
    setDeletedCustomers(updatedDeleted);

    if (supabaseClient) {
      try {
        await supabaseClient
          .from('mc_customers')
          .delete()
          .eq('id', customerId);
      } catch (err) {
        console.error('Failed to permanently delete customer from cloud:', err);
      }
    }

    writeLog('CUSTOMER_PURGE', `ลบข้อมูลลูกค้า [${nameOrUser}] ถาวรออกจากระบบ`, 'danger', activeAgentName);
  };

  // Empty all customers in recycle bin
  const handleClearAllRecycleBin = async () => {
    if (deletedCustomers.length === 0) return;
    if (!window.confirm(lang === 'TH' ? `⚠️ คุณต้องการล้างถังขยะลูกค้าทั้งหมด (${deletedCustomers.length} รายการ) ถาวรใช่หรือไม่?` : `Purge all ${deletedCustomers.length} deleted customers permanently?`)) return;

    const idsToDelete = deletedCustomers.map(c => c.id);
    setDeletedCustomers([]);

    if (supabaseClient && idsToDelete.length > 0) {
      try {
        await supabaseClient
          .from('mc_customers')
          .delete()
          .in('id', idsToDelete);
      } catch (err) {
        console.error('Failed to purge customers from cloud:', err);
      }
    }

    writeLog('CUSTOMER_PURGE', `ล้างถังขยะลูกค้าทั้งหมด ${idsToDelete.length} รายการถาวร`, 'danger', activeAgentName);
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
          {lang === 'TH' 
            ? 'พื้นที่ถังขยะระบบและกู้คืนข้อมูล อนุญาตให้เข้าถึงเฉพาะผู้ใช้ระดับผู้จัดการหรือหัวหน้า (Supervisor) เท่านั้น' 
            : 'System Recycle Bin and Data Recovery is restricted to Supervisor accounts only.'}
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

  const totalRecycleItems = archivedAgents.length + deletedCustomers.length;

  return (
    <div id="system-recycle-bin-section" className="panel" style={{
      marginTop: 0,
      background: theme === 'light' ? '#ffffff' : 'rgba(15, 23, 42, 0.75)',
      border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(239, 68, 68, 0.25)',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)'
    }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)'
          }}>
            <Trash2 style={{ width: '22px', height: '22px' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {lang === 'TH' ? 'ถังขยะระบบและกู้คืนข้อมูล (System Recycle Bin & Restore)' : 'System Recycle Bin & Restore'}
              <span style={{ fontSize: '11.5px', padding: '3px 10px', borderRadius: '20px', background: totalRecycleItems > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(148, 163, 184, 0.15)', color: totalRecycleItems > 0 ? '#ef4444' : 'var(--text-muted)', border: '1px solid rgba(239, 68, 68, 0.25)', fontWeight: 700 }}>
                {totalRecycleItems} {lang === 'TH' ? 'รายการ' : 'records'}
              </span>
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              {lang === 'TH' 
                ? 'รายการที่ถูกลบจะถูกเปลี่ยนสถานะเป็น "อยู่ในถังขยะ (Archived)" และเก็บรักษาไว้นาน 30 วัน คุณสามารถกด "กู้คืน" กลับเข้าสู่ระบบได้ทุกเมื่อ' 
                : 'Deleted records are kept safely in the Recycle Bin for 30 days before permanent removal. You can restore them anytime.'}
            </p>
          </div>
        </div>

        {/* Tab Switcher: Staff vs Customers */}
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.25)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            type="button"
            onClick={() => setRecycleBinTab('agents')}
            style={{
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              background: recycleBinTab === 'agents' ? '#ef4444' : 'transparent',
              color: recycleBinTab === 'agents' ? '#ffffff' : 'var(--text-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Users style={{ width: '13px', height: '13px' }} />
            <span>{lang === 'TH' ? `👤 พนักงานในถังขยะ (${archivedAgents.length})` : `Staff (${archivedAgents.length})`}</span>
          </button>
          <button
            type="button"
            onClick={() => setRecycleBinTab('customers')}
            style={{
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              background: recycleBinTab === 'customers' ? '#ef4444' : 'transparent',
              color: recycleBinTab === 'customers' ? '#ffffff' : 'var(--text-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <UserCheck style={{ width: '13px', height: '13px' }} />
            <span>{lang === 'TH' ? `👥 ลูกค้าในถังขยะ (${deletedCustomers.length})` : `Customers (${deletedCustomers.length})`}</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Archived Staff */}
      {recycleBinTab === 'agents' && (
        <div style={{ marginTop: '16px' }}>
          {archivedAgents.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              <CheckCircle style={{ width: '32px', height: '32px', margin: '0 auto 8px auto', display: 'block', color: '#10b981', opacity: 0.8 }} />
              {lang === 'TH' ? 'ไม่มีรายชื่อพนักงานในถังขยะ — บัญชีพนักงานทั้งหมดปลอดภัยสมบูรณ์' : 'No staff in Recycle Bin. All staff accounts are active.'}
            </div>
          ) : (
            <div className="table-responsive" style={{ maxHeight: '360px', overflowY: 'auto' }}>
              <table className="data-table" style={{ width: '100%', fontSize: '12.5px' }}>
                <thead>
                  <tr>
                    <th>{lang === 'TH' ? 'ชื่อพนักงาน' : 'Staff Name'}</th>
                    <th>{lang === 'TH' ? 'บทบาท' : 'Role'}</th>
                    <th>{lang === 'TH' ? 'ยูสเซอร์เนม' : 'Username'}</th>
                    <th>{lang === 'TH' ? 'วันเวลาที่ย้ายลงถังขยะ' : 'Archived At'}</th>
                    <th>{lang === 'TH' ? 'ระยะเวลาเก็บรักษา' : 'Retention'}</th>
                    <th>{lang === 'TH' ? 'ผู้ดำเนินการ' : 'Archived By'}</th>
                    <th style={{ textAlign: 'center' }}>{lang === 'TH' ? 'การจัดการ' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {archivedAgents.map(a => {
                    const archivedTime = a.archivedAt ? new Date(a.archivedAt).getTime() : Date.now();
                    const elapsedDays = Math.floor((Date.now() - archivedTime) / (1000 * 60 * 60 * 24));
                    const remainingDays = Math.max(0, 30 - elapsedDays);
                    return (
                      <tr key={a.id}>
                        <td>
                          <strong style={{ color: '#ef4444' }}>{a.name}</strong>
                        </td>
                        <td>
                          <span className="badge badge-owner" style={{ fontSize: '11px' }}>
                            {a.role === 'SUPERVISOR' ? '👑 หัวหน้า' : '👤 พนักงาน'}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'monospace', color: '#c084fc' }}>
                          {a.loginUsername ? `@${a.loginUsername}` : '-'}
                        </td>
                        <td style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          {a.archivedAt ? new Date(a.archivedAt).toLocaleString('th-TH') : '-'}
                        </td>
                        <td>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            background: remainingDays <= 5 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: remainingDays <= 5 ? '#ef4444' : '#fbbf24',
                            fontWeight: 700
                          }}>
                            ⏳ {lang === 'TH' ? `เหลือ ${remainingDays} วัน` : `${remainingDays}d left`}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px' }}>
                          <span style={{ color: '#f59e0b', fontWeight: 600 }}>{a.archivedBy || 'Supervisor'}</span>
                        </td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => handleRestoreAgent(a)}
                            style={{
                              padding: '5px 12px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              background: '#10b981',
                              marginRight: '8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            <RotateCcw style={{ width: '12px', height: '12px' }} />
                            <span>{lang === 'TH' ? 'กู้คืน' : 'Restore'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePermanentDeleteAgent(a)}
                            style={{
                              border: 'none',
                              background: 'rgba(239, 68, 68, 0.12)',
                              color: '#ef4444',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 style={{ width: '12px', height: '12px' }} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Archived Customers */}
      {recycleBinTab === 'customers' && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
            {deletedCustomers.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClearAllRecycleBin}
                style={{
                  padding: '6px 12px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Trash style={{ width: '13px', height: '13px' }} />
                <span>{lang === 'TH' ? 'ล้างถังขยะลูกค้าทั้งหมด' : 'Empty Customer Recycle Bin'}</span>
              </button>
            )}
          </div>

          {deletedCustomers.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              <CheckCircle style={{ width: '32px', height: '32px', margin: '0 auto 8px auto', display: 'block', color: '#10b981', opacity: 0.8 }} />
              {lang === 'TH' ? 'ไม่มีรายการลูกค้าในถังขยะ — ข้อมูลลูกค้าทั้งหมดปลอดภัยสมบูรณ์' : 'Recycle bin is empty. All customer records are safe.'}
            </div>
          ) : (
            <div className="table-responsive" style={{ maxHeight: '360px', overflowY: 'auto' }}>
              <table className="data-table" style={{ width: '100%', fontSize: '12.5px' }}>
                <thead>
                  <tr>
                    <th>{lang === 'TH' ? 'ชื่อลูกค้า / ยูสเซอร์' : 'Customer / User'}</th>
                    <th>{lang === 'TH' ? 'เบอร์โทร' : 'Phone'}</th>
                    <th>{lang === 'TH' ? 'ผู้ดูแลเดิม' : 'Original MC'}</th>
                    <th>{lang === 'TH' ? 'วันเวลาที่ลบ' : 'Deleted At'}</th>
                    <th>{lang === 'TH' ? 'ระยะเวลาเก็บรักษา' : 'Retention'}</th>
                    <th>{lang === 'TH' ? 'ผู้ที่ลบ' : 'Deleted By'}</th>
                    <th style={{ textAlign: 'center' }}>{lang === 'TH' ? 'การจัดการ' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {deletedCustomers.map(dc => {
                    const deletedTime = dc.deletedAt ? new Date(dc.deletedAt).getTime() : Date.now();
                    const elapsedDays = Math.floor((Date.now() - deletedTime) / (1000 * 60 * 60 * 24));
                    const remainingDays = Math.max(0, 30 - elapsedDays);
                    return (
                      <tr key={dc.id || dc.deletedAt}>
                        <td>
                          <strong>{dc.fullName || dc.username || `ID#${dc.id}`}</strong>
                          {dc.username && <span style={{ display: 'block', fontSize: '11px', color: 'var(--primary)' }}>@{dc.username}</span>}
                        </td>
                        <td>{dc.phone || '-'}</td>
                        <td><span className="badge badge-source">{dc.createdBy || '-'}</span></td>
                        <td style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          {dc.deletedAt ? new Date(dc.deletedAt).toLocaleString('th-TH') : '-'}
                        </td>
                        <td>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            background: remainingDays <= 5 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: remainingDays <= 5 ? '#ef4444' : '#fbbf24',
                            fontWeight: 700
                          }}>
                            ⏳ {lang === 'TH' ? `เหลือ ${remainingDays} วัน` : `${remainingDays}d left`}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px' }}>
                          <span style={{ color: '#f59e0b', fontWeight: 600 }}>{dc.deletedBy || 'Supervisor'}</span>
                        </td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => handleRestoreCustomer(dc)}
                            style={{
                              padding: '5px 12px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              background: '#10b981',
                              marginRight: '8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            <RotateCcw style={{ width: '12px', height: '12px' }} />
                            <span>{lang === 'TH' ? 'กู้คืน' : 'Restore'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePermanentDeleteCustomer(dc.id, dc.fullName || dc.username || dc.id)}
                            style={{
                              border: 'none',
                              background: 'rgba(239, 68, 68, 0.12)',
                              color: '#ef4444',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 style={{ width: '12px', height: '12px' }} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { RecycleBinView };
