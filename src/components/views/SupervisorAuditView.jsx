import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import MonthlyHeatmap from '../subcomponents/MonthlyHeatmap';
import { formatKeyedDateTime } from '../../utils/dateFormatters';
import { formatChannelDisplayName, isOverdue3Days } from '../../utils/customerFormatters';
import { 
  ShieldAlert, 
  Calendar, 
  Search, 
  X, 
  Copy, 
  User, 
  ChevronRight 
} from 'lucide-react';

export default function SupervisorAuditView() {
  const {
    customers,
    agents,
    activeAgent,
    activeAgentName,
    isSupervisor,
    lang,
    theme,
    selectedMonth,
    setSelectedMonth,
    daysInMonth,
    setSelectedCustForModal,
    setViewMode
  } = useApp();

  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [lineLekFilter, setLineLekFilter] = useState('ALL');
  const [auditAgentFilter, setAuditAgentFilter] = useState('ทั้งหมด');

  // Permission gate
  const canAudit = isSupervisor || 
                   activeAgent?.username === 'ROOT_ADMIN' || 
                   activeAgent?.permissions?.canAudit;

  // Generate months list
  const monthsList = useMemo(() => {
    const monthsSet = new Set();
    const now = new Date();
    // Include current and past 12 months
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      monthsSet.add(`${y}-${m}`);
    }
    // Also include months present in customers
    customers.forEach(c => {
      if (c.createdAt) {
        const dStr = c.createdAt.slice(0, 7);
        if (dStr && dStr.length === 7) monthsSet.add(dStr);
      }
      if (c.history) {
        Object.keys(c.history).forEach(k => {
          if (k.length === 7) monthsSet.add(k);
        });
      }
    });
    const sorted = Array.from(monthsSet).sort().reverse();
    return ['ALL', ...sorted];
  }, [customers]);

  // Base customer list (non-deleted)
  const nonDeletedCustomers = useMemo(() => {
    return customers.filter(c => !c.deletedAt);
  }, [customers]);

  // Filtered by agent and month
  const filteredCustomers = useMemo(() => {
    return nonDeletedCustomers.filter(c => {
      // Agent filter
      if (auditAgentFilter !== 'ทั้งหมด' && c.createdBy !== auditAgentFilter) {
        return false;
      }
      // Month filter
      if (selectedMonth !== 'ALL' && selectedMonth) {
        const custMonth = c.createdAt ? c.createdAt.slice(0, 7) : '';
        const hasHistoryInMonth = c.history && c.history[selectedMonth];
        if (custMonth !== selectedMonth && !hasHistoryInMonth) {
          // If customer was created in another month and has no history in this month, check if created before
          if (custMonth > selectedMonth) return false;
        }
      }
      return true;
    });
  }, [nonDeletedCustomers, auditAgentFilter, selectedMonth]);

  // Displayed customers with search and Line Lek filter
  const displayedAuditCustomers = useMemo(() => {
    return filteredCustomers.filter(c => {
      // Line Lek filter
      if (lineLekFilter === 'HAS') {
        const has = c.lineLek === 'มี' || c.lineLek === 'มีไลน์เล็ก' || (c.lineLek && c.lineLek !== 'ไม่มี' && c.lineLek !== 'ไม่มีไลน์เล็ก' && c.lineLek !== 'รอแอด' && c.lineLek !== 'รอแอดไลน์เล็ก');
        if (!has) return false;
      } else if (lineLekFilter === 'WAITING') {
        const waiting = !c.lineLek || c.lineLek === 'รอแอด' || c.lineLek === 'รอแอดไลน์เล็ก';
        if (!waiting) return false;
      } else if (lineLekFilter === 'NONE') {
        const none = c.lineLek === 'ไม่มี' || c.lineLek === 'ไม่มีไลน์เล็ก';
        if (!none) return false;
      }

      // Search query
      if (auditSearchQuery.trim()) {
        const q = auditSearchQuery.trim().toLowerCase();
        const matchName = (c.fullName || '').toLowerCase().includes(q);
        const matchUser = (c.username || '').toLowerCase().includes(q);
        const matchPhone = (c.phone || '').toLowerCase().includes(q);
        const matchLine = (c.lineOA || '').toLowerCase().includes(q);
        const matchOwner = (c.createdBy || '').toLowerCase().includes(q);
        if (!matchName && !matchUser && !matchPhone && !matchLine && !matchOwner) {
          return false;
        }
      }

      return true;
    });
  }, [filteredCustomers, lineLekFilter, auditSearchQuery]);

  // Calculate totals for footer
  const { totalAccumulatedDeposit, totalFirstDeposit, totalDeposited } = useMemo(() => {
    let accumulated = 0;
    let first = 0;
    let depCount = 0;
    filteredCustomers.forEach(c => {
      accumulated += Number(c.totalDeposit || 0);
      first += Number(c.returnedDepositAmount || c.totalDeposit || 0);
      if (c.hasDeposited) depCount++;
    });
    return {
      totalAccumulatedDeposit: accumulated,
      totalFirstDeposit: first,
      totalDeposited: depCount
    };
  }, [filteredCustomers]);

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    alert(lang === 'TH' ? `คัดลอก ${label}: ${text} สำเร็จ!` : `Copied ${label}: ${text}!`);
  };

  if (!canAudit) {
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
            <>บัญชีของคุณ [<strong>{activeAgent?.name || activeAgentName}</strong>] ยังไม่ได้รับอนุมัติสิทธิ์ในการเข้าถึงหน้าตรวจสอบงานรายวัน กรุณาติดต่อหัวหน้า (Supervisor) เพื่อเปิดสิทธิ์การเข้าถึง "🛡️ ตรวจสอบงาน (Audit)"</>
          ) : (
            <>Your account [<strong>{activeAgent?.name || activeAgentName}</strong>] does not have permission to access the Daily Audit dashboard. Please contact a Supervisor to grant "🛡️ Daily Audit" permissions.</>
          )}
        </p>
        <button 
          className="btn btn-secondary"
          onClick={() => setViewMode('agent')}
          style={{ padding: '10px 20px', fontSize: '12px' }}
        >
          {lang === 'TH' ? 'กลับไปที่โต๊ะติดตามลูกค้า (MC Agent)' : 'Back to Follow-Up Table (MC Agent)'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Month Selector Bar */}
      <div id="tour-audit-panel" className="panel" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', padding: '12px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '8px 10px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)', display: 'flex', alignItems: 'center' }}>
            <Calendar style={{ width: '18px', height: '18px' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: theme === 'light' ? '#1e293b' : '#f1f5f9' }}>
              {lang === 'TH' ? 'เลือกรอบเดือน:' : 'Campaign Month:'}
            </span>
            <select 
              className="select-input" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ 
                minWidth: '220px', 
                padding: '7px 14px', 
                fontSize: '13px', 
                fontWeight: 700, 
                borderRadius: '10px',
                borderColor: 'rgba(168, 85, 247, 0.4)',
                color: '#c084fc',
                background: theme === 'light' ? '#fff' : 'rgba(15, 23, 42, 0.7)'
              }}
            >
              {monthsList.map(m => {
                if (m === 'ALL') return <option key="ALL" value="ALL">{lang === 'TH' ? '📅 ดูย้อนหลังทั้งหมด (ทุกรอบเดือน)' : '📅 All-Time History (All Months)'}</option>;
                const [yr, mn] = m.split('-');
                const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
                const enMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                const mIdx = Math.max(0, Math.min(11, parseInt(mn, 10) - 1));
                const mLabel = lang === 'TH' ? `${thaiMonths[mIdx]} ${parseInt(yr) + 543}` : `${enMonths[mIdx]} ${yr}`;
                return (
                  <option key={m} value={m}>{mLabel}</option>
                );
              })}
            </select>
          </div>
        </div>

        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {(() => {
            if (selectedMonth === 'ALL' || !selectedMonth.includes('-')) return lang === 'TH' ? '📅 ข้อมูลสะสมทั้งหมดทุกรอบเดือน' : '📅 All-Time Accumulated Data';
            const [yr, mn] = selectedMonth.split('-');
            const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
            const enMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const mIdx = Math.max(0, Math.min(11, parseInt(mn, 10) - 1));
            return lang === 'TH'
              ? `📅 รอบการตาม: วันที่ 1 - ${daysInMonth} ${thaiMonths[mIdx]} ${parseInt(yr) + 543}`
              : `📅 Campaign Period: Day 1 - ${daysInMonth} ${enMonths[mIdx]} ${yr}`;
          })()}
        </div>
      </div>

      {/* Audit Table Panel */}
      <div className="panel">
        {/* Search & Info Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', paddingBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 260px', maxWidth: '420px', position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              value={auditSearchQuery} 
              onChange={(e) => setAuditSearchQuery(e.target.value)} 
              placeholder={lang === 'TH' ? 'ค้นหาชื่อลูกค้า, Username, เบอร์โทร, LINE ID หรือผู้ดูแล...' : 'Search customer name, username, phone, LINE ID or owner...'} 
              className="select-input" 
              style={{ width: '100%', paddingLeft: '36px', paddingRight: auditSearchQuery ? '32px' : '12px', fontSize: '12px' }} 
            />
            {auditSearchQuery && (
              <button 
                onClick={() => setAuditSearchQuery('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X style={{ width: '14px', height: '14px' }} />
              </button>
            )}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
            {lang === 'TH' ? 'แสดงผล' : 'Showing'} <strong style={{ color: '#c084fc' }}>{displayedAuditCustomers.length}</strong> {lang === 'TH' ? 'จากทั้งหมด' : 'of'} <strong style={{ color: theme === 'light' ? '#0f172a' : '#fff' }}>{filteredCustomers.length}</strong> {lang === 'TH' ? 'รายการ' : 'records'}
          </div>
        </div>

        {/* Line Lek Status Filter Row */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', margin: '12px 0 4px 0' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>💬 {lang === 'TH' ? 'กรองสถานะไลน์เล็ก:' : 'LINE Status:'}</span>
          <button 
            className={`btn ${lineLekFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ padding: '4px 10px', fontSize: '11px' }} 
            onClick={() => setLineLekFilter('ALL')}
          >
            {lang === 'TH' ? 'ทั้งหมด' : 'All'} ({filteredCustomers.length})
          </button>
          <button 
            className={`btn ${lineLekFilter === 'HAS' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ padding: '4px 10px', fontSize: '11px', color: lineLekFilter === 'HAS' ? '#fff' : '#34d399' }} 
            onClick={() => setLineLekFilter(lineLekFilter === 'HAS' ? 'ALL' : 'HAS')}
          >
            {lang === 'TH' ? '🟢 มีไลน์' : '🟢 Has LINE'} ({filteredCustomers.filter(c => c.lineLek === 'มี' || c.lineLek === 'มีไลน์เล็ก' || (c.lineLek && c.lineLek !== 'ไม่มี' && c.lineLek !== 'ไม่มีไลน์เล็ก' && c.lineLek !== 'รอแอด' && c.lineLek !== 'รอแอดไลน์เล็ก')).length})
          </button>
          <button 
            className={`btn ${lineLekFilter === 'WAITING' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ padding: '4px 10px', fontSize: '11px', color: lineLekFilter === 'WAITING' ? '#fff' : '#fbbf24' }} 
            onClick={() => setLineLekFilter(lineLekFilter === 'WAITING' ? 'ALL' : 'WAITING')}
          >
            {lang === 'TH' ? '🟡 รอแอด' : '🟡 Pending Add'} ({filteredCustomers.filter(c => !c.lineLek || c.lineLek === 'รอแอด' || c.lineLek === 'รอแอดไลน์เล็ก').length})
          </button>
          <button 
            className={`btn ${lineLekFilter === 'NONE' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ padding: '4px 10px', fontSize: '11px', color: lineLekFilter === 'NONE' ? '#fff' : '#f43f5e' }} 
            onClick={() => setLineLekFilter(lineLekFilter === 'NONE' ? 'ALL' : 'NONE')}
          >
            {lang === 'TH' ? '🔴 ไม่มีไลน์' : '🔴 No LINE'} ({filteredCustomers.filter(c => c.lineLek === 'ไม่มี' || c.lineLek === 'ไม่มีไลน์เล็ก').length})
          </button>
        </div>

        {/* Follow-Up Status Legend */}
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', margin: '10px 0 6px 0', padding: '6px 12px', background: theme === 'light' ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.06)', fontSize: '11px' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{lang === 'TH' ? 'สถานะการตาม:' : 'Follow-up Status:'}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#10b981', fontWeight: 700 }}>
            <span style={{ width: '13px', height: '13px', borderRadius: '3px', background: '#10b981', display: 'inline-block' }}></span> {lang === 'TH' ? 'วันนี้ตามแล้ว' : 'Followed up today'}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: theme === 'light' ? '#7c3aed' : '#c084fc', fontWeight: 700 }}>
            <span style={{ width: '13px', height: '13px', borderRadius: '3px', border: '2px solid #8b5cf6', background: 'transparent', display: 'inline-block', boxSizing: 'border-box' }}></span> {lang === 'TH' ? 'วันนี้ยังไม่ตาม' : 'Pending today'}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: theme === 'light' ? '#7c3aed' : '#c084fc', fontWeight: 600 }}>
            <span style={{ width: '13px', height: '13px', borderRadius: '3px', background: theme === 'light' ? '#f3e8ff' : 'rgba(168, 85, 247, 0.25)', border: '1px solid #d8b4fe', display: 'inline-block', boxSizing: 'border-box' }}></span> {lang === 'TH' ? 'วันที่ผ่านมาตามแล้ว' : 'Past followed up'}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)' }}>
            <span style={{ width: '13px', height: '13px', borderRadius: '3px', background: theme === 'light' ? '#f1f5f9' : 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'inline-block', boxSizing: 'border-box' }}></span> {lang === 'TH' ? 'ไม่ได้ตาม' : 'Not followed up'}
          </span>
        </div>

        <div className="table-wrapper" style={{ marginTop: '6px' }}>
          <table>
            <thead>
              <tr>
                <th>{lang === 'TH' ? 'ชื่อ-นามสกุล / ยูสเซอร์เนม' : 'Customer / Username'}</th>
                <th>{lang === 'TH' ? 'ข้อมูลการติดต่อ' : 'Contact Info'}</th>
                <th>{lang === 'TH' ? 'ช่องทาง' : 'Channel'}</th>
                <th>{lang === 'TH' ? 'ผู้ดูแล (Owner)' : 'Owner'}</th>
                <th style={{ textAlign: 'center' }}>{lang === 'TH' ? 'การตามลูกค้า' : 'Follow-up Activity'}</th>
                <th style={{ textAlign: 'right' }}>{lang === 'TH' ? 'เงินฝากสะสม' : 'Total Deposits'}</th>
                <th style={{ textAlign: 'center' }}>{lang === 'TH' ? 'สถานะธุรกรรม' : 'Transaction Status'}</th>
                <th style={{ textAlign: 'center' }}>{lang === 'TH' ? 'การจัดการ' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {displayedAuditCustomers.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    {lang === 'TH' ? 'ไม่พบข้อมูลลูกค้าตรงตามเงื่อนไขการค้นหา' : 'No customers found matching search criteria'}
                  </td>
                </tr>
              ) : (
                displayedAuditCustomers.map(cust => (
                  <tr key={cust.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <strong style={{ color: theme === 'light' ? '#0f172a' : '#ffffff', fontSize: '13px' }}>{cust.fullName || '-'}</strong>
                        <span style={{ fontSize: '11px', color: cust.username ? 'var(--text-muted)' : '#fbbf24' }}>
                          {cust.username ? (lang === 'TH' ? `ยูส: ${cust.username}` : `User: ${cust.username}`) : (lang === 'TH' ? '(ยังไม่สมัคร)' : '(Not registered)')}
                        </span>
                        {cust.createdAt && (
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            📅 {formatKeyedDateTime(cust.createdAt)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px' }}>
                        {cust.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>📞 {cust.phone}</span>
                            <button 
                              onClick={() => copyToClipboard(cust.phone, 'เบอร์โทร')}
                              style={{ border: 'none', background: 'transparent', color: '#c084fc', cursor: 'pointer', padding: 0 }}
                              title={lang === 'TH' ? 'คัดลอกเบอร์โทร' : 'Copy phone'}
                            >
                              <Copy style={{ width: '12px', height: '12px' }} />
                            </button>
                          </div>
                        )}
                        {cust.lineOA && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399' }}>
                            <span>💬 {cust.lineOA}</span>
                            <button 
                              onClick={() => copyToClipboard(cust.lineOA, 'LINE ID')}
                              style={{ border: 'none', background: 'transparent', color: '#34d399', cursor: 'pointer', padding: 0 }}
                              title={lang === 'TH' ? 'คัดลอก LINE' : 'Copy LINE OA'}
                            >
                              <Copy style={{ width: '12px', height: '12px' }} />
                            </button>
                          </div>
                        )}
                        <div>
                          {cust.lineLek === 'มี' || cust.lineLek === 'มีไลน์เล็ก' ? (
                            <span style={{ fontSize: '9.5px', fontWeight: 700, padding: '1px 6px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                              {lang === 'TH' ? '🟢 มีไลน์เล็ก' : '🟢 Has LINE OA'}
                            </span>
                          ) : cust.lineLek === 'ไม่มี' || cust.lineLek === 'ไม่มีไลน์เล็ก' ? (
                            <span style={{ fontSize: '9.5px', fontWeight: 700, padding: '1px 6px', borderRadius: '6px', background: 'rgba(100, 116, 139, 0.2)', color: '#94a3b8', border: '1px solid rgba(100, 116, 139, 0.3)' }}>
                              {lang === 'TH' ? '⚪ ไม่มีไลน์เล็ก' : '⚪ No LINE OA'}
                            </span>
                          ) : (
                            <span style={{ fontSize: '9.5px', fontWeight: 700, padding: '1px 6px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                              {lang === 'TH' ? '🟡 รอแอดไลน์เล็ก' : '🟡 Waiting Add LINE'}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
                        {formatChannelDisplayName(cust.sourceChannel || 'facebook', lang)}
                      </span>
                    </td>
                    <td>
                      {cust.createdBy ? (
                        <span className="badge badge-owner">
                          <User style={{ width: '13px', height: '13px', flexShrink: 0 }} />
                          <span>{cust.createdBy}</span>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>-</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <MonthlyHeatmap customer={cust} />
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: theme === 'light' ? '#0f172a' : '#ffffff', fontSize: '13px' }}>
                      ฿{(cust.totalDeposit || 0).toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {cust.hasDeposited ? (
                        <span className="badge badge-saved">
                          {lang === 'TH' ? `🟢 ฝากแล้ว (฿${(cust.returnedDepositAmount || cust.totalDeposit || 0).toLocaleString()})` : `🟢 Deposited (฿${(cust.returnedDepositAmount || cust.totalDeposit || 0).toLocaleString()})`}
                        </span>
                      ) : (
                        <span className="badge badge-pending">{lang === 'TH' ? '🔴 ค้างฝาก' : '🔴 Pending'}</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => setSelectedCustForModal(cust)}
                      >
                        {lang === 'TH' ? 'แก้ไข / โน้ต' : 'Edit / Notes'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredCustomers.length > 0 && (
              <tfoot>
                <tr style={{
                  background: theme === 'light' ? '#f8fafc' : 'rgba(30, 41, 59, 0.8)',
                  borderTop: '2px solid var(--border-color)',
                  fontWeight: 700,
                  fontSize: '12.5px'
                }}>
                  <td colSpan="5" style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--text-muted)' }}>
                    <span>{lang === 'TH' ? 'ยอดรวมเงินฝากสะสมทุกแถวในตาราง:' : 'Grand Total of All Rows:'}</span>
                    <strong style={{ marginLeft: '6px', color: theme === 'light' ? '#0f172a' : '#ffffff' }}>
                      {filteredCustomers.length} {lang === 'TH' ? 'คน' : 'leads'}
                    </strong>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 900, color: '#10b981', fontSize: '13.5px', padding: '12px 14px' }}>
                    ฿{totalAccumulatedDeposit.toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'center', padding: '10px 6px' }}>
                    <div style={{ color: '#10b981', fontSize: '13px', fontWeight: 900 }}>
                      ฿{totalFirstDeposit.toLocaleString()}
                    </div>
                    <span className="badge badge-saved" style={{ padding: '2px 6px', fontSize: '10px', marginTop: '2px', display: 'inline-block' }}>
                      {lang === 'TH' ? `🟢 ฝากแล้ว ${totalDeposited}` : `🟢 ${totalDeposited} Dep`}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px 6px' }}>
                    {filteredCustomers.length - totalDeposited > 0 && (
                      <span className="badge badge-pending" style={{ padding: '3px 6px', fontSize: '10.5px' }}>
                        {lang === 'TH' ? `🔴 รอฝาก ${filteredCustomers.length - totalDeposited}` : `🔴 ${filteredCustomers.length - totalDeposited} Pending`}
                      </span>
                    )}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

export { SupervisorAuditView };
