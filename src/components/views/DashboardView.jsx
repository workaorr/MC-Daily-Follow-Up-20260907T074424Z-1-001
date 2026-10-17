import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { getTodayLocalDateStr } from '../../utils/dateFormatters';
import { exportCustomersToExcel } from '../../utils/exportExcel';
import { getChannelIcon } from '../../constants/channels';
import { formatChannelDisplayName } from '../../utils/customerFormatters';
import { 
    Calendar, 
    FileSpreadsheet, 
    MessageSquare, 
    UserX, 
    UserCheck, 
    CheckCircle2, 
    AlertCircle, 
    Banknote, 
    Sparkles, 
    Trophy, 
    Award, 
    Share2, 
    Filter, 
    PieChart,
    ShieldAlert
} from 'lucide-react';

export const DashboardView = () => {
    const {
        customers,
        agents,
        activeAgentName,
        activeAgent,
        selectedMonth,
        setSelectedMonth,
        daysInMonth,
        lang,
        theme,
        setShowChangePasscodeModal
    } = useApp();

    const [depositMetricMode, setDepositMetricMode] = useState('TOTAL'); // 'TOTAL' or 'FIRST'
    const [startDateFilter, setStartDateFilter] = useState('');
    const [endDateFilter, setEndDateFilter] = useState('');
    const [dismissPasscodeBanner, setDismissPasscodeBanner] = useState(false);

    // Dynamic campaign months list from customers
    const monthsList = useMemo(() => {
        const set = new Set();
        (customers || []).forEach(c => {
            if (c.campaignMonth && c.campaignMonth.length === 7) set.add(c.campaignMonth);
        });
        const currentYear = new Date().getFullYear();
        for (let m = 1; m <= 12; m++) {
            const mStr = `${currentYear}-${String(m).padStart(2, '0')}`;
            set.add(mStr);
        }
        const sorted = Array.from(set).sort().reverse();
        return ['ALL', ...sorted];
    }, [customers]);

    // Filter customers by selectedMonth and date range
    const filteredCustomers = useMemo(() => {
        return (customers || []).filter(c => {
            if (selectedMonth !== 'ALL' && c.campaignMonth && c.campaignMonth !== selectedMonth) {
                return false;
            }
            if (startDateFilter || endDateFilter) {
                const cDate = c.createdAt ? c.createdAt.split('T')[0] : '';
                if (!cDate) return false;
                if (startDateFilter && cDate < startDateFilter) return false;
                if (endDateFilter && cDate > endDateFilter) return false;
            }
            return true;
        });
    }, [customers, selectedMonth, startDateFilter, endDateFilter]);

    // KPI Metrics
    const totalCount = filteredCustomers.length;
    const totalNotReg = filteredCustomers.filter(c => !c.username || !c.username.trim()).length;
    const totalReg = filteredCustomers.filter(c => c.username && c.username.trim()).length;
    const totalDeposited = filteredCustomers.filter(c => c.hasDeposited).length;
    const totalNotDeposited = totalReg - totalDeposited > 0 ? totalReg - totalDeposited : 0;

    const notRegPct = totalCount > 0 ? Math.round((totalNotReg / totalCount) * 100) : 0;
    const regPct = totalCount > 0 ? Math.round((totalReg / totalCount) * 100) : 0;
    const depositCr = totalReg > 0 ? Math.round((totalDeposited / totalReg) * 100) : 0;
    const pendingDepPct = totalReg > 0 ? Math.round((totalNotDeposited / totalReg) * 100) : 0;

    const displayDepositValue = useMemo(() => {
        return filteredCustomers.reduce((acc, c) => {
            if (!c.hasDeposited) return acc;
            const amt = parseFloat(c.totalDeposit || 0);
            return acc + (isNaN(amt) ? 0 : amt);
        }, 0);
    }, [filteredCustomers]);

    // Per agent statistics
    const agentStats = useMemo(() => {
        const activeAgents = (agents || []).filter(a => !a.isArchived);
        return activeAgents.map(ag => {
            const agCusts = filteredCustomers.filter(c => c.createdBy === ag.name);
            const totalContacted = agCusts.length;
            const contactedNotRegistered = agCusts.filter(c => !c.username || !c.username.trim()).length;
            const contactedRegistered = agCusts.filter(c => c.username && c.username.trim()).length;
            const registeredAndDeposited = agCusts.filter(c => c.hasDeposited).length;
            const registeredNotDeposited = Math.max(0, contactedRegistered - registeredAndDeposited);
            const totalDeposit = agCusts.reduce((acc, c) => acc + (c.hasDeposited ? (parseFloat(c.totalDeposit) || 0) : 0), 0);
            const firstDeposit = agCusts.reduce((acc, c) => acc + (c.hasDeposited ? (parseFloat(c.totalDeposit) || 0) : 0), 0);

            return {
                name: ag.name,
                totalContacted,
                contactedNotRegistered,
                contactedRegistered,
                registeredAndDeposited,
                registeredNotDeposited,
                totalDeposit,
                firstDeposit,
                totalAccumulated: totalDeposit
            };
        });
    }, [agents, filteredCustomers]);

    // Top 3 agents ranking
    const top3Agents = useMemo(() => {
        return [...agentStats]
            .sort((a, b) => b.registeredAndDeposited - a.registeredAndDeposited || b.totalDeposit - a.totalDeposit)
            .slice(0, 3);
    }, [agentStats]);

    const hasAnyTopAgentDeposits = top3Agents.some(a => a.registeredAndDeposited > 0);

    // Channel ranking for depositors
    const depositedCustList = useMemo(() => {
        return filteredCustomers.filter(c => c.hasDeposited);
    }, [filteredCustomers]);

    const rankedDepositChannels = useMemo(() => {
        const map = {};
        depositedCustList.forEach(c => {
            const ch = c.sourceChannel || 'Facebook';
            if (!map[ch]) {
                map[ch] = { name: ch, count: 0, totalDeposit: 0, firstDeposit: 0 };
            }
            map[ch].count += 1;
            const amt = parseFloat(c.totalDeposit) || 0;
            map[ch].totalDeposit += amt;
            map[ch].firstDeposit += amt;
        });
        return Object.values(map).sort((a, b) => b.count - a.count || b.totalDeposit - a.totalDeposit);
    }, [depositedCustList]);

    const isUsingDefaultPasscode = activeAgent?.passcode === '1234';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Security Warning Banner if using default 1234 */}
            {isUsingDefaultPasscode && !dismissPasscodeBanner && (
                <div style={{
                    background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.12) 0%, rgba(245, 158, 11, 0.12) 100%)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    borderRadius: '12px',
                    padding: '12px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '14px',
                    flexWrap: 'wrap',
                    boxShadow: '0 4px 16px rgba(239, 68, 68, 0.1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                            <ShieldAlert size={20} />
                        </div>
                        <div>
                            <strong style={{ fontSize: '13.5px', color: '#f87171' }}>
                                {lang === 'TH' ? 'คำเตือนความปลอดภัย: บัญชีของคุณยังใช้รหัสผ่านเริ่มต้น (1234)' : 'Security Warning: Account is using default passcode (1234)'}
                            </strong>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {lang === 'TH' ? 'กรุณาตั้งรหัสผ่านใหม่เพื่อความปลอดภัยในการเข้าถึงฐานข้อมูลลูกค้า' : 'Please change your passcode to secure customer database access.'}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button 
                            className="btn btn-primary"
                            style={{ padding: '6px 14px', fontSize: '12px', background: '#ef4444' }}
                            onClick={() => setShowChangePasscodeModal(true)}
                        >
                            {lang === 'TH' ? 'เปลี่ยนรหัสผ่านทันที' : 'Change Passcode'}
                        </button>
                        <button 
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                            onClick={() => setDismissPasscodeBanner(true)}
                        >
                            {lang === 'TH' ? 'ไว้ทีหลัง' : 'Later'}
                        </button>
                    </div>
                </div>
            )}

            {/* Campaign Month & Date Filter Bar */}
            <div id="tour-sup-filter" className="panel" style={{ padding: '16px 24px', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                            <Calendar size={20} style={{ color: 'var(--primary)' }} />
                        </span>
                        <div>
                            <span style={{ fontWeight: 600, display: 'block' }}>
                                {lang === 'TH' ? 'เลือกรอบข้อมูลแดชบอร์ดย้อนหลัง (Campaign Month):' : 'Campaign Month Filter:'}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {selectedMonth === 'ALL' || !selectedMonth.includes('-') ? (
                                    lang === 'TH' ? '📅 แสดงผลข้อมูลย้อนหลังสะสมทั้งหมดทุกรอบเดือน' : '📅 All-Time Historical Data'
                                ) : (
                                    lang === 'TH' ? `📅 รอบการตาม: วันที่ 1 - ${daysInMonth} (${selectedMonth})` : `📅 Campaign Period: Day 1 - ${daysInMonth} (${selectedMonth})`
                                )}
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <select 
                            className="select-input" 
                            value={selectedMonth}
                            onChange={(e) => {
                                setSelectedMonth(e.target.value);
                                setStartDateFilter('');
                                setEndDateFilter('');
                            }}
                            style={{ minWidth: '180px' }}
                        >
                            {monthsList.map(m => (
                                <option key={m} value={m}>
                                    {m === 'ALL' ? (lang === 'TH' ? '📅 ดูย้อนหลังทั้งหมด (ทุกรอบเดือน)' : '📅 All-Time History') : m}
                                </option>
                            ))}
                        </select>

                        {/* Date Range Filter */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                            <span style={{ color: 'var(--text-muted)' }}>{lang === 'TH' ? 'กรองช่วงวันที่:' : 'Date:'}</span>
                            <input 
                                type="date" 
                                className="select-input" 
                                value={startDateFilter}
                                onChange={(e) => setStartDateFilter(e.target.value)}
                                style={{ padding: '2px 8px', fontSize: '11px', width: '125px' }}
                            />
                            <span style={{ color: 'var(--text-muted)' }}>{lang === 'TH' ? 'ถึง' : 'to'}</span>
                            <input 
                                type="date" 
                                className="select-input" 
                                value={endDateFilter}
                                onChange={(e) => setEndDateFilter(e.target.value)}
                                style={{ padding: '2px 8px', fontSize: '11px', width: '125px' }}
                            />
                            {(() => {
                                const todayVal = getTodayLocalDateStr();
                                const isToday = startDateFilter === todayVal && endDateFilter === todayVal;
                                return (
                                    <React.Fragment>
                                        <button 
                                            className={`btn filter-status-pill ${isToday ? 'active' : ''}`} 
                                            style={{ padding: '3px 9px', fontSize: '11px' }}
                                            onClick={() => {
                                                setStartDateFilter(todayVal);
                                                setEndDateFilter(todayVal);
                                            }}
                                        >
                                            {isToday ? (lang === 'TH' ? '✓ วันนี้' : '✓ Today') : (lang === 'TH' ? 'วันนี้' : 'Today')}
                                        </button>
                                        {(startDateFilter || endDateFilter) && (
                                            <button 
                                                className="btn filter-status-pill" 
                                                style={{ padding: '3px 9px', fontSize: '11px' }}
                                                onClick={() => {
                                                    setStartDateFilter('');
                                                    setEndDateFilter('');
                                                }}
                                            >
                                                {lang === 'TH' ? 'ล้าง' : 'Clear'}
                                            </button>
                                        )}
                                    </React.Fragment>
                                );
                            })()}
                        </div>

                        {/* Export Excel Button */}
                        <button 
                            className="btn" 
                            style={{ 
                                padding: '7px 16px', 
                                fontSize: '12px', 
                                background: '#107c41', 
                                color: '#ffffff', 
                                border: '1px solid #15803d', 
                                borderRadius: '8px', 
                                fontWeight: 700, 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '7px',
                                boxShadow: '0 2px 6px rgba(16, 124, 65, 0.3)',
                                cursor: 'pointer'
                            }}
                            onClick={() => {
                                const monthSuffix = selectedMonth === 'ALL' ? 'All' : selectedMonth;
                                exportCustomersToExcel(filteredCustomers, `MC_Customer_List_${monthSuffix}.xlsx`);
                            }}
                        >
                            <FileSpreadsheet size={15} />
                            <span>{lang === 'TH' ? 'ดาวน์โหลด Excel (.xlsx)' : 'Export Excel (.xlsx)'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 5 Executive KPI Cards */}
            <div id="tour-sup-kpis" className="kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                {/* 1. Total Inquiries */}
                <div className="kpi-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px', padding: '16px', background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>{lang === 'TH' ? '1. จำนวนทัก (ทั้งหมด)' : '1. Total Inquiries'}</div>
                            <span style={{ display: 'inline-block', marginTop: '4px', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.35)' }}>
                                {lang === 'TH' ? '100% รวมพอร์ต' : '100% Total'}
                            </span>
                        </div>
                        <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                            <MessageSquare size={18} />
                        </div>
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span style={{ fontSize: '28px', fontWeight: 900, color: '#c084fc', letterSpacing: '-0.5px' }}>{totalCount}</span>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>{lang === 'TH' ? 'คน' : 'leads'}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{lang === 'TH' ? 'เคสที่ทักดึงเข้าพอร์ตทั้งหมด' : 'Total inquiries in portfolio'}</div>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden', marginTop: '4px' }}>
                        <div style={{ width: '100%', height: '100%', background: '#a855f7', borderRadius: '3px' }}></div>
                    </div>
                </div>

                {/* 2. Inquired (Not Reg) */}
                <div className="kpi-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px', padding: '16px', background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>{lang === 'TH' ? '2. ทักแต่ไม่สมัคร' : '2. Inquired (Not Reg)'}</div>
                            <span style={{ display: 'inline-block', marginTop: '4px', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.35)' }}>
                                {lang === 'TH' ? `${notRegPct}% ของยอดทัก` : `${notRegPct}% of Inquiries`}
                            </span>
                        </div>
                        <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                            <UserX size={18} />
                        </div>
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span style={{ fontSize: '28px', fontWeight: 900, color: '#fbbf24', letterSpacing: '-0.5px' }}>{totalNotReg}</span>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>{lang === 'TH' ? 'คน' : 'leads'}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{lang === 'TH' ? 'ยังไม่มียูสเซอร์ (MC ตามสมัคร)' : 'No account yet (Follow-up reg)'}</div>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden', marginTop: '4px' }}>
                        <div style={{ width: `${Math.max(5, notRegPct)}%`, height: '100%', background: '#f59e0b', borderRadius: '3px' }}></div>
                    </div>
                </div>

                {/* 3. Registered */}
                <div className="kpi-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px', padding: '16px', background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>{lang === 'TH' ? '3. ทักสมัคร' : '3. Registered'}</div>
                            <span style={{ display: 'inline-block', marginTop: '4px', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.35)' }}>
                                {lang === 'TH' ? `${regPct}% สมัครสำเร็จ` : `${regPct}% Registered`}
                            </span>
                        </div>
                        <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                            <UserCheck size={18} />
                        </div>
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span style={{ fontSize: '28px', fontWeight: 900, color: '#38bdf8', letterSpacing: '-0.5px' }}>{totalReg}</span>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>{lang === 'TH' ? 'คน' : 'leads'}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{lang === 'TH' ? 'ลงทะเบียนยูสเซอร์แล้ว' : 'Registered user account'}</div>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden', marginTop: '4px' }}>
                        <div style={{ width: `${Math.max(5, regPct)}%`, height: '100%', background: '#38bdf8', borderRadius: '3px' }}></div>
                    </div>
                </div>

                {/* 4. Reg & Deposited */}
                <div className="kpi-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px', padding: '16px', background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: '16px', boxShadow: '0 0 15px rgba(16, 185, 129, 0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>{lang === 'TH' ? '4. สมัครและฝาก' : '4. Reg & Deposited'}</div>
                            <span style={{ display: 'inline-block', marginTop: '4px', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                                {lang === 'TH' ? `MC: ${depositCr}% สำเร็จ` : `MC: ${depositCr}% Converted`}
                            </span>
                        </div>
                        <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                            <CheckCircle2 size={18} />
                        </div>
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span style={{ fontSize: '28px', fontWeight: 900, color: '#34d399', letterSpacing: '-0.5px' }}>{totalDeposited}</span>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>{lang === 'TH' ? 'คน' : 'leads'}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{lang === 'TH' ? 'พบยอดฝากเงินจากไฟล์ฝาก' : 'Deposit matched in system'}</div>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden', marginTop: '4px' }}>
                        <div style={{ width: `${Math.max(5, depositCr)}%`, height: '100%', background: '#10b981', borderRadius: '3px' }}></div>
                    </div>
                </div>

                {/* 5. Reg (No Deposit) */}
                <div className="kpi-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px', padding: '16px', background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>{lang === 'TH' ? '5. สมัครไม่ฝาก' : '5. Reg (No Deposit)'}</div>
                            <span style={{ display: 'inline-block', marginTop: '4px', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', border: '1px solid rgba(244, 63, 94, 0.35)' }}>
                                {lang === 'TH' ? `${pendingDepPct}% ค้างฝาก` : `${pendingDepPct}% Pending Deposit`}
                            </span>
                        </div>
                        <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
                            <AlertCircle size={18} />
                        </div>
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span style={{ fontSize: '28px', fontWeight: 900, color: '#fb7185', letterSpacing: '-0.5px' }}>{totalNotDeposited}</span>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>{lang === 'TH' ? 'คน' : 'leads'}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{lang === 'TH' ? 'มียูสแต่ยังค้างฝากเงิน (ตามฝาก)' : 'Has account, pending deposit'}</div>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden', marginTop: '4px' }}>
                        <div style={{ width: `${Math.max(5, pendingDepPct)}%`, height: '100%', background: '#f43f5e', borderRadius: '3px' }}></div>
                    </div>
                </div>
            </div>

            {/* Total Deposit Revenue Summary Banner */}
            <div className="kpi-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '16px 22px', border: '1px solid rgba(16, 185, 129, 0.35)', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ padding: '12px', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        <Banknote size={28} />
                    </div>
                    <div>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>
                                {depositMetricMode === 'FIRST'
                                    ? (lang === 'TH' ? 'ยอดเงินฝากแรกสะสมประจำรอบ (Total First-Time Deposits - FTD)' : 'Total First-Time Deposits (FTD)')
                                    : (lang === 'TH' ? 'ยอดเงินฝากสะสมรวมประจำรอบ (Total Accumulated Deposits)' : 'Total Accumulated Deposits')}
                            </span>
                            <Sparkles size={14} style={{ color: '#fbbf24' }} />
                        </span>
                        <div style={{ fontSize: '26px', fontWeight: 900, color: '#34d399', letterSpacing: '-0.5px', marginTop: '2px' }}>
                            ฿{displayDepositValue.toLocaleString()}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '4px' }}>
                        <button
                            onClick={() => setDepositMetricMode('TOTAL')}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '9px',
                                fontWeight: 700,
                                fontSize: '12px',
                                border: 'none',
                                cursor: 'pointer',
                                background: depositMetricMode === 'TOTAL' ? 'var(--primary)' : 'transparent',
                                color: depositMetricMode === 'TOTAL' ? '#fff' : 'var(--text-muted)',
                                transition: 'all 0.2s'
                            }}
                        >
                            {lang === 'TH' ? '💰 ยอดฝากรวมสะสม' : '💰 Total Deposits'}
                        </button>
                        <button
                            onClick={() => setDepositMetricMode('FIRST')}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '9px',
                                fontWeight: 700,
                                fontSize: '12px',
                                border: 'none',
                                cursor: 'pointer',
                                background: depositMetricMode === 'FIRST' ? 'var(--secondary)' : 'transparent',
                                color: depositMetricMode === 'FIRST' ? '#fff' : 'var(--text-muted)',
                                transition: 'all 0.2s'
                            }}
                        >
                            {lang === 'TH' ? '🟢 ยอดฝากแรก (FTD)' : '🟢 First Deposits (FTD)'}
                        </button>
                    </div>

                    <div style={{ padding: '8px 14px', borderRadius: '12px', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }}></span>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{lang === 'TH' ? 'อัตราการปิดฝากสำเร็จ (MC):' : 'MC Deposit Conv. Rate:'}</span>
                        <strong style={{ color: '#34d399', fontSize: '15px', fontWeight: 900 }}>{depositCr}%</strong>
                    </div>
                </div>
            </div>

            {/* 2-Column: Top 3 Closers & Top Channels */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px' }}>
                {/* Top 3 Closers */}
                <div className="panel" style={{ padding: '20px', borderRadius: '16px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(168, 85, 247, 0.3)', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.35)' }}>
                                <Trophy size={20} />
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.2px' }}>
                                    {lang === 'TH' ? '🏆 KPI พนักงานตามลูกค้ามาฝากได้ 3 อันดับ' : '🏆 Top 3 Deposit Closers (MC)'}
                                </h4>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                    {lang === 'TH' ? 'จัดอันดับพนักงาน MC ที่ปิดยอดฝากสำเร็จสูงสุด' : 'Ranking MC agents with highest deposit conversions'}
                                </span>
                            </div>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.35)' }}>
                            Top Closers
                        </span>
                    </div>

                    {!hasAnyTopAgentDeposits ? (
                        <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <Award size={28} style={{ opacity: 0.5 }} />
                            <span>{lang === 'TH' ? 'ยังไม่มีข้อมูลพนักงานที่ตามลูกค้ามาฝากสำเร็จในช่วงเวลานี้' : 'No successful deposit conversions recorded in this period'}</span>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {top3Agents.map((ag, rankIdx) => {
                                const medals = lang === 'TH' ? ['🥇 อันดับ 1', '🥈 อันดับ 2', '🥉 อันดับ 3'] : ['🥇 1st Place', '🥈 2nd Place', '🥉 3rd Place'];
                                const badgeGradients = [
                                    'linear-gradient(135deg, #f59e0b, #d97706)',
                                    'linear-gradient(135deg, #94a3b8, #64748b)',
                                    'linear-gradient(135deg, #d97706, #b45309)'
                                ];
                                const crPercent = ag.contactedRegistered > 0 ? Math.round((ag.registeredAndDeposited / ag.contactedRegistered) * 100) : 0;

                                return (
                                    <div 
                                        key={ag.name} 
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '12px 14px',
                                            borderRadius: '12px',
                                            background: 'rgba(255, 255, 255, 0.03)',
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                            gap: '12px'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '130px' }}>
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: 800,
                                                padding: '4px 8px',
                                                borderRadius: '8px',
                                                background: badgeGradients[rankIdx] || badgeGradients[2],
                                                color: '#ffffff',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {medals[rankIdx]}
                                            </span>
                                            <div>
                                                <div style={{ fontWeight: 800, fontSize: '13.5px', color: theme === 'light' ? '#0f172a' : '#f8fafc' }}>
                                                    {ag.name}
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                    {lang === 'TH' ? 'อัตราสำเร็จ: ' : 'Success: '}<strong style={{ color: '#34d399' }}>{crPercent}%</strong>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'right' }}>
                                            <div>
                                                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{lang === 'TH' ? 'ตามฝากสำเร็จ' : 'Deposited'}</div>
                                                <div style={{ fontSize: '16px', fontWeight: 900, color: '#34d399' }}>
                                                    {ag.registeredAndDeposited} <span style={{ fontSize: '11px', fontWeight: 600 }}>{lang === 'TH' ? 'คน' : 'leads'}</span>
                                                </div>
                                            </div>
                                            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '14px', minWidth: '95px' }}>
                                                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                                                    {depositMetricMode === 'FIRST' ? (lang === 'TH' ? 'ยอดฝาก (FTD)' : 'FTD') : (lang === 'TH' ? 'ยอดสะสม' : 'Total')}
                                                </div>
                                                <div style={{ fontSize: '14px', fontWeight: 800, color: '#fbbf24' }}>
                                                    ฿{ag.totalDeposit.toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Top Channels */}
                <div className="panel" style={{ padding: '20px', borderRadius: '16px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(16, 185, 129, 0.3)', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.35)' }}>
                                <Share2 size={20} />
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.2px' }}>
                                    {lang === 'TH' ? '📊 อันดับช่องทางสมัครของลูกค้าที่ฝากเงิน' : '📊 Top Depositing Channels'}
                                </h4>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                    {lang === 'TH' ? 'เรียงอันดับช่องทางที่ลูกค้าเข้ามาและมียอดฝากจริง' : 'Acquisition channels by confirmed deposits'}
                                </span>
                            </div>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.35)' }}>
                            {depositedCustList.length} {lang === 'TH' ? 'คนฝากเงิน' : 'Depositors'}
                        </span>
                    </div>

                    {rankedDepositChannels.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <Filter size={28} style={{ opacity: 0.5 }} />
                            <span>{lang === 'TH' ? 'ยังไม่มีข้อมูลลูกค้าที่มียอดฝากจากช่องทางใดในช่วงเวลานี้' : 'No channel deposit records in this period'}</span>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {rankedDepositChannels.slice(0, 5).map((ch, idx) => {
                                const totalDep = Math.max(1, depositedCustList.length);
                                const pct = Math.round((ch.count / totalDep) * 100);
                                const dispAmt = depositMetricMode === 'FIRST' ? ch.firstDeposit : ch.totalDeposit;

                                return (
                                    <div 
                                        key={ch.name} 
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '6px',
                                            padding: '10px 12px',
                                            borderRadius: '12px',
                                            background: 'rgba(255, 255, 255, 0.02)',
                                            border: '1px solid rgba(255, 255, 255, 0.06)'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{
                                                    fontSize: '10.5px',
                                                    fontWeight: 900,
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '6px',
                                                    background: idx === 0 ? '#10b981' : idx === 1 ? '#0284c7' : idx === 2 ? '#d97706' : '#6366f1',
                                                    color: '#ffffff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    #{idx + 1}
                                                </span>
                                                <span style={{ fontSize: '13px' }}>{getChannelIcon(ch.name)}</span>
                                                <span style={{ fontSize: '12.5px', fontWeight: 700, color: theme === 'light' ? '#0f172a' : '#f8fafc' }}>
                                                    {formatChannelDisplayName(ch.name, lang)}
                                                </span>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'right' }}>
                                                <div>
                                                    <span style={{ fontSize: '13.5px', fontWeight: 900, color: '#34d399' }}>
                                                        {ch.count} <span style={{ fontSize: '10.5px', fontWeight: 600 }}>{lang === 'TH' ? 'คน' : 'leads'}</span>
                                                    </span>
                                                    <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                                                        ({pct}%)
                                                    </span>
                                                </div>
                                                <div style={{ minWidth: '85px', borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '12px' }}>
                                                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#fbbf24' }}>
                                                        ฿{dispAmt.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{ width: `${Math.max(5, pct)}%`, height: '100%', background: idx === 0 ? '#10b981' : '#38bdf8', borderRadius: '3px' }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Individual MC Agent Workload & Performance Table */}
            <div className="panel">
                <div className="panel-header" style={{ marginBottom: '16px' }}>
                    <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <PieChart size={18} />
                        <span>{lang === 'TH' ? 'รายงานสถิติยอดติดตามและความสำเร็จแยกตามรายบุคคล' : 'Individual Follow-up & Performance Statistics Report'}</span>
                    </h3>
                </div>
                <div id="tour-customer-table" className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th style={{ color: '#f8fafc' }}>{lang === 'TH' ? 'รายชื่อพนักงาน MC' : 'MC Agent Name'}</th>
                                <th style={{ textAlign: 'center', color: '#f8fafc' }}>{lang === 'TH' ? '1. จำนวนทัก' : '1. Inquiries'}</th>
                                <th style={{ textAlign: 'center', color: '#fde047' }}>{lang === 'TH' ? '2. ทักแต่ไม่สมัคร' : '2. Inquired (Not Reg)'}</th>
                                <th style={{ textAlign: 'center', color: '#60a5fa' }}>{lang === 'TH' ? '3. ทักสมัคร' : '3. Registered'}</th>
                                <th style={{ textAlign: 'center', color: '#34d399' }}>{lang === 'TH' ? '4. สมัครและฝาก' : '4. Reg & Deposited'}</th>
                                <th style={{ textAlign: 'center', color: '#fb7185' }}>{lang === 'TH' ? '5. สมัครไม่ฝาก' : '5. Reg (No Deposit)'}</th>
                                <th style={{ textAlign: 'right', color: '#fbbf24' }}>
                                    {depositMetricMode === 'FIRST' ? (lang === 'TH' ? 'ยอดฝาก (FTD)' : 'FTD') : (lang === 'TH' ? 'ยอดฝากสะสมรวม' : 'Total Deposits')}
                                </th>
                                <th style={{ textAlign: 'center', color: '#c084fc' }}>{lang === 'TH' ? 'อัตราสำเร็จ (MC%)' : 'Success Rate (%)'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {agentStats.map((stat, idx) => {
                                const percent = stat.contactedRegistered > 0 ? Math.round((stat.registeredAndDeposited / stat.contactedRegistered) * 100) : 0;
                                return (
                                    <tr key={idx}>
                                        <td style={{ fontWeight: 700, color: theme === 'light' ? '#0f172a' : '#f8fafc', fontSize: '13.5px' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#c084fc', display: 'inline-block' }}></span>
                                                <span>{stat.name}</span>
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}><strong>{stat.totalContacted} {lang === 'TH' ? 'คน' : ''}</strong></td>
                                        <td style={{ textAlign: 'center', color: '#fde047' }}><strong>{stat.contactedNotRegistered} {lang === 'TH' ? 'คน' : ''}</strong></td>
                                        <td style={{ textAlign: 'center', color: '#60a5fa' }}><strong>{stat.contactedRegistered} {lang === 'TH' ? 'คน' : ''}</strong></td>
                                        <td style={{ textAlign: 'center', color: '#34d399' }}><strong>{stat.registeredAndDeposited} {lang === 'TH' ? 'คน' : ''}</strong></td>
                                        <td style={{ textAlign: 'center', color: '#fb7185' }}><strong>{stat.registeredNotDeposited} {lang === 'TH' ? 'คน' : ''}</strong></td>
                                        <td style={{ textAlign: 'right', color: '#34d399' }}>
                                            <div><strong>฿{stat.totalDeposit.toLocaleString()}</strong></div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                                <div style={{ width: '60px', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${percent}%`, height: '100%', background: 'linear-gradient(to right, #a855f7, #10b981)' }}></div>
                                                </div>
                                                <span style={{ fontSize: '11px', color: theme === 'light' ? '#0f172a' : '#f8fafc', fontWeight: 700 }}>{percent}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DashboardView;

