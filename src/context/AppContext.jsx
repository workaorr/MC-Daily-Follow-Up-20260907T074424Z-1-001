// Global App Context for MC Daily Follow Up CRM
import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { SUPABASE_CONFIG, APP_CONFIG } from '../constants/config';
import { DEFAULT_AGENTS, normalizeAgent } from '../constants/defaultAgents';
import { DEFAULT_SOURCE_CHANNELS } from '../constants/channels';
import { getCurrentMonthStr } from '../utils/dateFormatters';
import { createSupabaseInstance, getStoredSupabaseCredentials, pushAgentToCloud } from '../services/supabase';
import { createLogEntry, persistLogToCloud } from '../services/auditLogger';

const AppContext = createContext(null);

const mergeFollowUpByMonth = (rawFollowUp, rawFollowUpByMonth) => {
    const fUp = rawFollowUp && typeof rawFollowUp === 'object' ? rawFollowUp : {};
    const fByMonth = rawFollowUpByMonth && typeof rawFollowUpByMonth === 'object' ? { ...rawFollowUpByMonth } : {};
    Object.keys(fUp).forEach((k) => {
        if (/^\d{4}-\d{2}$/.test(k) && fUp[k] && typeof fUp[k] === 'object') {
            fByMonth[k] = { ...(fByMonth[k] || {}), ...fUp[k] };
        }
    });
    return fByMonth;
};

const extractNextFollowUpDate = (row) => {
    return (
        row.next_follow_up_date ||
        (row.follow_up_by_month && row.follow_up_by_month._meta && row.follow_up_by_month._meta.nextFollowUpDate) ||
        (row.follow_up && row.follow_up._meta && row.follow_up._meta.nextFollowUpDate) ||
        row.nextFollowUpDate ||
        null
    );
};

export const useApp = () => {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used within an AppProvider');
    return ctx;
};

export const AppProvider = ({ children }) => {
    // --- ROUTING / VIEW MODE ---
    const getInitialViewMode = () => {
        if (typeof window === 'undefined') return 'supervisor';
        const searchParams = new URLSearchParams(window.location.search);
        const viewParam = searchParams.get('view');
        const validModes = ['supervisor', 'agent', 'upload-deposits', 'new-customer', 'audit', 'backoffice', 'audit-logs', 'reports', 'recycle-bin'];
        if (validModes.includes(viewParam)) return viewParam;
        const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
        if (validModes.includes(path)) return path;
        const saved = localStorage.getItem('mc_view_mode');
        if (validModes.includes(saved) && saved !== 'reports') return saved;
        return 'supervisor';
    };

    const [viewMode, setViewModeState] = useState(getInitialViewMode);
    const setViewMode = (mode) => {
        try {
            localStorage.setItem('mc_view_mode', mode);
            setViewModeState(mode);
            const searchParams = new URLSearchParams(window.location.search);
            searchParams.set('view', mode);
            window.history.pushState(null, '', '/?' + searchParams.toString());
        } catch (e) {
            setViewModeState(mode);
        }
    };

    useEffect(() => {
        const handlePopState = () => {
            const searchParams = new URLSearchParams(window.location.search);
            const viewParam = searchParams.get('view');
            const validModes = ['supervisor', 'agent', 'upload-deposits', 'new-customer', 'audit', 'backoffice', 'audit-logs', 'reports', 'recycle-bin'];
            if (validModes.includes(viewParam)) {
                setViewModeState(viewParam);
            } else {
                const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
                if (validModes.includes(path)) {
                    setViewModeState(path);
                }
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // --- CAMPAIGN MONTH ---
    const currentMonthStr = getCurrentMonthStr();
    const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

    const daysInMonth = useMemo(() => {
        try {
            const [yr, mn] = selectedMonth.split('-');
            return new Date(parseInt(yr), parseInt(mn), 0).getDate();
        } catch (e) {
            return 31;
        }
    }, [selectedMonth]);

    // --- I18N & THEME ---
    const [lang, setLangState] = useState(() => {
        if (typeof window === 'undefined') return 'TH';
        const params = new URLSearchParams(window.location.search);
        return (params.get('lang') || localStorage.getItem('mc_lang') || 'TH').toUpperCase();
    });
    const setLang = (newLang) => {
        localStorage.setItem('mc_lang', newLang);
        setLangState(newLang);
    };

    const [theme, setThemeState] = useState(() => {
        if (typeof window === 'undefined') return 'dark';
        const params = new URLSearchParams(window.location.search);
        return params.get('theme') || localStorage.getItem('mc_theme') || 'dark';
    });

    const toggleTheme = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
    };

    const applyThemeToDom = (nextTheme) => {
        if (typeof document === 'undefined') return;
        const root = document.documentElement;
        if (nextTheme === 'light') {
            root.classList.add('light-theme');
            root.style.backgroundColor = '#f1f5f9';
            root.style.colorScheme = 'light';
            document.body.classList.add('light-theme');
        } else {
            root.classList.remove('light-theme');
            root.style.backgroundColor = '#060913';
            root.style.colorScheme = 'dark';
            document.body.classList.remove('light-theme');
        }
    };

    const setTheme = (nextTheme) => {
        applyThemeToDom(nextTheme);
        localStorage.setItem('mc_theme', nextTheme);
        setThemeState(nextTheme);
    };

    useEffect(() => {
        applyThemeToDom(theme);
    }, [theme]);

    // --- AGENTS & AUTH ---
    const [agents, setAgents] = useState(() => {
        try {
            const saved = localStorage.getItem('mc_agents');
            const parsed = saved ? JSON.parse(saved) : null;
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map((a, i) => normalizeAgent(a, i));
            }
            return DEFAULT_AGENTS;
        } catch (e) {
            return DEFAULT_AGENTS;
        }
    });

    const [activeAgentName, setActiveAgentName] = useState(() => {
        if (typeof window === 'undefined') return '';
        const queryAgent = new URLSearchParams(window.location.search).get('agent');
        if (queryAgent) return queryAgent;
        if (localStorage.getItem('mc_logged_out') === 'true') return '';
        const saved = localStorage.getItem('mc_active_agent_name');
        return saved || '';
    });

    const activeAgent = useMemo(() => {
        return (agents || []).find(a => a.name === activeAgentName) || null;
    }, [agents, activeAgentName]);

    const isSupervisor = useMemo(() => {
        return activeAgent?.role === 'SUPERVISOR';
    }, [activeAgent]);

    // --- MONTHLY DEPOSIT TARGETS ---
    const [teamMonthlyTargets, setTeamMonthlyTargets] = useState(() => {
        try {
            const saved = localStorage.getItem('mc_team_monthly_targets');
            const parsed = saved ? JSON.parse(saved) : {};
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (e) {
            return {};
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('mc_team_monthly_targets', JSON.stringify(teamMonthlyTargets));
        } catch (e) {}
    }, [teamMonthlyTargets]);

    useEffect(() => {
        if (activeAgentName) {
            localStorage.setItem('mc_active_agent_name', activeAgentName);
            localStorage.removeItem('mc_logged_out');
        } else {
            localStorage.removeItem('mc_active_agent_name');
        }
    }, [activeAgentName]);

    // --- CUSTOMERS & RECYCLE BIN ---
    const [customers, setCustomers] = useState(() => {
        try {
            const saved = localStorage.getItem('mc_customers');
            const parsed = saved ? JSON.parse(saved) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('mc_customers', JSON.stringify(customers));
        } catch (e) {}
    }, [customers]);

    const [deletedCustomers, setDeletedCustomers] = useState(() => {
        try {
            const saved = localStorage.getItem('mc_deleted_customers');
            const parsed = saved ? JSON.parse(saved) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('mc_deleted_customers', JSON.stringify(deletedCustomers));
        } catch (e) {}
    }, [deletedCustomers]);

    // --- LOGS ---
    const [logs, setLogs] = useState(() => {
        try {
            const saved = localStorage.getItem('mc_logs');
            const parsed = saved ? JSON.parse(saved) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('mc_logs', JSON.stringify(logs));
        } catch (e) {}
    }, [logs]);

    const [totalCloudLogsCount, setTotalCloudLogsCount] = useState(null);

    // --- MARKETING CHANNELS ---
    const [sourceChannels, setSourceChannels] = useState(() => {
        try {
            const saved = localStorage.getItem('mc_source_channels');
            const parsed = saved ? JSON.parse(saved) : null;
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            return DEFAULT_SOURCE_CHANNELS;
        } catch (e) {
            return DEFAULT_SOURCE_CHANNELS;
        }
    });

    const [sourceChannelsMeta, setSourceChannelsMeta] = useState(() => {
        try {
            const saved = localStorage.getItem('mc_source_channels_meta');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            return {};
        }
    });

    // --- SUPABASE CLIENT ---
    const initialCreds = getStoredSupabaseCredentials();
    const [supabaseUrl, setSupabaseUrl] = useState(initialCreds.url);
    const [supabaseKey, setSupabaseKey] = useState(initialCreds.key);
    const [supabaseClient, setSupabaseClient] = useState(() => createSupabaseInstance(initialCreds.url, initialCreds.key));
    const supabaseClientRef = useRef(supabaseClient);
    supabaseClientRef.current = supabaseClient;

    const [lastKeepAliveTime, setLastKeepAliveTime] = useState(null);

    // --- MODALS & TOUR STATES ---
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(() => {
        if (typeof window === 'undefined') return false;
        const queryAgent = new URLSearchParams(window.location.search).get('agent');
        if (queryAgent) return false;
        return (!localStorage.getItem('mc_active_agent_name') || localStorage.getItem('mc_logged_out') === 'true');
    });

    const [isLockedDueToInactivity, setIsLockedDueToInactivity] = useState(false);
    const [showDbSettings, setShowDbSettings] = useState(false);
    const [isTourActive, setIsTourActive] = useState(false);
    const [tourStep, setTourStep] = useState(0);

    const [selectedCustForModal, setSelectedCustForModal] = useState(null);
    const [addConfirmModalData, setAddConfirmModalData] = useState(null);
    const [addSuccessModalData, setAddSuccessModalData] = useState(null);
    const [showChangePasscodeModal, setShowChangePasscodeModal] = useState(false);
    const [archiveAgentModalData, setArchiveAgentModalData] = useState(null);

    // --- CENTRAL LOGGER ---
    const writeLog = (tag, msg, type = 'info', operator = null) => {
        const op = operator || activeAgentName || 'System';
        const entry = createLogEntry(tag, msg, type, op);

        setLogs(prev => {
            const arr = Array.isArray(prev) ? prev : [];
            return [entry, ...arr.slice(0, 299)];
        });

        const client = supabaseClientRef.current || supabaseClient;
        if (client) {
            persistLogToCloud(entry, client);
        }
    };

    // --- SUPABASE DATA FETCHER ---
    const fetchDataFromSupabase = async (client) => {
        if (!client) return;
        writeLog('SUPABASE', 'กำลังดาวน์โหลดฐานข้อมูล MC จากคลาวด์...', 'info');
        try {
            // 1. Fetch Customers
            const { data: dbCusts, error: custsError } = await client
                .from('mc_customers')
                .select('*')
                .order('created_at', { ascending: false });

            if (custsError) throw custsError;

            if (dbCusts && dbCusts.length > 0) {
                const activeList = [];
                const cloudDeletedList = [];

                dbCusts.forEach(c => {
                    const isArchived = Boolean(
                        (c.follow_up_by_month && c.follow_up_by_month._archived && c.follow_up_by_month._archived.isArchived) ||
                        (c.follow_up && c.follow_up._archived && c.follow_up._archived.isArchived) ||
                        c.is_deleted
                    );
                    const archiveMeta = (c.follow_up_by_month && c.follow_up_by_month._archived) || 
                                        (c.follow_up && c.follow_up._archived) || {};

                    const nextFollowUpDate = extractNextFollowUpDate(c);

                    const mappedCust = {
                        id: c.id,
                        createdAt: c.created_at || new Date().toISOString(),
                        username: (c.username || '').trim(),
                        fullName: (c.full_name || c.fullname || c.name || c.customer_name || c.fullName || '').trim(),
                        phone: c.phone || '',
                        lineOA: c.line_oa || '',
                        lineLek: c.line_lek || '',
                        sourceChannel: c.source_channel || 'Facebook',
                        referrer: c.referrer || '',
                        totalDeposit: parseFloat(c.total_deposit || 0),
                        createdBy: c.created_by || 'ระบบกลาง',
                        updatedBy: c.updated_by || null,
                        updatedAt: c.updated_at || null,
                        campaignMonth: c.campaign_month || (c.created_at ? c.created_at.substring(0, 7) : currentMonthStr),
                        followUp: typeof c.follow_up === 'object' && c.follow_up !== null ? c.follow_up : {},
                        followUpByMonth: mergeFollowUpByMonth(c.follow_up, c.follow_up_by_month),
                        notes: c.notes || '',
                        nextFollowUpDate: nextFollowUpDate,
                        hasDeposited: c.has_deposited || false,
                        returnedDepositAmount: parseFloat(c.returned_deposit_amount || 0),
                        deletedAt: archiveMeta.archivedAt || c.deleted_at || null,
                        deletedBy: archiveMeta.archivedBy || c.deleted_by || 'Supervisor',
                        isDeleted: isArchived
                    };

                    if (isArchived) {
                        cloudDeletedList.push(mappedCust);
                    } else {
                        activeList.push(mappedCust);
                    }
                });

                // Auto-preserve and push any unsynced local customers
                try {
                    const savedLocal = JSON.parse(localStorage.getItem('mc_customers') || '[]');
                    const cloudIdSet = new Set(dbCusts.map(dc => String(dc.id)));
                    const unsynced = savedLocal.filter(lc => lc && lc.id && !cloudIdSet.has(String(lc.id)) && !lc.deletedAt);
                    if (unsynced.length > 0) {
                        unsynced.forEach(uc => {
                            activeList.unshift(uc);
                            pushCustomerToCloud(client, uc);
                        });
                    }
                } catch (e) {}

                setCustomers(activeList);
                try { localStorage.setItem('mc_customers', JSON.stringify(activeList)); } catch (e) {}

                setDeletedCustomers(prev => {
                    const map = new Map();
                    cloudDeletedList.forEach(item => map.set(item.id || item.username, item));
                    (Array.isArray(prev) ? prev : []).forEach(item => {
                        const key = item.id || item.username;
                        if (!map.has(key)) map.set(key, item);
                    });
                    const merged = Array.from(map.values());
                    try { localStorage.setItem('mc_deleted_customers', JSON.stringify(merged)); } catch (e) {}
                    return merged;
                });

                writeLog('SUPABASE', `ดาวน์โหลดข้อมูลลูกค้าของ MC สำเร็จ: นำเข้ารายชื่อ ${activeList.length} คน (ในถังขยะ ${cloudDeletedList.length} คน)`, 'success');
            }

            // 2. Fetch Agents
            const { data: dbAgents, error: agentsError } = await client
                .from('mc_agents')
                .select('*')
                .order('name', { ascending: true });

            if (!agentsError && dbAgents && dbAgents.length > 0) {
                let cloudTeamTargets = {};
                setAgents(prev => {
                    const prevList = Array.isArray(prev) && prev.length > 0 ? prev : DEFAULT_AGENTS;
                    const prevMap = new Map(prevList.map(a => [a.name, a]));
                    const normalized = dbAgents.map((a, i) => {
                        const existing = prevMap.get(a.name) || {};
                        const merged = { ...existing, ...a };
                        if (a.is_active !== undefined) merged.isActive = Boolean(a.is_active);
                        if (a.last_login_at !== undefined) merged.lastLoginAt = a.last_login_at;
                        const norm = normalizeAgent(merged, i);
                        if (norm.permissions && norm.permissions.teamMonthlyTargets && typeof norm.permissions.teamMonthlyTargets === 'object') {
                            cloudTeamTargets = { ...cloudTeamTargets, ...norm.permissions.teamMonthlyTargets };
                        }
                        return norm;
                    });
                    DEFAULT_AGENTS.forEach((defAgent, defIdx) => {
                        if (!normalized.some(a => a.name === defAgent.name)) {
                            normalized.push(normalizeAgent(defAgent, normalized.length + defIdx));
                        }
                    });
                    try { localStorage.setItem('mc_agents', JSON.stringify(normalized)); } catch (e) {}
                    return normalized;
                });
                if (Object.keys(cloudTeamTargets).length > 0) {
                    setTeamMonthlyTargets(prev => ({ ...(prev || {}), ...cloudTeamTargets }));
                }
                writeLog('SUPABASE', `ดาวน์โหลดรายชื่อเจ้าหน้าที่ MC สำเร็จ: ${dbAgents.length} คน`, 'success');
            }

            // 3. Fetch Audit Logs
            const { data: dbLogs, error: logsError, count } = await client
                .from('mc_logs')
                .select('*', { count: 'exact' })
                .order('id', { ascending: false })
                .range(0, 299);

            if (count !== null && count !== undefined) {
                setTotalCloudLogsCount(count);
            }

            if (!logsError && dbLogs && dbLogs.length > 0) {
                const mappedLogs = dbLogs.map(l => {
                    const d = l.created_at ? new Date(l.created_at) : new Date();
                    return {
                        id: l.id,
                        time: d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('th-TH'),
                        tag: l.tag || 'SYSTEM',
                        msg: l.msg || '',
                        type: l.type || 'info',
                        operator: l.operator || 'System'
                    };
                });
                setLogs(mappedLogs);
            }

            // 4. Attach Realtime Subscriptions
            try {
                client.channel('realtime:mc_logs')
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mc_logs' }, (payload) => {
                        if (payload && payload.new) {
                            const r = payload.new;
                            const d = r.created_at ? new Date(r.created_at) : new Date();
                            const rtItem = {
                                id: r.id,
                                time: d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('th-TH'),
                                tag: r.tag || 'SYSTEM',
                                msg: r.msg || '',
                                type: r.type || 'info',
                                operator: r.operator || 'System'
                            };
                            setLogs(prev => {
                                const cur = Array.isArray(prev) ? prev : [];
                                if (cur.some(x => x.id === r.id || (x.msg === rtItem.msg && x.tag === rtItem.tag))) {
                                    return cur;
                                }
                                return [rtItem, ...cur.slice(0, 299)];
                            });
                        }
                    })
                    .subscribe();
            } catch (e) {
                console.warn('Realtime mc_logs subscription error:', e);
            }

            try {
                client.channel('realtime:mc_customers')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'mc_customers' }, (payload) => {
                        if (!payload) return;
                        const eventType = payload.eventType;
                        if (eventType === 'INSERT') {
                            const r = payload.new;
                            if (!r || !r.id) return;
                            const newCust = {
                                id: r.id,
                                createdAt: r.created_at || new Date().toISOString(),
                                username: (r.username || '').trim(),
                                fullName: (r.full_name || r.fullname || r.name || r.customer_name || '').trim(),
                                phone: r.phone || '',
                                lineOA: r.line_oa || '',
                                lineLek: r.line_lek || '',
                                sourceChannel: r.source_channel || 'Facebook',
                                referrer: r.referrer || '',
                                totalDeposit: parseFloat(r.total_deposit || 0),
                                createdBy: r.created_by || 'ระบบกลาง',
                                updatedBy: r.updated_by || null,
                                updatedAt: r.updated_at || null,
                                campaignMonth: r.campaign_month || (r.created_at ? r.created_at.substring(0, 7) : currentMonthStr),
                                followUp: typeof r.follow_up === 'object' && r.follow_up !== null ? r.follow_up : {},
                                followUpByMonth: mergeFollowUpByMonth(r.follow_up, r.follow_up_by_month),
                                notes: r.notes || '',
                                nextFollowUpDate: extractNextFollowUpDate(r),
                                hasDeposited: r.has_deposited || false,
                                returnedDepositAmount: parseFloat(r.returned_deposit_amount || 0)
                            };
                            setCustomers(prev => {
                                const cur = Array.isArray(prev) ? prev : [];
                                if (cur.some(x => x.id === newCust.id)) {
                                    return cur.map(x => x.id === newCust.id ? { ...x, ...newCust } : x);
                                }
                                return [newCust, ...cur];
                            });
                        } else if (eventType === 'UPDATE') {
                            const r = payload.new;
                            if (!r || !r.id) return;
                            const isArchived = Boolean(
                                (r.follow_up_by_month && r.follow_up_by_month._archived && r.follow_up_by_month._archived.isArchived) ||
                                (r.follow_up && r.follow_up._archived && r.follow_up._archived.isArchived) ||
                                r.is_deleted
                            );
                            if (isArchived) {
                                setCustomers(prev => (Array.isArray(prev) ? prev : []).filter(c => c.id !== r.id));
                            } else {
                                setCustomers(prev => {
                                    const cur = Array.isArray(prev) ? prev : [];
                                    const existingCust = cur.find(c => c.id === r.id);
                                    const exists = Boolean(existingCust);
                                    const nextFollowUpRaw = r.follow_up !== undefined
                                        ? (typeof r.follow_up === 'object' && r.follow_up !== null ? r.follow_up : {})
                                        : (existingCust?.followUp || {});
                                    const nextFollowUpByMonthRaw = r.follow_up_by_month !== undefined
                                        ? (typeof r.follow_up_by_month === 'object' && r.follow_up_by_month !== null ? r.follow_up_by_month : {})
                                        : (existingCust?.followUpByMonth || {});
                                    const updatedCust = {
                                        id: r.id,
                                        createdAt: r.created_at || new Date().toISOString(),
                                        username: r.username !== undefined ? (r.username || '').trim() : '',
                                        fullName: r.full_name !== undefined ? (r.full_name || '').trim() : '',
                                        phone: r.phone !== undefined ? r.phone : '',
                                        lineOA: r.line_oa !== undefined ? r.line_oa : '',
                                        lineLek: r.line_lek !== undefined ? r.line_lek : '',
                                        sourceChannel: r.source_channel !== undefined ? r.source_channel : 'Facebook',
                                        referrer: r.referrer !== undefined ? (r.referrer || '') : '',
                                        totalDeposit: r.total_deposit !== undefined ? parseFloat(r.total_deposit || 0) : 0,
                                        createdBy: r.created_by !== undefined ? r.created_by : 'ระบบกลาง',
                                        updatedBy: r.updated_by !== undefined ? r.updated_by : (existingCust?.updatedBy || null),
                                        updatedAt: r.updated_at !== undefined ? r.updated_at : (existingCust?.updatedAt || null),
                                        campaignMonth: r.campaign_month !== undefined ? r.campaign_month : currentMonthStr,
                                        followUp: nextFollowUpRaw,
                                        followUpByMonth: mergeFollowUpByMonth(nextFollowUpRaw, nextFollowUpByMonthRaw),
                                        notes: r.notes !== undefined ? r.notes : '',
                                        nextFollowUpDate: extractNextFollowUpDate(r) || existingCust?.nextFollowUpDate || null,
                                        hasDeposited: r.has_deposited !== undefined ? r.has_deposited : false,
                                        returnedDepositAmount: r.returned_deposit_amount !== undefined ? parseFloat(r.returned_deposit_amount || 0) : 0
                                    };
                                    if (exists) {
                                        return cur.map(c => c.id === r.id ? { ...c, ...updatedCust } : c);
                                    }
                                    return [updatedCust, ...cur];
                                });
                            }
                        } else if (eventType === 'DELETE') {
                            const r = payload.old;
                            if (r && r.id) {
                                setCustomers(prev => (Array.isArray(prev) ? prev : []).filter(c => c.id !== r.id));
                            }
                        }
                    })
                    .subscribe();
            } catch (e) {
                console.warn('Realtime mc_customers subscription error:', e);
            }

            try {
                client.channel('realtime:mc_agents')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'mc_agents' }, (payload) => {
                        if (!payload || !payload.new) return;
                        const r = payload.new;
                        if (!r.name) return;
                        const norm = normalizeAgent(r);
                        setAgents(prev => {
                            const cur = Array.isArray(prev) ? prev : [];
                            const exists = cur.some(a => a.name === norm.name);
                            const next = exists
                                ? cur.map(a => a.name === norm.name ? { ...a, ...norm } : a)
                                : [...cur, norm];
                            try { localStorage.setItem('mc_agents', JSON.stringify(next)); } catch (e) {}
                            return next;
                        });
                        if (norm.permissions?.teamMonthlyTargets && typeof norm.permissions.teamMonthlyTargets === 'object') {
                            setTeamMonthlyTargets(prev => ({ ...(prev || {}), ...norm.permissions.teamMonthlyTargets }));
                        }
                    })
                    .subscribe();
            } catch (e) {
                console.warn('Realtime mc_agents subscription error:', e);
            }

        } catch (e) {
            writeLog('SUPABASE', `ดาวน์โหลดฐานข้อมูลคลาวด์ล้มเหลว: ${e.message}`, 'danger');
        }
    };

    // --- SAVE MONTHLY TARGETS (TEAM & PER-AGENT) ---
    const saveMonthlyTargets = async (monthStr, teamTargetVal, agentTargetsMap = {}) => {
        if (!isSupervisor) return { success: false, error: 'Supervisor only' };
        const cleanMonth = monthStr || currentMonthStr;
        const parsedTeamTarget = Math.max(0, parseFloat(teamTargetVal || 0) || 0);

        const nextTeamTargets = {
            ...(teamMonthlyTargets || {}),
            [cleanMonth]: parsedTeamTarget
        };
        setTeamMonthlyTargets(nextTeamTargets);

        const updatedAgentsList = (agents || []).map((ag) => {
            const hasIndividualUpdate = Object.prototype.hasOwnProperty.call(agentTargetsMap, ag.name);
            const isTargetOwner = ag.name === activeAgentName || ag.role === 'SUPERVISOR';
            if (!hasIndividualUpdate && !isTargetOwner) return ag;

            const existingMonthlyTargets = (ag.permissions && ag.permissions.monthlyTargets) || {};
            const nextMonthlyTargets = hasIndividualUpdate
                ? { ...existingMonthlyTargets, [cleanMonth]: Math.max(0, parseFloat(agentTargetsMap[ag.name] || 0) || 0) }
                : existingMonthlyTargets;

            const nextPermissions = {
                ...(ag.permissions || {}),
                monthlyTargets: nextMonthlyTargets
            };

            if (ag.name === activeAgentName || ag.role === 'SUPERVISOR') {
                nextPermissions.teamMonthlyTargets = nextTeamTargets;
            }

            return {
                ...ag,
                permissions: nextPermissions
            };
        });

        setAgents(updatedAgentsList);
        try { localStorage.setItem('mc_agents', JSON.stringify(updatedAgentsList)); } catch (e) {}

        const client = supabaseClientRef.current || supabaseClient;
        if (client) {
            for (const ag of updatedAgentsList) {
                const changed = Object.prototype.hasOwnProperty.call(agentTargetsMap, ag.name) || ag.name === activeAgentName || ag.role === 'SUPERVISOR';
                if (changed) {
                    await pushAgentToCloud(client, ag);
                }
            }
        }

        const agentSummary = Object.entries(agentTargetsMap)
            .filter(([, v]) => parseFloat(v || 0) > 0)
            .map(([name, v]) => `${name}: ฿${Number(v).toLocaleString()}`)
            .join(', ');

        writeLog(
            'TARGET_UPDATE',
            `🎯 ตั้งเป้าหมายยอดฝากเดือน ${cleanMonth} | เป้าทีม: ฿${parsedTeamTarget.toLocaleString()}${agentSummary ? ` | เป้ารายคน: [${agentSummary}]` : ''}`,
            'success',
            activeAgentName
        );

        return { success: true };
    };

    // --- INITIAL DATA FETCH & CONNECTION EFFECT ---
    useEffect(() => {
        if (supabaseClient) {
            fetchDataFromSupabase(supabaseClient);
        }
    }, [supabaseClient]);

    // --- KEEP-ALIVE ENGINE (Prevents free tier pause) ---
    useEffect(() => {
        if (!supabaseClient) return;
        const sendPing = async () => {
            try {
                const { error } = await supabaseClient.from('mc_agents').select('id').limit(1);
                if (!error) {
                    setLastKeepAliveTime(new Date().toLocaleTimeString('th-TH'));
                }
            } catch (e) {}
        };
        sendPing();
        const interval = setInterval(sendPing, 4 * 60 * 1000);
        return () => clearInterval(interval);
    }, [supabaseClient]);

    // --- 15-MINUTE INACTIVITY AUTO-LOCK ---
    const lastActivityRef = useRef(Date.now());
    useEffect(() => {
        const handleActivity = () => {
            lastActivityRef.current = Date.now();
        };
        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
        events.forEach(evt => window.addEventListener(evt, handleActivity, { passive: true }));

        const checkIdle = setInterval(() => {
            if (!activeAgentName || isLoginModalOpen) return;
            const idle = Date.now() - lastActivityRef.current;
            if (idle >= APP_CONFIG.INACTIVITY_LOCK_MS) {
                setIsLockedDueToInactivity(true);
                setIsLoginModalOpen(true);
                writeLog('SESSION', `🔒 ล็อกหน้าจออัตโนมัติเนื่องจากไม่มีการใช้งานเกิน 15 นาที (${activeAgentName})`, 'warning', activeAgentName);
            }
        }, 15000);

        return () => {
            events.forEach(evt => window.removeEventListener(evt, handleActivity));
            clearInterval(checkIdle);
        };
    }, [activeAgentName, isLoginModalOpen]);

    const value = {
        // Navigation & Route
        viewMode,
        setViewMode,
        selectedMonth,
        setSelectedMonth,
        daysInMonth,
        lang,
        setLang,
        theme,
        setTheme,
        toggleTheme,

        // Staff & Auth
        agents,
        setAgents,
        activeAgentName,
        setActiveAgentName,
        activeAgent,
        isSupervisor,
        teamMonthlyTargets,
        setTeamMonthlyTargets,
        saveMonthlyTargets,

        // Data Models
        customers,
        setCustomers,
        deletedCustomers,
        setDeletedCustomers,
        logs,
        setLogs,
        totalCloudLogsCount,
        setTotalCloudLogsCount,
        sourceChannels,
        setSourceChannels,
        sourceChannelsMeta,
        setSourceChannelsMeta,

        // Cloud & Logging
        supabaseUrl,
        setSupabaseUrl,
        supabaseKey,
        setSupabaseKey,
        supabaseClient,
        setSupabaseClient,
        lastKeepAliveTime,
        writeLog,
        fetchDataFromSupabase,

        // Modals & Tour
        isLoginModalOpen,
        setIsLoginModalOpen,
        isLockedDueToInactivity,
        setIsLockedDueToInactivity,
        showDbSettings,
        setShowDbSettings,
        isTourActive,
        setIsTourActive,
        tourStep,
        setTourStep,
        selectedCustForModal,
        setSelectedCustForModal,
        addConfirmModalData,
        setAddConfirmModalData,
        addSuccessModalData,
        setAddSuccessModalData,
        showChangePasscodeModal,
        setShowChangePasscodeModal,
        archiveAgentModalData,
        setArchiveAgentModalData
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};
