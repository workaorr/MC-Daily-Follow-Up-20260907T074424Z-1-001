import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { DaysGrid } from './DaysGrid';
import { QUICK_REMARK_PRESETS } from '../../constants/presets';
import { formatChannelDisplayName, isOverdue3Days } from '../../utils/customerFormatters';
import { getCurrentMonthStr } from '../../utils/dateFormatters';
import { pushCustomerToCloud } from '../../services/supabase';
import { SearchInput } from '../../components/common';
import { 
  ClipboardList, 
  User, 
  Copy, 
  Edit, 
  Check, 
  X, 
  Calendar, 
  AlertCircle 
} from 'lucide-react';

export default function FollowUpView() {
  const {
    customers,
    setCustomers,
    agents,
    activeAgent,
    activeAgentName,
    isSupervisor,
    selectedMonth,
    daysInMonth,
    lang,
    theme,
    setSelectedCustForModal,
    supabaseClient,
    writeLog
  } = useApp();

  const currentMonthStr = getCurrentMonthStr();
  const targetMonth = selectedMonth === 'ALL' ? currentMonthStr : selectedMonth;

  // View state filters
  const [supervisorFollowUpFilter, setSupervisorFollowUpFilter] = useState('ทั้งหมด');
  const [pastMonthSpecificFilter, setPastMonthSpecificFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [quickNotDepSubFilter, setQuickNotDepSubFilter] = useState('ALL');
  const [lineLekFilter, setLineLekFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Inline Quick Remark state
  const [quickEditCustId, setQuickEditCustId] = useState(null);
  const [quickNoteText, setQuickNoteText] = useState('');

  const effectiveFollowUpAgent = isSupervisor ? supervisorFollowUpFilter : activeAgentName;
  const isDepositedAsOfDate = (c) => Boolean(c.hasDeposited);

  // Non-deleted customers
  const nonDeletedCustomers = useMemo(() => {
    return customers.filter(c => !c.deletedAt);
  }, [customers]);

  // Filtered by agent
  const agentCusts = useMemo(() => {
    return nonDeletedCustomers.filter(c => {
      if (effectiveFollowUpAgent === 'ทั้งหมด') return true;
      return c.createdBy === effectiveFollowUpAgent;
    });
  }, [nonDeletedCustomers, effectiveFollowUpAgent]);

  // Counts for current and past months
  const isPastMonth = (c) => Boolean(c.campaignMonth && c.campaignMonth < targetMonth);
  const isCurrentMonth = (c) => Boolean(!c.campaignMonth || c.campaignMonth >= targetMonth);

  const cAll = agentCusts.length;
  const cCurrentOnly = agentCusts.filter(isCurrentMonth).length;

  const pastMonthsList = useMemo(() => {
    return Array.from(new Set(agentCusts.filter(isPastMonth).map(c => c.campaignMonth))).filter(Boolean).sort().reverse();
  }, [agentCusts, targetMonth]);

  // Line lek status helper
  const getLineLekStatus = (lineLek) => {
    const val = (lineLek || '').trim();
    if (!val || val === 'รอแอด' || val === 'รอแอดไลน์เล็ก') return 'WAITING';
    if (val === 'ไม่มี' || val === 'ไม่มีไลน์เล็ก') return 'NONE';
    return 'HAS';
  };

  const cLineAll = agentCusts.length;
  const cLineHas = agentCusts.filter(c => getLineLekStatus(c.lineLek) === 'HAS').length;
  const cLineWaiting = agentCusts.filter(c => getLineLekStatus(c.lineLek) === 'WAITING').length;
  const cLineNone = agentCusts.filter(c => getLineLekStatus(c.lineLek) === 'NONE').length;

  // Scope customers by month
  const scopeCusts = useMemo(() => {
    return agentCusts.filter(c => {
      if (pastMonthSpecificFilter === 'CURRENT') return isCurrentMonth(c);
      if (pastMonthSpecificFilter === 'PAST_ALL') return isPastMonth(c);
      if (pastMonthSpecificFilter && pastMonthSpecificFilter !== 'ALL') return c.campaignMonth === pastMonthSpecificFilter;
      return true;
    });
  }, [agentCusts, pastMonthSpecificFilter, targetMonth]);

  const cScopeAll = scopeCusts.length;
  const cScopeUnconv = scopeCusts.filter(c => !isDepositedAsOfDate(c)).length;
  const cScopeNotReg = scopeCusts.filter(c => !c.username || c.username.trim() === '').length;
  const cScopeReg = scopeCusts.filter(c => c.username && c.username.trim() !== '').length;
  const cScopeDep = scopeCusts.filter(c => c.username && c.username.trim() !== '' && isDepositedAsOfDate(c)).length;
  const cScopeNotDep = scopeCusts.filter(c => c.username && c.username.trim() !== '' && !isDepositedAsOfDate(c)).length;

  // Sub-counts for "สมัครไม่ฝาก"
  const notDepScopeCusts = useMemo(() => {
    return scopeCusts.filter(c => c.username && c.username.trim() !== '' && !isDepositedAsOfDate(c));
  }, [scopeCusts]);

  const cNotDepTotal = notDepScopeCusts.length;
  const cNotDepHasLine = notDepScopeCusts.filter(c => getLineLekStatus(c.lineLek) === 'HAS').length;
  const cNotDepWaiting = notDepScopeCusts.filter(c => getLineLekStatus(c.lineLek) === 'WAITING').length;
  const cNotDepOverdue = notDepScopeCusts.filter(c => isOverdue3Days(c, selectedMonth)).length;
  const cNotDepCurrentMonth = notDepScopeCusts.filter(c => isCurrentMonth(c)).length;

  // Final displayed list
  const displayList = useMemo(() => {
    return scopeCusts.filter(c => {
      const hasUser = Boolean(c.username && c.username.trim() !== '');
      const isDep = isDepositedAsOfDate(c);

      // Status Filters
      if (['UNCONVERTED', 'PAST_UNCONVERTED'].includes(statusFilter) && isDep) return false;
      if (['NOT_REGISTERED', 'PAST_NOT_REGISTERED'].includes(statusFilter) && hasUser) return false;
      if (statusFilter === 'REGISTERED' && !hasUser) return false;
      if (statusFilter === 'DEPOSITED' && (!hasUser || !isDep)) return false;
      if (['NOT_DEPOSITED', 'PAST_NOT_DEPOSITED'].includes(statusFilter) && (!hasUser || isDep)) return false;

      // Sub-filter for สมัครแต่ไม่ฝาก
      if (['NOT_DEPOSITED', 'PAST_NOT_DEPOSITED'].includes(statusFilter) && quickNotDepSubFilter !== 'ALL') {
        const lineSt = getLineLekStatus(c.lineLek);
        if (quickNotDepSubFilter === 'HAS_LINE' && lineSt !== 'HAS') return false;
        if (quickNotDepSubFilter === 'WAITING_LINE' && lineSt !== 'WAITING') return false;
        if (quickNotDepSubFilter === 'OVERDUE_3D' && !isOverdue3Days(c, selectedMonth)) return false;
        if (quickNotDepSubFilter === 'CURRENT_MONTH' && !isCurrentMonth(c)) return false;
      }

      // Line Lek Filter
      if (lineLekFilter && lineLekFilter !== 'ALL' && lineLekFilter !== 'ทั้งหมด') {
        const st = getLineLekStatus(c.lineLek);
        if (lineLekFilter !== st && lineLekFilter !== (st === 'HAS' ? 'มี' : st === 'WAITING' ? 'รอแอด' : 'ไม่มี')) return false;
      }

      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = (c.fullName || '').toLowerCase().includes(q);
        const matchUser = (c.username || '').toLowerCase().includes(q);
        const matchPhone = (c.phone || '').toLowerCase().includes(q);
        const matchLine = (c.lineOA || '').toLowerCase().includes(q);
        const matchOwner = (c.createdBy || '').toLowerCase().includes(q);
        if (!matchName && !matchUser && !matchPhone && !matchLine && !matchOwner) return false;
      }

      return true;
    });
  }, [scopeCusts, statusFilter, quickNotDepSubFilter, lineLekFilter, searchQuery, selectedMonth]);

  // Aggregate totals
  const displayTotalDeposit = displayList.reduce((sum, c) => sum + (parseFloat(c.totalDeposit || 0)), 0);
  const displayTotalCheckedDeposit = displayList.reduce((sum, c) => {
    if (!isDepositedAsOfDate(c)) return sum;
    const amt = parseFloat(c.returnedDepositAmount || 0) > 0 ? parseFloat(c.returnedDepositAmount) : parseFloat(c.totalDeposit || 0);
    return sum + amt;
  }, 0);
  const displayDepositedCount = displayList.filter(c => isDepositedAsOfDate(c)).length;
  const displayUnconvertedCount = displayList.length - displayDepositedCount;

  // Toggle Day Follow-up checkbox
  const handleToggleDay = (customerId, dayNum) => {
    const updated = customers.map(c => {
      if (c.id !== customerId) return c;
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const activeMonth = (pastMonthSpecificFilter && pastMonthSpecificFilter !== 'ALL' && pastMonthSpecificFilter !== 'CURRENT')
        ? pastMonthSpecificFilter
        : (c.campaignMonth || currentMonth);

      const monthMap = { ...((c.followUpByMonth && c.followUpByMonth[activeMonth]) || c.followUp || {}) };
      const currentVal = Boolean(monthMap[dayNum]);
      monthMap[dayNum] = !currentVal;

      const newFollowUpByMonth = {
        ...(c.followUpByMonth || {}),
        [activeMonth]: monthMap
      };

      const updatedCust = {
        ...c,
        followUp: activeMonth === currentMonth ? monthMap : c.followUp,
        followUpByMonth: newFollowUpByMonth,
        updatedBy: activeAgentName || 'MC Agent',
        updatedAt: new Date().toISOString()
      };

      if (supabaseClient) {
        pushCustomerToCloud(supabaseClient, updatedCust);
      }

      writeLog('FOLLOW_UP', `ติ๊กสถานะติดตามลูกค้า [${c.username || c.fullName}]: วันที่ ${dayNum} -> ${!currentVal ? '✅ ทักแล้ว' : '❌ ยกเลิก'}`, 'info', activeAgentName);
      return updatedCust;
    });

    setCustomers(updated);
  };

  // Quick LINE status change
  const handleQuickLineStatusChange = (customerId, newStatus) => {
    const updated = customers.map(c => {
      if (c.id !== customerId) return c;
      const updatedCust = {
        ...c,
        lineLek: newStatus,
        updatedBy: activeAgentName || 'MC Agent',
        updatedAt: new Date().toISOString()
      };

      if (supabaseClient) {
        pushCustomerToCloud(supabaseClient, updatedCust);
      }

      writeLog('CUSTOMER_UPDATE', `เปลี่ยนสถานะไลน์เล็ก [${c.username || c.fullName}]: ${c.lineLek || 'รอแอด'} -> ${newStatus}`, 'info', activeAgentName);
      return updatedCust;
    });

    setCustomers(updated);
  };

  // Quick note save
  const handleQuickNoteSave = (customerId, newNote) => {
    const trimmed = (newNote || '').trim();
    const updated = customers.map(c => {
      if (c.id !== customerId) return c;
      const updatedCust = {
        ...c,
        notes: trimmed,
        updatedBy: activeAgentName || 'MC Agent',
        updatedAt: new Date().toISOString()
      };

      if (supabaseClient) {
        pushCustomerToCloud(supabaseClient, updatedCust);
      }

      writeLog('CUSTOMER_UPDATE', `บันทึกโน้ตด่วน [${c.username || c.fullName}]: "${trimmed}"`, 'info', activeAgentName);
      return updatedCust;
    });

    setCustomers(updated);
    setQuickEditCustId(null);
    setQuickNoteText('');
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    alert(lang === 'TH' ? `คัดลอก ${label}: ${text} สำเร็จ!` : `Copied ${label}: ${text}!`);
  };

  return (
    <div className="panel" style={{ padding: 0 }}>
      {/* Sticky Top Controls & Filter Section */}
      <div className="agent-sticky-header-container">
        <div className="panel-header" style={{ padding: '18px 24px 8px 24px', borderBottom: 'none' }}>
          <h3 className="panel-title" style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ClipboardList style={{ color: 'var(--primary)' }} /> {lang === 'TH' ? 'ตารางความคืบหน้าการติดตามและจดบันทึกโน้ตของเจ้าหน้าที่' : 'Customer Follow-Up & Call Logging Sheet'}
          </h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isSupervisor ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{lang === 'TH' ? '👑 เลือกดูงานของเจ้าหน้าที่ (Supervisor):' : '👑 View Agent Work (Supervisor):'}</span>
                <select 
                  className="select-input"
                  value={supervisorFollowUpFilter}
                  onChange={(e) => setSupervisorFollowUpFilter(e.target.value)}
                >
                  <option value="ทั้งหมด">{lang === 'TH' ? 'พนักงานทั้งหมด (ดูรวม)' : 'All MC Agents (Overview)'}</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.name}>
                      {a.name}{a.isActive === false ? ' (พักงาน)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{lang === 'TH' ? 'เจ้าหน้าที่:' : 'Agent:'}</span>
                <span className="badge badge-owner" style={{ fontSize: '12px', fontWeight: 700, padding: '5px 12px' }}>
                  <User style={{ width: '13px', height: '13px' }} />
                  <span>{activeAgentName || 'MC Agent'} ({lang === 'TH' ? 'บัญชีของคุณ' : 'Your Account'})</span>
                </span>
              </div>
            )}
          </div>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 24px 10px 24px' }}>
          {effectiveFollowUpAgent === 'ทั้งหมด' ? (
            lang === 'TH'
              ? <>ระบบแสดงรายการลูกค้าทั้งหมดในพอร์ตทุกพนักงาน {pastMonthSpecificFilter === 'ALL' ? '(ข้อมูลรวมทุกรอบเดือน)' : pastMonthSpecificFilter === 'CURRENT' ? <>ประจำรอบเดือน <strong>{selectedMonth}</strong></> : <>ประจำรอบเดือน <strong>{pastMonthSpecificFilter}</strong></>}</>
              : <>Showing all portfolio customer records across all agents {pastMonthSpecificFilter === 'ALL' ? '(All Months Data)' : pastMonthSpecificFilter === 'CURRENT' ? <>for month <strong>{selectedMonth}</strong></> : <>for month <strong>{pastMonthSpecificFilter}</strong></>}</>
          ) : (
            lang === 'TH'
              ? <>ระบบกรองเฉพาะลูกค้าในพอร์ตความรับผิดชอบของ <strong>{effectiveFollowUpAgent}</strong> {pastMonthSpecificFilter === 'ALL' ? '(ข้อมูลรวมทุกรอบเดือน)' : pastMonthSpecificFilter === 'CURRENT' ? <>ประจำรอบเดือน <strong>{selectedMonth}</strong></> : <>ประจำรอบเดือน <strong>{pastMonthSpecificFilter}</strong></>} พนักงานสามารถติ๊กเช็กงานทักแชทติดตามรายวันและจดโน้ตได้ทันทีครับ</>
              : <>Filtered customers assigned to <strong>{effectiveFollowUpAgent}</strong> {pastMonthSpecificFilter === 'ALL' ? '(All Months Data)' : pastMonthSpecificFilter === 'CURRENT' ? <>for month <strong>{selectedMonth}</strong></> : <>for month <strong>{pastMonthSpecificFilter}</strong></>}.</>
          )}
        </p>

        {/* Filter Card */}
        <div style={{ margin: '0 24px 14px 24px' }}>
          <div id="tour-filter-card" className="filter-card-box">
            {/* Row 1: Month Dropdown + Status Buttons */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: theme === 'light' ? '#334155' : '#e2e8f0', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                  📅 {lang === 'TH' ? 'เลือกรอบเดือน:' : 'Select Month:'}
                </span>
                <select
                  className="select-input"
                  style={{
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    height: '32px',
                    cursor: 'pointer',
                    minWidth: '220px',
                    borderColor: pastMonthSpecificFilter !== 'ALL' ? 'var(--primary)' : (theme === 'light' ? '#cbd5e1' : 'rgba(255,255,255,0.15)'),
                    background: pastMonthSpecificFilter !== 'ALL' 
                      ? (theme === 'light' ? '#f5f3ff' : 'rgba(124, 58, 237, 0.15)') 
                      : (theme === 'light' ? '#ffffff' : 'rgba(15, 23, 42, 0.8)'),
                    color: pastMonthSpecificFilter !== 'ALL' ? 'var(--primary)' : 'inherit'
                  }}
                  value={pastMonthSpecificFilter}
                  onChange={(e) => setPastMonthSpecificFilter(e.target.value)}
                >
                  <option value="ALL">{lang === 'TH' ? `🌐 ข้อมูลทุกรอบเดือน (${cAll} คน)` : `🌐 All Months Data (${cAll} leads)`}</option>
                  <option value="CURRENT">{lang === 'TH' ? `✨ เฉพาะเดือนปัจจุบัน (${cCurrentOnly} คน)` : `✨ Current Month Only (${cCurrentOnly} leads)`}</option>
                  {pastMonthsList.map(m => {
                    const countInMonth = agentCusts.filter(c => c.campaignMonth === m).length;
                    const unconvertedInMonth = agentCusts.filter(c => c.campaignMonth === m && !isDepositedAsOfDate(c)).length;
                    return (
                      <option key={m} value={m}>
                        📅 {m} - {countInMonth} {lang === 'TH' ? 'คน' : 'leads'} {unconvertedInMonth > 0 ? `(รอฝาก ${unconvertedInMonth})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div style={{ width: '1px', height: '22px', background: theme === 'light' ? '#e2e8f0' : 'rgba(255,255,255,0.12)' }}></div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>📌 {lang === 'TH' ? 'สถานะ:' : 'Status:'}</span>
                <button 
                  className={`filter-status-pill ${statusFilter === 'ALL' ? 'active' : ''}`} 
                  onClick={() => setStatusFilter('ALL')}
                >
                  {lang === 'TH' ? 'ทั้งหมด' : 'All'} ({cScopeAll})
                </button>
                <button 
                  className={`filter-status-pill ${['UNCONVERTED', 'PAST_UNCONVERTED'].includes(statusFilter) ? 'active' : ''}`} 
                  onClick={() => { setStatusFilter(['UNCONVERTED', 'PAST_UNCONVERTED'].includes(statusFilter) ? 'ALL' : 'UNCONVERTED'); setQuickNotDepSubFilter('ALL'); }}
                >
                  {lang === 'TH' ? `⏳ ไม่สมัครและไม่ฝาก (${cScopeUnconv})` : `⏳ Unconverted (${cScopeUnconv})`}
                </button>
                <button 
                  className={`filter-status-pill ${['NOT_REGISTERED', 'PAST_NOT_REGISTERED'].includes(statusFilter) ? 'active' : ''}`} 
                  onClick={() => { setStatusFilter(['NOT_REGISTERED', 'PAST_NOT_REGISTERED'].includes(statusFilter) ? 'ALL' : 'NOT_REGISTERED'); setQuickNotDepSubFilter('ALL'); }}
                >
                  {lang === 'TH' ? `🟠 ทักไม่สมัคร (${cScopeNotReg})` : `🟠 Inquired (Not Reg) (${cScopeNotReg})`}
                </button>
                <button 
                  className={`filter-status-pill ${statusFilter === 'REGISTERED' ? 'active' : ''}`} 
                  onClick={() => { setStatusFilter(statusFilter === 'REGISTERED' ? 'ALL' : 'REGISTERED'); setQuickNotDepSubFilter('ALL'); }}
                >
                  {lang === 'TH' ? `🔵 ทักสมัคร (${cScopeReg})` : `🔵 Registered (${cScopeReg})`}
                </button>
                <button 
                  className={`filter-status-pill ${statusFilter === 'DEPOSITED' ? 'active' : ''}`} 
                  onClick={() => { setStatusFilter(statusFilter === 'DEPOSITED' ? 'ALL' : 'DEPOSITED'); setQuickNotDepSubFilter('ALL'); }}
                >
                  {lang === 'TH' ? `🟢 สมัครและฝาก (${cScopeDep})` : `🟢 Reg & Deposited (${cScopeDep})`}
                </button>
                <button 
                  className={`filter-status-pill ${['NOT_DEPOSITED', 'PAST_NOT_DEPOSITED'].includes(statusFilter) ? 'active' : ''}`} 
                  onClick={() => {
                    if (['NOT_DEPOSITED', 'PAST_NOT_DEPOSITED'].includes(statusFilter)) {
                      setStatusFilter('ALL');
                      setQuickNotDepSubFilter('ALL');
                    } else {
                      setStatusFilter('NOT_DEPOSITED');
                      setQuickNotDepSubFilter('ALL');
                    }
                  }}
                >
                  {lang === 'TH' ? `🔴 สมัครไม่ฝาก (${cScopeNotDep})` : `🔴 Reg (No Deposit) (${cScopeNotDep})`}
                </button>
              </div>
            </div>

            {/* Dynamic Sub-pills for สมัครไม่ฝาก */}
            {['NOT_DEPOSITED', 'PAST_NOT_DEPOSITED'].includes(statusFilter) && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexWrap: 'wrap',
                padding: '8px 12px',
                marginTop: '8px',
                marginBottom: '4px',
                borderRadius: '8px',
                background: theme === 'light' ? 'rgba(244, 63, 94, 0.06)' : 'rgba(244, 63, 94, 0.12)',
                border: '1px dashed rgba(244, 63, 94, 0.35)'
              }}>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: theme === 'light' ? '#be123c' : '#fda4af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  🎯 {lang === 'TH' ? 'ตัวกรองย่อยสมัครไม่ฝาก:' : 'Sub-filters:'}
                </span>

                <button
                  type="button"
                  onClick={() => setQuickNotDepSubFilter('ALL')}
                  className={`btn ${quickNotDepSubFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '3px 9px', fontSize: '11px' }}
                >
                  🔴 {lang === 'TH' ? 'ทั้งหมด' : 'All'} ({cNotDepTotal})
                </button>

                <button
                  type="button"
                  onClick={() => setQuickNotDepSubFilter(quickNotDepSubFilter === 'HAS_LINE' ? 'ALL' : 'HAS_LINE')}
                  className={`btn ${quickNotDepSubFilter === 'HAS_LINE' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '3px 9px', fontSize: '11px', color: quickNotDepSubFilter === 'HAS_LINE' ? '#fff' : '#10b981' }}
                >
                  💬 {lang === 'TH' ? 'มีไลน์ (พร้อมทัก)' : 'Has LINE (Ready)'} ({cNotDepHasLine})
                </button>

                <button
                  type="button"
                  onClick={() => setQuickNotDepSubFilter(quickNotDepSubFilter === 'WAITING_LINE' ? 'ALL' : 'WAITING_LINE')}
                  className={`btn ${quickNotDepSubFilter === 'WAITING_LINE' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '3px 9px', fontSize: '11px', color: quickNotDepSubFilter === 'WAITING_LINE' ? '#fff' : '#f59e0b' }}
                >
                  🟡 {lang === 'TH' ? 'รอแอดไลน์' : 'Pending LINE'} ({cNotDepWaiting})
                </button>

                <button
                  type="button"
                  onClick={() => setQuickNotDepSubFilter(quickNotDepSubFilter === 'OVERDUE_3D' ? 'ALL' : 'OVERDUE_3D')}
                  className={`btn ${quickNotDepSubFilter === 'OVERDUE_3D' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '3px 9px', fontSize: '11px', color: quickNotDepSubFilter === 'OVERDUE_3D' ? '#fff' : '#ef4444' }}
                >
                  ⚠️ {lang === 'TH' ? 'ค้างตาม 3 วัน+' : 'Overdue 3d+'} ({cNotDepOverdue})
                </button>

                <button
                  type="button"
                  onClick={() => setQuickNotDepSubFilter(quickNotDepSubFilter === 'CURRENT_MONTH' ? 'ALL' : 'CURRENT_MONTH')}
                  className={`btn ${quickNotDepSubFilter === 'CURRENT_MONTH' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '3px 9px', fontSize: '11px', color: quickNotDepSubFilter === 'CURRENT_MONTH' ? '#fff' : '#8b5cf6' }}
                >
                  ✨ {lang === 'TH' ? 'ลูกค้าใหม่เดือนนี้' : 'New This Month'} ({cNotDepCurrentMonth})
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('ALL');
                    setQuickNotDepSubFilter('ALL');
                  }}
                  style={{
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    marginLeft: 'auto'
                  }}
                >
                  ✕ {lang === 'TH' ? 'ปิดตัวกรองย่อย' : 'Close'}
                </button>
              </div>
            )}

            {/* Row 2: Line Lek Status Filter */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', borderTop: theme === 'light' ? '1px solid #f1f5f9' : '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>💬 {lang === 'TH' ? 'กรองสถานะไลน์เล็ก:' : 'LINE Status:'}</span>
              <button className={`filter-status-pill ${lineLekFilter === 'ALL' ? 'active' : ''}`} onClick={() => setLineLekFilter('ALL')}>
                {lang === 'TH' ? 'ทั้งหมด' : 'All'} ({cLineAll})
              </button>
              <button className={`filter-status-pill ${lineLekFilter === 'HAS' ? 'active' : ''}`} onClick={() => setLineLekFilter(lineLekFilter === 'HAS' ? 'ALL' : 'HAS')}>
                {lang === 'TH' ? '🟢 มีไลน์' : '🟢 Has LINE'} ({cLineHas})
              </button>
              <button className={`filter-status-pill ${lineLekFilter === 'WAITING' ? 'active' : ''}`} onClick={() => setLineLekFilter(lineLekFilter === 'WAITING' ? 'ALL' : 'WAITING')}>
                {lang === 'TH' ? '🟡 รอแอด' : '🟡 Pending Add'} ({cLineWaiting})
              </button>
              <button className={`filter-status-pill ${lineLekFilter === 'NONE' ? 'active' : ''}`} onClick={() => setLineLekFilter(lineLekFilter === 'NONE' ? 'ALL' : 'NONE')}>
                {lang === 'TH' ? '🔴 ไม่มีไลน์' : '🔴 No LINE'} ({cLineNone})
              </button>

              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder={lang === 'TH' ? '🔍 ค้นหาชื่อ, ยูสเซอร์, เบอร์, LINE...' : '🔍 Search name, user, phone...'}
                  width="250px"
                />
              </div>
            </div>
          </div>

          {/* Summary Totals Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '10px 16px',
            marginTop: '10px',
            marginBottom: '10px',
            borderRadius: '10px',
            background: theme === 'light' ? '#f8fafc' : '#0f1a30',
            border: theme === 'light' ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
                {lang === 'TH' ? '📊 สรุปยอดรวมที่กรอง:' : '📊 Filter Summary:'}
              </span>
              <span style={{
                fontSize: '12px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '6px',
                background: theme === 'light' ? '#ffffff' : '#14203b',
                border: theme === 'light' ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.1)',
                color: theme === 'light' ? '#0f172a' : '#f8fafc'
              }}>
                👥 {lang === 'TH' ? 'ลูกค้าทั้งหมด' : 'Total Leads'}: <strong style={{ color: 'var(--primary)' }}>{displayList.length}</strong> {lang === 'TH' ? 'คน' : ''}
              </span>
              <span style={{
                fontSize: '12px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '6px',
                background: theme === 'light' ? '#ecfdf5' : 'rgba(16, 185, 129, 0.08)',
                border: theme === 'light' ? '1px solid #a7f3d0' : '1px solid rgba(16, 185, 129, 0.22)',
                color: theme === 'light' ? '#047857' : '#6ee7b7'
              }}>
                🟢 {lang === 'TH' ? 'ฝากแล้ว' : 'Deposited'}: <strong>{displayDepositedCount}</strong> {lang === 'TH' ? 'คน' : ''}
              </span>
              <span style={{
                fontSize: '12px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '6px',
                background: theme === 'light' ? '#fff1f2' : 'rgba(244, 63, 94, 0.08)',
                border: theme === 'light' ? '1px solid #fecdd3' : '1px solid rgba(244, 63, 94, 0.22)',
                color: theme === 'light' ? '#be123c' : '#fda4af'
              }}>
                🔴 {lang === 'TH' ? 'รอฝาก' : 'Pending'}: <strong>{displayUnconvertedCount}</strong> {lang === 'TH' ? 'คน' : ''}
              </span>
              {effectiveFollowUpAgent !== 'ทั้งหมด' && (
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--primary)', paddingLeft: '4px' }}>
                  ({lang === 'TH' ? `งานของ: ${effectiveFollowUpAgent}` : `Agent: ${effectiveFollowUpAgent}`})
                </span>
              )}
            </div>

            {/* Dual KPI Deposit Highlight Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '8px',
                background: theme === 'light' ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)'
              }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: theme === 'light' ? '#065f46' : '#6ee7b7' }}>
                  💰 {lang === 'TH' ? 'ยอดเงินสะสมรวม:' : 'Total Deposit:'}
                </span>
                <span style={{ fontSize: '14.5px', fontWeight: 900, color: '#10b981' }}>
                  ฿{displayTotalDeposit.toLocaleString()}
                </span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '8px',
                background: theme === 'light' ? '#f0fdf4' : 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.4)'
              }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: theme === 'light' ? '#166534' : '#86efac' }}>
                  🎯 {lang === 'TH' ? 'เช็กยอดธุรกรรมรวม (FTD):' : 'Checked (FTD):'}
                </span>
                <span style={{ fontSize: '14.5px', fontWeight: 900, color: '#22c55e' }}>
                  ฿{displayTotalCheckedDeposit.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrolling Table Section */}
      <div style={{ padding: '16px 24px 24px 24px' }}>
        <div className="table-wrapper">
          <table style={{ minWidth: '1050px', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '160px', minWidth: '150px', whiteSpace: 'nowrap' }}>{lang === 'TH' ? 'ชื่อลูกค้า / ยูสเซอร์เนม' : 'Customer / Username'}</th>
                <th style={{ width: '140px', minWidth: '130px', whiteSpace: 'nowrap' }}>{lang === 'TH' ? 'ข้อมูลการติดต่อ' : 'Contact Info'}</th>
                <th style={{ width: '90px', minWidth: '85px', textAlign: 'center', whiteSpace: 'nowrap' }}>{lang === 'TH' ? 'ช่องทางสมัคร' : 'Source Channel'}</th>
                <th style={{ width: '90px', minWidth: '85px', textAlign: 'center', whiteSpace: 'nowrap' }}>{lang === 'TH' ? 'ยอดเงินสะสม' : 'Total Deposits'}</th>
                <th style={{ width: '220px', minWidth: '215px', textAlign: 'center', whiteSpace: 'nowrap' }}>{lang === 'TH' ? 'การตามลูกค้า' : 'Follow-Up Actions'}</th>
                <th style={{ width: '100px', minWidth: '95px', maxWidth: '110px', textAlign: 'center', whiteSpace: 'nowrap' }}>{lang === 'TH' ? 'ผลเช็กยอดธุรกรรม' : 'Deposit Status'}</th>
                <th style={{ width: '180px', minWidth: '150px', maxWidth: '240px', whiteSpace: 'nowrap' }}>{lang === 'TH' ? 'บันทึกรายละเอียดการทักแชท' : 'Chat Remarks & Notes'}</th>
              </tr>
              {/* KPI Totals Sub-header Row */}
              <tr style={{
                background: theme === 'light' ? '#f8fafc' : '#080d19',
                borderBottom: theme === 'light' ? '2px solid #cbd5e1' : '2px solid rgba(255, 255, 255, 0.08)'
              }}>
                <th colSpan="3" style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  <span>📊 {lang === 'TH' ? 'ยอดรวมตามตัวกรอง' : 'Filtered Totals'}: </span>
                  <strong style={{ color: theme === 'light' ? '#0f172a' : '#ffffff' }}>{displayList.length} {lang === 'TH' ? 'คน' : 'leads'}</strong>
                  {effectiveFollowUpAgent !== 'ทั้งหมด' && (
                    <span style={{ color: 'var(--primary)', marginLeft: '6px' }}>({effectiveFollowUpAgent})</span>
                  )}
                </th>
                <th style={{ width: '90px', minWidth: '85px', textAlign: 'center', padding: '6px 4px' }}>
                  <div style={{
                    display: 'inline-flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px 6px',
                    borderRadius: '8px',
                    background: theme === 'light' ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
                    border: '1.5px solid #10b981'
                  }}>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: theme === 'light' ? '#065f46' : '#6ee7b7' }}>
                      {lang === 'TH' ? 'รวมยอดสะสม' : 'Total Dep'}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 900, color: '#10b981', whiteSpace: 'nowrap' }}>
                      ฿{displayTotalDeposit.toLocaleString()}
                    </span>
                  </div>
                </th>
                <th style={{ width: '220px', minWidth: '215px', textAlign: 'center', padding: '6px 4px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {displayDepositedCount > 0 ? (
                    lang === 'TH' ? `เฉลี่ย ฿${Math.round(displayTotalDeposit / displayDepositedCount).toLocaleString()}/คนฝาก` : `Avg ฿${Math.round(displayTotalDeposit / displayDepositedCount).toLocaleString()}/dep`
                  ) : '-'}
                </th>
                <th style={{ width: '100px', minWidth: '95px', maxWidth: '110px', textAlign: 'center', padding: '6px 4px' }}>
                  <div style={{
                    display: 'inline-flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px 6px',
                    borderRadius: '8px',
                    background: theme === 'light' ? '#ecfdf5' : 'rgba(16, 185, 129, 0.15)',
                    border: '1.5px solid #10b981'
                  }}>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: theme === 'light' ? '#065f46' : '#6ee7b7' }}>
                      {lang === 'TH' ? 'รวมเช็กยอด (FTD)' : 'Checked (FTD)'}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 900, color: '#10b981', whiteSpace: 'nowrap' }}>
                      ฿{displayTotalCheckedDeposit.toLocaleString()}
                    </span>
                  </div>
                </th>
                <th style={{ width: '180px', minWidth: '150px', maxWidth: '240px', padding: '6px 10px', textAlign: 'left', fontSize: '11px' }}>
                  <span className="badge badge-saved" style={{ padding: '2px 6px', fontSize: '10px' }}>
                    {lang === 'TH' ? `🟢 ฝากแล้ว ${displayDepositedCount}` : `🟢 ${displayDepositedCount} Dep`}
                  </span>
                  {displayUnconvertedCount > 0 && (
                    <span className="badge badge-pending" style={{ padding: '2px 6px', fontSize: '10px', marginLeft: '4px' }}>
                      {lang === 'TH' ? `🔴 รอฝาก ${displayUnconvertedCount}` : `🔴 ${displayUnconvertedCount} Pending`}
                    </span>
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {displayList.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                    {lang === 'TH' ? 'ไม่มีรายชื่อลูกค้าตามเงื่อนไขการกรองนี้' : 'No customer records matching this filter'}
                  </td>
                </tr>
              ) : (
                displayList.map((cust, custIdx) => {
                  const overdue = isOverdue3Days(cust, selectedMonth);
                  return (
                    <tr key={cust.id}>
                      <td id={custIdx === 0 ? 'tour-customer-info' : undefined}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            {cust.fullName && (
                              <div className={overdue ? 'text-overdue-blink' : ''} style={{ fontWeight: 700, fontSize: '13px', color: theme === 'light' ? '#0f172a' : '#ffffff' }}>
                                {cust.fullName}
                              </div>
                            )}
                            {overdue && (
                              <span 
                                className="overdue-blink-badge"
                                title={lang === 'TH' ? '⚠️ ลูกค้ารายนี้ค้างตามติดต่อกัน 3 วันขึ้นไป กรุณาทักแชทติดตามด่วน' : '⚠️ Overdue for 3+ consecutive days.'}
                              >
                                <span className="overdue-pulse-dot"></span>
                                <span>{lang === 'TH' ? '⚠️ ค้างตาม 3 วัน+' : '⚠️ Overdue 3d+'}</span>
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            {cust.username ? (
                              <span className={!cust.fullName && overdue ? 'text-overdue-blink' : ''} style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '12px' }}>
                                @{cust.username}
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.15)', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                {lang === 'TH' ? '🟠 ทักไม่สมัคร' : '🟠 Inquired (Not Reg)'}
                              </span>
                            )}
                            {cust.campaignMonth && (selectedMonth === 'ALL' || cust.campaignMonth < targetMonth) && (
                              <span style={{ 
                                fontSize: '10px', 
                                padding: '1px 6px', 
                                borderRadius: '4px', 
                                background: theme === 'light' ? '#fef3c7' : 'rgba(245, 158, 11, 0.2)', 
                                color: theme === 'light' ? '#b45309' : '#fde047', 
                                border: theme === 'light' ? '1px solid #fde68a' : '1px solid rgba(245, 158, 11, 0.4)', 
                                fontWeight: 700 
                              }}>
                                📅 {cust.campaignMonth}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                          {cust.phone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>📞 {cust.phone}</span>
                              <button 
                                style={{ border: 'none', background: 'transparent', color: 'var(--primary)', cursor: 'pointer', padding: 0 }}
                                onClick={() => copyToClipboard(cust.phone, 'เบอร์โทร')}
                                title={lang === 'TH' ? 'คัดลอกเบอร์โทรศัพท์' : 'Copy phone number'}
                              >
                                <Copy style={{ width: '11px', height: '11px' }} />
                              </button>
                            </div>
                          )}
                          {cust.lineOA && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399' }}>
                              <span>💬 OA: {cust.lineOA}</span>
                              <button 
                                style={{ border: 'none', background: 'transparent', color: '#34d399', cursor: 'pointer', padding: 0 }}
                                onClick={() => copyToClipboard(cust.lineOA, 'Line OA ID')}
                                title={lang === 'TH' ? 'คัดลอก Line OA ID' : 'Copy LINE OA ID'}
                              >
                                <Copy style={{ width: '11px', height: '11px' }} />
                              </button>
                            </div>
                          )}
                          {/* 1-Click Quick LINE Status Pills */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                              👤 {lang === 'TH' ? 'ไลน์:' : 'LINE:'}
                            </span>
                            {[
                              { val: 'มี', labelTH: '🟢 มี', labelEN: '🟢 Has', color: '#10b981', bg: 'rgba(16, 185, 129, 0.16)' },
                              { val: 'รอแอด', labelTH: '🟡 รอแอด', labelEN: '🟡 Wait', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.16)' },
                              { val: 'ไม่มี', labelTH: '⚪ ไม่มี', labelEN: '⚪ None', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.16)' }
                            ].map(opt => {
                              const cur = (cust.lineLek || '').trim();
                              const isAct = (opt.val === 'มี' && cur && cur !== 'รอแอด' && cur !== 'รอแอดไลน์เล็ก' && cur !== 'ไม่มี' && cur !== 'ไม่มีไลน์เล็ก') ||
                                            (opt.val === 'รอแอด' && (!cur || cur === 'รอแอด' || cur === 'รอแอดไลน์เล็ก')) ||
                                            (opt.val === 'ไม่มี' && (cur === 'ไม่มี' || cur === 'ไม่มีไลน์เล็ก'));
                              return (
                                <button
                                  key={opt.val}
                                  type="button"
                                  onClick={() => handleQuickLineStatusChange(cust.id, opt.val)}
                                  style={{
                                    padding: '1.5px 6px',
                                    fontSize: '10px',
                                    fontWeight: isAct ? 800 : 500,
                                    borderRadius: '10px',
                                    border: isAct ? `1.5px solid ${opt.color}` : '1px solid rgba(148, 163, 184, 0.22)',
                                    background: isAct ? opt.bg : 'transparent',
                                    color: isAct ? opt.color : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    opacity: isAct ? 1 : 0.65,
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  {lang === 'TH' ? opt.labelTH : opt.labelEN}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </td>

                      <td style={{ width: '90px', minWidth: '85px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <span className="badge badge-source">{formatChannelDisplayName(cust.sourceChannel, lang)}</span>
                      </td>

                      <td style={{ width: '90px', minWidth: '85px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <strong>฿{(cust.totalDeposit || 0).toLocaleString()}</strong>
                      </td>

                      <td style={{ width: '220px', minWidth: '215px', verticalAlign: 'middle', padding: '8px 4px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <DaysGrid 
                          id={custIdx === 0 ? 'tour-days-grid' : undefined}
                          customer={cust}
                          daysInMonth={daysInMonth}
                          selectedMonth={selectedMonth}
                          pastMonthSpecificFilter={pastMonthSpecificFilter}
                          onToggleDay={handleToggleDay}
                        />
                      </td>

                      <td id={custIdx === 0 ? 'tour-deposit-status' : undefined} style={{ width: '100px', minWidth: '95px', maxWidth: '110px', textAlign: 'center', whiteSpace: 'nowrap', padding: '6px 4px' }}>
                        {cust.hasDeposited ? (
                          <span className="badge badge-saved" style={{ padding: '3px 6px', fontSize: '10.5px', whiteSpace: 'nowrap' }}>
                            {lang === 'TH' ? `🟢 ฝากแล้ว (฿${(cust.returnedDepositAmount || cust.totalDeposit || 0).toLocaleString()})` : `🟢 Deposited (฿${(cust.returnedDepositAmount || cust.totalDeposit || 0).toLocaleString()})`}
                          </span>
                        ) : (
                          <span className="badge badge-pending" style={{ padding: '3px 6px', fontSize: '10.5px', whiteSpace: 'nowrap' }}>
                            {lang === 'TH' ? '🔴 รอฝากเงิน' : '🔴 Pending'}
                          </span>
                        )}
                      </td>

                      <td style={{ width: '210px', minWidth: '180px', maxWidth: '260px', position: 'relative' }}>
                        {quickEditCustId === cust.id ? (
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            padding: '8px',
                            borderRadius: '10px',
                            background: theme === 'light' ? '#f8fafc' : '#111c35',
                            border: '1.5px solid #a855f7',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                            zIndex: 50
                          }}>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <input
                                type="text"
                                autoFocus
                                value={quickNoteText}
                                onChange={(e) => setQuickNoteText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleQuickNoteSave(cust.id, quickNoteText);
                                  else if (e.key === 'Escape') setQuickEditCustId(null);
                                }}
                                placeholder={lang === 'TH' ? 'พิมพ์โน้ตแล้วกด Enter...' : 'Type note & press Enter...'}
                                style={{
                                  flex: 1,
                                  padding: '4px 8px',
                                  fontSize: '11.5px',
                                  borderRadius: '6px',
                                  border: theme === 'light' ? '1px solid #cbd5e1' : '1px solid rgba(168, 85, 247, 0.4)',
                                  background: theme === 'light' ? '#ffffff' : '#0b1325',
                                  color: theme === 'light' ? '#0f172a' : '#ffffff',
                                  outline: 'none'
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleQuickNoteSave(cust.id, quickNoteText)}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  borderRadius: '6px',
                                  border: 'none',
                                  background: '#10b981',
                                  color: '#ffffff',
                                  cursor: 'pointer'
                                }}
                              >
                                <Check style={{ width: '12px', height: '12px' }} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setQuickEditCustId(null)}
                                style={{
                                  padding: '4px 6px',
                                  fontSize: '10.5px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  background: 'rgba(148, 163, 184, 0.2)',
                                  color: 'var(--text-muted)',
                                  cursor: 'pointer'
                                }}
                              >
                                <X style={{ width: '12px', height: '12px' }} />
                              </button>
                            </div>

                            {/* 1-Click Quick Preset Chips */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                              {QUICK_REMARK_PRESETS.map((preset, pIdx) => {
                                const textVal = lang === 'TH' ? preset.th : preset.en;
                                return (
                                  <button
                                    key={pIdx}
                                    type="button"
                                    onClick={() => handleQuickNoteSave(cust.id, textVal)}
                                    style={{
                                      padding: '2px 6px',
                                      fontSize: '9.5px',
                                      fontWeight: 600,
                                      borderRadius: '8px',
                                      border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(168, 85, 247, 0.28)',
                                      background: theme === 'light' ? '#ffffff' : 'rgba(168, 85, 247, 0.12)',
                                      color: theme === 'light' ? '#475569' : '#e2e8f0',
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {textVal}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            <div
                              onClick={() => {
                                setQuickEditCustId(cust.id);
                                setQuickNoteText(cust.notes || '');
                              }}
                              style={{
                                flex: 1,
                                fontSize: '11.5px',
                                color: cust.notes ? (theme === 'light' ? '#0f172a' : '#f1f5f9') : 'var(--text-muted)',
                                fontWeight: cust.notes ? 600 : 400,
                                padding: '4px 8px',
                                borderRadius: '6px',
                                background: cust.notes ? (theme === 'light' ? '#f1f5f9' : 'rgba(255,255,255,0.04)') : 'transparent',
                                border: '1px dashed rgba(148, 163, 184, 0.25)',
                                cursor: 'pointer',
                                maxWidth: '155px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.15s ease'
                              }}
                              title={cust.notes || '(คลิกจดโน้ตด่วน)'}
                            >
                              {cust.notes ? cust.notes : (lang === 'TH' ? '⚡ + คลิกจดโน้ตด่วน' : '⚡ + Quick Remark')}
                            </div>
                            <button 
                              id={custIdx === 0 ? 'tour-notes-btn' : undefined}
                              className="btn btn-secondary" 
                              style={{ padding: '3px 7px', fontSize: '10px', flexShrink: 0 }}
                              onClick={() => setSelectedCustForModal(cust)}
                              title={lang === 'TH' ? 'เปิดหน้าต่างแก้ไขข้อมูลลูกค้าแบบเต็ม' : 'Open full edit modal'}
                            >
                              <Edit style={{ width: '10px', height: '10px' }} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {displayList.length > 0 && (
              <tfoot>
                <tr style={{
                  background: theme === 'light' ? '#f1f5f9' : '#080d19',
                  borderTop: theme === 'light' ? '2px solid #cbd5e1' : '2px solid rgba(255, 255, 255, 0.08)',
                  fontWeight: 700,
                  fontSize: '12.5px'
                }}>
                  <td colSpan="3" style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--text-muted)' }}>
                    <span>{lang === 'TH' ? 'ยอดรวมทุกแถวตามตัวกรอง:' : 'Total of Filtered Rows:'}</span>
                    <strong style={{ marginLeft: '6px', color: theme === 'light' ? '#0f172a' : '#ffffff' }}>
                      {displayList.length} {lang === 'TH' ? 'คน' : 'leads'}
                    </strong>
                  </td>
                  <td style={{ width: '90px', minWidth: '85px', textAlign: 'center', whiteSpace: 'nowrap', padding: '12px 6px', color: '#10b981', fontSize: '13.5px', fontWeight: 900 }}>
                    ฿{displayTotalDeposit.toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px 6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    {displayDepositedCount > 0 ? (
                      lang === 'TH' ? `เฉลี่ย ฿${Math.round(displayTotalDeposit / displayDepositedCount).toLocaleString()}/คนฝาก` : `Avg ฿${Math.round(displayTotalDeposit / displayDepositedCount).toLocaleString()}/dep`
                    ) : '-'}
                  </td>
                  <td style={{ width: '100px', minWidth: '95px', maxWidth: '110px', textAlign: 'center', whiteSpace: 'nowrap', padding: '10px 4px' }}>
                    <div style={{ color: '#10b981', fontSize: '13px', fontWeight: 900 }}>
                      ฿{displayTotalCheckedDeposit.toLocaleString()}
                    </div>
                    <span className="badge badge-saved" style={{ padding: '2px 6px', fontSize: '10px', marginTop: '2px', display: 'inline-block' }}>
                      {lang === 'TH' ? `🟢 ฝากแล้ว ${displayDepositedCount}` : `🟢 ${displayDepositedCount} Dep`}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {displayUnconvertedCount > 0 && (
                      <span className="badge badge-pending" style={{ padding: '3px 6px', fontSize: '10.5px' }}>
                        {lang === 'TH' ? `🔴 รอฝาก ${displayUnconvertedCount}` : `🔴 ${displayUnconvertedCount} Pending`}
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

export { FollowUpView };
