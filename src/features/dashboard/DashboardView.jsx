import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../context/AppContext';
import { DailyTrendChart } from './DailyTrendChart';
import { getTodayLocalDateStr, getCurrentMonthStr } from '../../utils/dateFormatters';
import { exportCustomersToExcel } from '../../utils/exportExcel';
import { getChannelIcon } from '../../constants/channels';
import { formatChannelDisplayName } from '../../utils/customerFormatters';
import { 
    buildDailyTrendStats, 
    buildAgentTargetComparisonData, 
    getCustomerDepositAmount 
} from '../../utils/dailyStats.js';
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
    ShieldAlert,
    Target,
    Pencil,
    X,
    Users,
    TrendingUp,
    Calculator,
    Check
} from 'lucide-react';

export const DashboardView = () => {
    const {
        customers,
        agents,
        activeAgentName,
        activeAgent,
        isSupervisor,
        selectedMonth,
        setSelectedMonth,
        daysInMonth,
        lang,
        theme,
        setShowChangePasscodeModal,
        teamMonthlyTargets,
        saveMonthlyTargets
    } = useApp();

    const [depositMetricMode, setDepositMetricMode] = useState('TOTAL'); // 'TOTAL' or 'FIRST'
    const [startDateFilter, setStartDateFilter] = useState('');
    const [endDateFilter, setEndDateFilter] = useState('');
    const [dismissPasscodeBanner, setDismissPasscodeBanner] = useState(false);

    // Target Setting Modal States (Supervisor Only)
    const [showTargetModal, setShowTargetModal] = useState(false);
    const [editingTargetMonth, setEditingTargetMonth] = useState(getCurrentMonthStr());
    const [draftTeamTarget, setDraftTeamTarget] = useState('');
    const [draftAgentTargets, setDraftAgentTargets] = useState({});
    const [isSavingTargets, setIsSavingTargets] = useState(false);
    const [targetSavedNotice, setTargetSavedNotice] = useState(false);

    const hasSupervisorAccess = Boolean(isSupervisor || activeAgent?.role === 'SUPERVISOR');

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
        return filteredCustomers.reduce((acc, c) => acc + getCustomerDepositAmount(c, depositMetricMode), 0);
    }, [filteredCustomers, depositMetricMode]);

    // Helper: get monthly target for an agent (specific month or sum across all months if ALL)
    const getAgentTargetForView = (ag) => {
        const mTargets = ag?.permissions?.monthlyTargets;
        if (!mTargets || typeof mTargets !== 'object') return 0;
        if (selectedMonth === 'ALL') {
            return Object.values(mTargets).reduce((sum, v) => sum + (parseFloat(v || 0) || 0), 0);
        }
        return parseFloat(mTargets[selectedMonth] || 0) || 0;
    };

    // Current Team Target for selected view
    const currentTeamTarget = useMemo(() => {
        const map = teamMonthlyTargets || {};
        if (selectedMonth === 'ALL') {
            return Object.values(map).reduce((sum, v) => sum + (parseFloat(v || 0) || 0), 0);
        }
        return parseFloat(map[selectedMonth] || 0) || 0;
    }, [teamMonthlyTargets, selectedMonth]);

    const teamTargetPct = currentTeamTarget > 0 ? Math.round((displayDepositValue / currentTeamTarget) * 100) : 0;
    const teamTargetRemaining = currentTeamTarget - displayDepositValue;

    // Daily pace calculation (only for current active month when still below target)
    const dailyPaceStats = useMemo(() => {
        const curMonth = getCurrentMonthStr();
        if (selectedMonth !== curMonth || currentTeamTarget <= 0 || teamTargetRemaining <= 0) return null;
        const todayDate = new Date().getDate();
        const remainingDays = Math.max(1, (daysInMonth || 30) - todayDate + 1);
        const dailyRequired = Math.ceil(teamTargetRemaining / remainingDays);
        return { remainingDays, dailyRequired };
    }, [selectedMonth, currentTeamTarget, teamTargetRemaining, daysInMonth]);

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
            const totalDeposit = agCusts.reduce((acc, c) => acc + getCustomerDepositAmount(c, 'TOTAL'), 0);
            const firstDeposit = agCusts.reduce((acc, c) => acc + getCustomerDepositAmount(c, 'FIRST'), 0);
            const activeDeposit = depositMetricMode === 'FIRST' ? firstDeposit : totalDeposit;
            const monthlyTarget = getAgentTargetForView(ag);
            const targetPct = monthlyTarget > 0 ? Math.round((activeDeposit / monthlyTarget) * 100) : 0;

            return {
                name: ag.name,
                role: ag.role || 'AGENT',
                totalContacted,
                contactedNotRegistered,
                contactedRegistered,
                registeredAndDeposited,
                registeredNotDeposited,
                totalDeposit,
                firstDeposit,
                activeDeposit,
                totalAccumulated: totalDeposit,
                monthlyTarget,
                targetPct
            };
        });
    }, [agents, filteredCustomers, depositMetricMode, selectedMonth]);

    // Active user's own personal stats (useful for MC Agents)
    const myPersonalStat = useMemo(() => {
        return agentStats.find(s => s.name === activeAgentName) || null;
    }, [agentStats, activeAgentName]);

    // Open Target Modal helper
    const openTargetModal = (monthOverride = null) => {
        if (!hasSupervisorAccess) return;
        const targetM = monthOverride || (selectedMonth === 'ALL' ? getCurrentMonthStr() : selectedMonth);
        setEditingTargetMonth(targetM);
        const existingTeam = parseFloat(teamMonthlyTargets?.[targetM] || 0) || 0;
        setDraftTeamTarget(existingTeam > 0 ? String(existingTeam) : '');
        const agMap = {};
        (agents || []).filter(a => !a.isArchived && a.isActive !== false).forEach(ag => {
            const val = parseFloat(ag?.permissions?.monthlyTargets?.[targetM] || 0) || 0;
            agMap[ag.name] = val > 0 ? String(val) : '';
        });
        setDraftAgentTargets(agMap);
        setShowTargetModal(true);
    };

    const handleChangeEditingMonth = (newMonth) => {
        setEditingTargetMonth(newMonth);
        const existingTeam = parseFloat(teamMonthlyTargets?.[newMonth] || 0) || 0;
        setDraftTeamTarget(existingTeam > 0 ? String(existingTeam) : '');
        const agMap = {};
        (agents || []).filter(a => !a.isArchived && a.isActive !== false).forEach(ag => {
            const val = parseFloat(ag?.permissions?.monthlyTargets?.[newMonth] || 0) || 0;
            agMap[ag.name] = val > 0 ? String(val) : '';
        });
        setDraftAgentTargets(agMap);
    };

    const handleSumAgentsToTeamTarget = () => {
        const sum = Object.values(draftAgentTargets).reduce((acc, v) => acc + (parseFloat(v || 0) || 0), 0);
        setDraftTeamTarget(sum > 0 ? String(sum) : '0');
    };

    const handleSplitTeamTargetEqually = () => {
        const teamVal = parseFloat(draftTeamTarget || 0) || 0;
        if (teamVal <= 0) return;
        const activeStaff = (agents || []).filter(a => !a.isArchived && a.isActive !== false);
        const mcAgentsOnly = activeStaff.filter(a => a.role !== 'SUPERVISOR');
        const targetRecipients = mcAgentsOnly.length > 0 ? mcAgentsOnly : activeStaff;
        if (targetRecipients.length === 0) return;
        const perAgent = Math.round(teamVal / targetRecipients.length);
        const nextMap = { ...draftAgentTargets };
        activeStaff.forEach(a => {
            if (targetRecipients.some(r => r.name === a.name)) {
                nextMap[a.name] = String(perAgent);
            } else {
                nextMap[a.name] = '0';
            }
        });
        setDraftAgentTargets(nextMap);
    };

    const handleSaveTargetsSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!hasSupervisorAccess || isSavingTargets) return;
        setIsSavingTargets(true);
        try {
            await saveMonthlyTargets(editingTargetMonth, draftTeamTarget, draftAgentTargets);
            setShowTargetModal(false);
            setTargetSavedNotice(true);
            setTimeout(() => setTargetSavedNotice(false), 3500);
        } finally {
            setIsSavingTargets(false);
        }
    };

    // Top 3 agents ranking
    const top3Agents = useMemo(() => {
        return [...agentStats]
            .sort((a, b) => b.registeredAndDeposited - a.registeredAndDeposited || b.activeDeposit - a.activeDeposit)
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
            map[ch].totalDeposit += getCustomerDepositAmount(c, 'TOTAL');
            map[ch].firstDeposit += getCustomerDepositAmount(c, 'FIRST');
        });
        return Object.values(map).sort((a, b) => b.count - a.count || b.totalDeposit - a.totalDeposit);
    }, [depositedCustList]);

    // Daily Trend Statistics (Day 1 to End of Month)
    const dailyTrendStats = useMemo(() => {
        return buildDailyTrendStats(customers, selectedMonth, depositMetricMode, {
            startDateFilter,
            endDateFilter
        });
    }, [customers, selectedMonth, depositMetricMode, startDateFilter, endDateFilter]);

    // Agent Actual vs Target Chart Data
    const agentTargetChartData = useMemo(() => {
        return buildAgentTargetComparisonData(agentStats, depositMetricMode);
    }, [agentStats, depositMetricMode]);

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

            {/* Total Deposit Revenue Summary Banner & Monthly Target Progress */}
            <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '16px', padding: '18px 22px', border: '1px solid rgba(16, 185, 129, 0.35)', background: theme === 'light' ? '#ffffff' : 'rgba(15, 23, 42, 0.85)', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
                {/* Top Row: Deposit Total + Mode Toggles + Supervisor Target Button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ padding: '12px', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
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
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap', marginTop: '2px' }}>
                                <span style={{ fontSize: '28px', fontWeight: 900, color: '#10b981', letterSpacing: '-0.5px' }}>
                                    ฿{displayDepositValue.toLocaleString()}
                                </span>
                                {currentTeamTarget > 0 && (
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>
                                        / {lang === 'TH' ? 'เป้าทีม' : 'Target'} ฿{currentTeamTarget.toLocaleString()}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', background: theme === 'light' ? '#f1f5f9' : 'rgba(0,0,0,0.45)', border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '4px' }}>
                            <button
                                type="button"
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
                                type="button"
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

                        <div style={{ padding: '8px 14px', borderRadius: '12px', background: theme === 'light' ? '#f8fafc' : 'rgba(0,0,0,0.45)', border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{lang === 'TH' ? 'อัตราการปิดฝากสำเร็จ (MC):' : 'MC Deposit Conv. Rate:'}</span>
                            <strong style={{ color: '#10b981', fontSize: '15px', fontWeight: 900 }}>{depositCr}%</strong>
                        </div>

                        {hasSupervisorAccess ? (
                            <button
                                type="button"
                                onClick={() => openTargetModal()}
                                className="btn"
                                style={{
                                    padding: '8px 14px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(16, 185, 129, 0.2))',
                                    border: '1px solid rgba(168, 85, 247, 0.45)',
                                    color: theme === 'light' ? '#6d28d9' : '#e9d5ff',
                                    fontWeight: 700,
                                    fontSize: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    cursor: 'pointer'
                                }}
                                title={lang === 'TH' ? 'กำหนดเป้าหมายยอดฝากรวมและรายบุคคล (Supervisor)' : 'Set Monthly Deposit Targets'}
                            >
                                <Target size={15} style={{ color: '#a855f7' }} />
                                <span>
                                    {currentTeamTarget > 0
                                        ? (lang === 'TH' ? 'แก้ไขเป้าหมายเดือนนี้' : 'Edit Monthly Target')
                                        : (lang === 'TH' ? '🎯 ตั้งเป้าหมายเดือนนี้' : '🎯 Set Monthly Target')}
                                </span>
                                <Pencil size={12} />
                            </button>
                        ) : currentTeamTarget > 0 ? (
                            <div style={{
                                padding: '8px 14px',
                                borderRadius: '12px',
                                background: theme === 'light' ? '#f5f3ff' : 'rgba(168, 85, 247, 0.12)',
                                border: '1px solid rgba(168, 85, 247, 0.3)',
                                color: theme === 'light' ? '#6d28d9' : '#d8b4fe',
                                fontWeight: 700,
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                <Target size={15} style={{ color: '#a855f7' }} />
                                <span>{lang === 'TH' ? `🎯 เป้าหมายทีม: ฿${currentTeamTarget.toLocaleString()}` : `🎯 Team Goal: ฿${currentTeamTarget.toLocaleString()}`}</span>
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* Target Saved Toast Notice */}
                {targetSavedNotice && (
                    <div style={{
                        padding: '8px 14px',
                        borderRadius: '10px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        color: '#34d399',
                        fontSize: '12px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        <CheckCircle2 size={15} />
                        <span>{lang === 'TH' ? 'บันทึกเป้าหมายยอดฝากประจำเดือนและซิงค์ขึ้น Cloud เรียบร้อยแล้ว!' : 'Monthly deposit targets saved & synced to Cloud!'}</span>
                    </div>
                )}

                {/* Team Monthly Target Progress Bar (Visible to Both Supervisor & Agents) */}
                {currentTeamTarget > 0 ? (
                    <div style={{
                        borderTop: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)',
                        paddingTop: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '12.5px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <TrendingUp size={16} style={{ color: teamTargetPct >= 100 ? '#10b981' : teamTargetPct >= 50 ? '#38bdf8' : '#f59e0b' }} />
                                <strong style={{ color: theme === 'light' ? '#0f172a' : '#f8fafc' }}>
                                    {selectedMonth === 'ALL'
                                        ? (lang === 'TH' ? 'ความคืบหน้าเป้าหมายทีม (รวมทุกเดือนที่มีการตั้งเป้า)' : 'Team Target Progress (All Configured Months)')
                                        : (lang === 'TH' ? `ความคืบหน้าเป้าหมายทีมประจำเดือน ${selectedMonth}` : `Team Target Progress (${selectedMonth})`)}
                                </strong>
                                <span style={{
                                    fontSize: '11px',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontWeight: 700,
                                    background: theme === 'light' ? '#f1f5f9' : 'rgba(255,255,255,0.06)',
                                    color: 'var(--text-muted)'
                                }}>
                                    {depositMetricMode === 'FIRST'
                                        ? (lang === 'TH' ? 'เทียบโหมด: ยอดฝากแรก (FTD)' : 'Mode: FTD')
                                        : (lang === 'TH' ? 'เทียบโหมด: ยอดฝากรวมสะสม' : 'Mode: Total Deposits')}
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                {teamTargetRemaining <= 0 ? (
                                    <span style={{
                                        padding: '3px 10px',
                                        borderRadius: '12px',
                                        fontSize: '11.5px',
                                        fontWeight: 800,
                                        background: 'rgba(16, 185, 129, 0.15)',
                                        color: '#10b981',
                                        border: '1px solid rgba(16, 185, 129, 0.35)'
                                    }}>
                                        🎉 {lang === 'TH' ? `ทะลุเป้าหมายแล้ว! (+฿${Math.abs(teamTargetRemaining).toLocaleString()})` : `Target Exceeded! (+฿${Math.abs(teamTargetRemaining).toLocaleString()})`}
                                    </span>
                                ) : (
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                                        {lang === 'TH' ? `ขาดอีก ` : `Remaining: `}
                                        <strong style={{ color: '#fbbf24' }}>฿{teamTargetRemaining.toLocaleString()}</strong>
                                        {lang === 'TH' ? ' จะถึงเป้า' : ' to goal'}
                                    </span>
                                )}
                                <span style={{
                                    fontSize: '13px',
                                    fontWeight: 900,
                                    padding: '2px 10px',
                                    borderRadius: '10px',
                                    background: teamTargetPct >= 100 ? 'rgba(16, 185, 129, 0.2)' : teamTargetPct >= 50 ? 'rgba(56, 189, 248, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                    color: teamTargetPct >= 100 ? '#10b981' : teamTargetPct >= 50 ? '#38bdf8' : '#f59e0b'
                                }}>
                                    {teamTargetPct}%
                                </span>
                            </div>
                        </div>

                        {/* Progress Track */}
                        <div style={{ width: '100%', height: '12px', background: theme === 'light' ? '#e2e8f0' : 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden', position: 'relative' }}>
                            <div style={{
                                width: `${Math.min(100, Math.max(0, teamTargetPct))}%`,
                                height: '100%',
                                borderRadius: '999px',
                                background: teamTargetPct >= 100
                                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                                    : teamTargetPct >= 50
                                        ? 'linear-gradient(90deg, #8b5cf6, #38bdf8)'
                                        : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                                transition: 'width 0.5s ease',
                                boxShadow: '0 0 10px rgba(16, 185, 129, 0.35)'
                            }} />
                        </div>

                        {/* Daily Pace & Personal Agent Target Progress */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            <span>
                                {lang === 'TH'
                                    ? `ทำได้แล้ว: ฿${displayDepositValue.toLocaleString()} จากเป้าหมายรวม ฿${currentTeamTarget.toLocaleString()}`
                                    : `Achieved: ฿${displayDepositValue.toLocaleString()} / ฿${currentTeamTarget.toLocaleString()}`}
                            </span>
                            {dailyPaceStats && (
                                <span style={{ color: theme === 'light' ? '#0284c7' : '#7dd3fc', fontWeight: 600 }}>
                                    💡 {lang === 'TH'
                                        ? `เฉลี่ยต้องทำเพิ่มอีกวันละ ~฿${dailyPaceStats.dailyRequired.toLocaleString()} (เหลืออีก ${dailyPaceStats.remainingDays} วันในเดือนนี้)`
                                        : `Need ~฿${dailyPaceStats.dailyRequired.toLocaleString()}/day (${dailyPaceStats.remainingDays} days left)`}
                                </span>
                            )}
                        </div>

                        {/* Personal Target Progress Bar (for Logged-in Staff who has an individual target) */}
                        {myPersonalStat && myPersonalStat.monthlyTarget > 0 && (
                            <div style={{
                                marginTop: '4px',
                                padding: '10px 14px',
                                borderRadius: '10px',
                                background: theme === 'light' ? '#f8fafc' : 'rgba(255,255,255,0.03)',
                                border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '12px' }}>
                                    <span style={{ fontWeight: 700, color: theme === 'light' ? '#0f172a' : '#f8fafc' }}>
                                        👤 {lang === 'TH' ? `เป้าหมายส่วนตัวของคุณ (${myPersonalStat.name}):` : `Your Personal Target (${myPersonalStat.name}):`}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontWeight: 700, color: '#34d399' }}>
                                            ฿{myPersonalStat.activeDeposit.toLocaleString()}
                                        </span>
                                        <span style={{ color: 'var(--text-muted)' }}>
                                            / ฿{myPersonalStat.monthlyTarget.toLocaleString()}
                                        </span>
                                        <span style={{
                                            fontWeight: 800,
                                            fontSize: '11px',
                                            padding: '1px 7px',
                                            borderRadius: '8px',
                                            background: myPersonalStat.targetPct >= 100 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                                            color: myPersonalStat.targetPct >= 100 ? '#10b981' : '#c084fc'
                                        }}>
                                            {myPersonalStat.targetPct}%
                                        </span>
                                    </div>
                                </div>
                                <div style={{ width: '100%', height: '6px', background: theme === 'light' ? '#e2e8f0' : 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${Math.min(100, Math.max(0, myPersonalStat.targetPct))}%`,
                                        height: '100%',
                                        borderRadius: '999px',
                                        background: myPersonalStat.targetPct >= 100 ? '#10b981' : 'linear-gradient(90deg, #a855f7, #38bdf8)',
                                        transition: 'width 0.4s ease'
                                    }} />
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{
                        borderTop: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.06)',
                        paddingTop: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px',
                        fontSize: '12px',
                        color: 'var(--text-muted)'
                    }}>
                        <span>
                            🎯 {hasSupervisorAccess
                                ? (lang === 'TH' ? 'ยังไม่ได้กำหนดเป้าหมายยอดฝากประจำเดือนนี้ — กดปุ่ม "ตั้งเป้าหมายเดือนนี้" เพื่อกำหนดเป้าทีมและรายบุคคล' : 'No monthly target set yet — click "Set Monthly Target" above.')
                                : (lang === 'TH' ? 'หัวหน้างานยังไม่ได้กำหนดเป้าหมายยอดฝากประจำเดือนนี้' : 'Supervisor has not set a monthly target yet.')}
                        </span>
                    </div>
                )}
            </div>

            {/* Daily Trend Chart (Day 1 to End of Month) */}
            <DailyTrendChart
                dailyTrendStats={dailyTrendStats}
                depositMetricMode={depositMetricMode}
                lang={lang}
                theme={theme}
            />

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
                                                    ฿{ag.activeDeposit.toLocaleString()}
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
                <div className="panel-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                        <PieChart size={18} />
                        <span>{lang === 'TH' ? 'รายงานสถิติยอดติดตามและความสำเร็จแยกตามรายบุคคล' : 'Individual Follow-up & Performance Statistics Report'}</span>
                    </h3>
                    {hasSupervisorAccess && (
                        <button
                            type="button"
                            onClick={() => openTargetModal()}
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: theme === 'light' ? '#6d28d9' : '#d8b4fe', borderColor: 'rgba(168, 85, 247, 0.35)' }}
                        >
                            <Target size={14} style={{ color: '#a855f7' }} />
                            <span>{lang === 'TH' ? 'กำหนดเป้ารายบุคคล' : 'Set Individual Targets'}</span>
                        </button>
                    )}
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
                                <th style={{ textAlign: 'center', color: '#d8b4fe' }}>{lang === 'TH' ? 'เป้าหมาย & ความคืบหน้า' : 'Target & Progress'}</th>
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
                                            <div><strong>฿{stat.activeDeposit.toLocaleString()}</strong></div>
                                        </td>
                                        <td>
                                            {stat.monthlyTarget > 0 ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '130px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                                                        <span style={{ color: 'var(--text-muted)' }}>เป้า ฿{stat.monthlyTarget.toLocaleString()}</span>
                                                        <strong style={{ color: stat.targetPct >= 100 ? '#10b981' : stat.targetPct >= 50 ? '#38bdf8' : '#f59e0b' }}>
                                                            {stat.targetPct}%
                                                        </strong>
                                                    </div>
                                                    <div style={{ width: '100%', height: '6px', background: theme === 'light' ? '#e2e8f0' : 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                                                        <div style={{
                                                            width: `${Math.min(100, Math.max(0, stat.targetPct))}%`,
                                                            height: '100%',
                                                            background: stat.targetPct >= 100 ? '#10b981' : stat.targetPct >= 50 ? '#38bdf8' : '#f59e0b',
                                                            borderRadius: '999px'
                                                        }} />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ textAlign: 'center' }}>
                                                    {hasSupervisorAccess ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => openTargetModal()}
                                                            style={{
                                                                background: 'transparent',
                                                                border: '1px dashed rgba(168, 85, 247, 0.4)',
                                                                color: '#c084fc',
                                                                fontSize: '11px',
                                                                padding: '2px 8px',
                                                                borderRadius: '8px',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            + {lang === 'TH' ? 'ตั้งเป้า' : 'Set'}
                                                        </button>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>-</span>
                                                    )}
                                                </div>
                                            )}
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

            {/* Monthly Deposit Target Setting Modal (Supervisor Only) */}
            {showTargetModal && hasSupervisorAccess && typeof document !== 'undefined' && createPortal(
                <div
                    className="modal-overlay"
                    style={{ zIndex: 1400 }}
                    onClick={() => setShowTargetModal(false)}
                >
                    <div
                        className="modal-content"
                        style={{ maxWidth: '660px', width: '94%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '12px',
                                    background: 'rgba(168, 85, 247, 0.15)',
                                    border: '1px solid rgba(168, 85, 247, 0.35)',
                                    color: '#c084fc',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <Target size={24} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: theme === 'light' ? '#0f172a' : '#ffffff' }}>
                                        {lang === 'TH' ? '🎯 กำหนดเป้าหมายยอดฝากประจำเดือน' : '🎯 Set Monthly Deposit Targets'}
                                    </h3>
                                    <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                                        {lang === 'TH' ? 'กำหนดเป้าทั้งทีมและเป้ารายบุคคล (พนักงานทุกคนจะเห็นแถบความคืบหน้าแบบเรียลไทม์)' : 'Set team & individual targets. Staff will see live progress bars.'}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowTargetModal(false)}
                                className="btn btn-secondary"
                                style={{ padding: '6px', borderRadius: '8px' }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveTargetsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '4px' }}>
                            {/* Month Selector */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', padding: '12px 14px', borderRadius: '12px', background: theme === 'light' ? '#f8fafc' : 'rgba(255,255,255,0.03)', border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)' }}>
                                <label style={{ margin: 0, fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Calendar size={15} style={{ color: 'var(--primary)' }} />
                                    <span>{lang === 'TH' ? 'เลือกรอบเดือนที่จะตั้งเป้า:' : 'Select Target Month:'}</span>
                                </label>
                                <select
                                    className="select-input"
                                    value={editingTargetMonth}
                                    onChange={(e) => handleChangeEditingMonth(e.target.value)}
                                    style={{ minWidth: '160px', fontWeight: 700 }}
                                >
                                    {monthsList.filter(m => m !== 'ALL').map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Section 1: Team Total Target */}
                            <div style={{ padding: '16px', borderRadius: '12px', background: theme === 'light' ? '#f0fdf4' : 'rgba(16, 185, 129, 0.06)', border: theme === 'light' ? '1px solid #bbf7d0' : '1px solid rgba(16, 185, 129, 0.25)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                    <label style={{ margin: 0, fontSize: '13.5px', fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Users size={16} />
                                        <span>{lang === 'TH' ? `1. เป้าหมายยอดฝากรวมของทีม (${editingTargetMonth})` : `1. Team Total Target (${editingTargetMonth})`}</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleSumAgentsToTeamTarget}
                                        className="btn btn-secondary"
                                        style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}
                                        title={lang === 'TH' ? 'รวมตัวเลขจากช่องเป้ารายบุคคลด้านล่างมาใส่เป็นเป้าทีม' : 'Sum individual targets'}
                                    >
                                        <Calculator size={13} />
                                        <span>{lang === 'TH' ? 'รวมยอดจากเป้ารายคน' : 'Sum Agents'}</span>
                                    </button>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '18px', fontWeight: 900, color: '#10b981' }}>฿</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={draftTeamTarget}
                                        onChange={(e) => setDraftTeamTarget(e.target.value)}
                                        placeholder={lang === 'TH' ? 'ระบุยอดเป้าหมายรวมของทีม (เช่น 500000)...' : 'Enter team target amount (e.g. 500000)...'}
                                        style={{ flex: 1, fontSize: '16px', fontWeight: 800, padding: '10px 14px' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {[100000, 300000, 500000, 1000000].map(preset => (
                                        <button
                                            key={preset}
                                            type="button"
                                            onClick={() => setDraftTeamTarget(String(preset))}
                                            className="btn btn-secondary"
                                            style={{ padding: '3px 9px', fontSize: '11px' }}
                                        >
                                            ฿{preset.toLocaleString()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Section 2: Per-Agent Individual Targets */}
                            <div style={{ padding: '16px', borderRadius: '12px', background: theme === 'light' ? '#f8fafc' : 'rgba(255,255,255,0.02)', border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                    <label style={{ margin: 0, fontSize: '13.5px', fontWeight: 800, color: theme === 'light' ? '#0f172a' : '#f8fafc' }}>
                                        {lang === 'TH' ? '2. เป้าหมายยอดฝากแยกตามรายบุคคล (บาท)' : '2. Individual Agent Targets (THB)'}
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleSplitTeamTargetEqually}
                                        disabled={!draftTeamTarget || parseFloat(draftTeamTarget) <= 0}
                                        className="btn btn-secondary"
                                        style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px', color: '#38bdf8' }}
                                        title={lang === 'TH' ? 'นำเป้าหมายรวมของทีมมาหารเฉลี่ยให้พนักงาน MC เท่าๆ กัน' : 'Split team target equally'}
                                    >
                                        <span>⚖️ {lang === 'TH' ? 'แบ่งเป้าทีมเฉลี่ยเท่าๆ กัน' : 'Split Equally'}</span>
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
                                    {(agents || []).filter(a => !a.isArchived && a.isActive !== false).map(ag => (
                                        <div
                                            key={ag.id || ag.name}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '8px 12px',
                                                borderRadius: '10px',
                                                background: theme === 'light' ? '#ffffff' : 'rgba(255,255,255,0.03)',
                                                border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.06)'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: 700, color: theme === 'light' ? '#0f172a' : '#ffffff' }}>
                                                    👤 {ag.name}
                                                </span>
                                                <span style={{
                                                    fontSize: '10px',
                                                    padding: '1px 6px',
                                                    borderRadius: '6px',
                                                    background: ag.role === 'SUPERVISOR' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                                                    color: ag.role === 'SUPERVISOR' ? '#fbbf24' : '#c084fc',
                                                    fontWeight: 700
                                                }}>
                                                    {ag.role === 'SUPERVISOR' ? 'Supervisor' : 'MC Agent'}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '165px' }}>
                                                <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 700 }}>฿</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    value={draftAgentTargets[ag.name] !== undefined ? draftAgentTargets[ag.name] : ''}
                                                    onChange={(e) => setDraftAgentTargets(prev => ({ ...prev, [ag.name]: e.target.value }))}
                                                    placeholder="0"
                                                    style={{ width: '100%', padding: '6px 10px', fontSize: '13px', fontWeight: 700, textAlign: 'right' }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowTargetModal(false)}
                                    className="btn btn-secondary"
                                    style={{ padding: '10px 18px', fontSize: '13px' }}
                                >
                                    {lang === 'TH' ? 'ยกเลิก' : 'Cancel'}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingTargets}
                                    className="btn btn-primary"
                                    style={{
                                        padding: '10px 22px',
                                        fontSize: '13.5px',
                                        fontWeight: 700,
                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        border: 'none',
                                        color: '#ffffff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '7px',
                                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                                    }}
                                >
                                    <Check size={16} />
                                    <span>{isSavingTargets ? (lang === 'TH' ? 'กำลังบันทึก...' : 'Saving...') : (lang === 'TH' ? 'บันทึกเป้าหมายขึ้น Cloud' : 'Save Targets to Cloud')}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default DashboardView;

