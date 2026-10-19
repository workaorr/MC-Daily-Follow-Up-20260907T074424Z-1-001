// Staff Login Component (Full-page & Modal Mode)
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { verifyPasscode, hashPasscode } from '../../utils/auth';
import { APP_CONFIG } from '../../constants/config';
import { pushAgentToCloud } from '../../services/supabase';
import { 
    PhoneOutgoing, 
    Lock, 
    LogIn, 
    Eye, 
    EyeOff, 
    Globe, 
    Sun, 
    Moon, 
    X,
    ShieldCheck,
    CheckCircle2
} from 'lucide-react';

export const LoginModal = ({ isOpen, onClose, isFullscreen = false }) => {
    const { 
        agents, 
        setAgents, 
        activeAgentName, 
        setActiveAgentName, 
        lang, 
        setLang, 
        theme, 
        toggleTheme, 
        supabaseClient, 
        writeLog,
        isLockedDueToInactivity,
        setIsLockedDueToInactivity,
        setIsLoginModalOpen
    } = useApp();

    const [selectedAgentName, setSelectedAgentName] = useState(() => {
        if (activeAgentName) return activeAgentName;
        const lastSaved = localStorage.getItem('mc_last_selected_agent');
        if (lastSaved) return lastSaved;
        const firstActive = (agents || []).find(a => !a.isArchived && a.isActive !== false);
        return firstActive ? firstActive.name : ((agents && agents[0]) ? agents[0].name : '');
    });
    const [passwordInput, setPasswordInput] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [lockoutUntil, setLockoutUntil] = useState(0);
    const [lockoutRemaining, setLockoutRemaining] = useState(0);

    // Supervisor Quick Unlock state
    const supervisorsList = useMemo(() => {
        return (agents || []).filter(a => a.role === 'SUPERVISOR' && !a.isArchived && a.isActive !== false);
    }, [agents]);

    const [showSuperUnlock, setShowSuperUnlock] = useState(false);
    const [superUnlockName, setSuperUnlockName] = useState('');
    const [superUnlockPasscode, setSuperUnlockPasscode] = useState('');
    const [superNewPassForAgent, setSuperNewPassForAgent] = useState('1234');
    const [superUnlockError, setSuperUnlockError] = useState('');
    const [superUnlockSuccess, setSuperUnlockSuccess] = useState('');

    useEffect(() => {
        if (!superUnlockName && supervisorsList.length > 0) {
            setSuperUnlockName(supervisorsList[0].name);
        }
    }, [supervisorsList, superUnlockName]);

    // Matched agent lookup
    const matchedAgent = useMemo(() => {
        return (agents || []).find(a => a.name === selectedAgentName) || null;
    }, [agents, selectedAgentName]);

    // Keep selectedAgentName in sync with activeAgentName or fallback
    useEffect(() => {
        if (activeAgentName) {
            setSelectedAgentName(activeAgentName);
        } else if (!selectedAgentName && agents && agents.length > 0) {
            const lastSaved = localStorage.getItem('mc_last_selected_agent');
            const foundSaved = agents.find(a => a.name === lastSaved && !a.isArchived && a.isActive !== false);
            if (foundSaved) {
                setSelectedAgentName(foundSaved.name);
            } else {
                const firstActive = agents.find(a => !a.isArchived && a.isActive !== false);
                if (firstActive) setSelectedAgentName(firstActive.name);
            }
        }
    }, [activeAgentName, agents, selectedAgentName]);

    // Auto-detect locked account when selected
    useEffect(() => {
        if (matchedAgent && matchedAgent.isLocked) {
            setShowSuperUnlock(true);
            setErrorMsg(lang === 'TH' 
                ? `🔒 บัญชี [${matchedAgent.name}] ถูกระงับการใช้งานเนื่องจากกรอกรหัสผ่านผิดครบ 3 ครั้ง กรุณาให้หัวหน้า (Supervisor) ปลดล็อกด้านล่าง หรือเลือกบัญชีพนักงานท่านอื่น` 
                : `🔒 Account [${matchedAgent.name}] is locked due to 3 failed attempts. Please unlock below or switch account.`);
        } else {
            setShowSuperUnlock(false);
            setSuperUnlockError('');
        }
    }, [matchedAgent, lang]);

    if (!isOpen && !isFullscreen) return null;

    // Supervisor in-place unlock handler
    const handleSupervisorDirectUnlock = async () => {
        if (!superUnlockName) {
            setSuperUnlockError(lang === 'TH' ? 'กรุณาเลือกบัญชีหัวหน้า' : 'Please select supervisor account');
            return;
        }
        if (!superUnlockPasscode) {
            setSuperUnlockError(lang === 'TH' ? 'กรุณากรอกรหัสผ่านของหัวหน้า' : 'Please enter supervisor passcode');
            return;
        }

        const superAccount = (agents || []).find(a => a.name === superUnlockName);
        if (!superAccount) {
            setSuperUnlockError(lang === 'TH' ? 'ไม่พบบัญชีหัวหน้า' : 'Supervisor not found');
            return;
        }

        const isSuperMatch = await verifyPasscode(superUnlockPasscode, superAccount.passcode || '1234');
        if (!isSuperMatch) {
            setSuperUnlockError(lang === 'TH' ? 'รหัสผ่านหัวหน้าไม่ถูกต้อง กรุณาตรวจสอบใหม่' : 'Incorrect supervisor passcode');
            return;
        }

        const newPass = superNewPassForAgent.trim() || '1234';
        const hashed = await hashPasscode(newPass);

        const updated = (agents || []).map(a => {
            if (a.name === selectedAgentName) {
                const unlocked = {
                    ...a,
                    isLocked: false,
                    lockedReason: null,
                    lockedAt: null,
                    isActive: true,
                    passcode: hashed
                };
                if (supabaseClient) {
                    pushAgentToCloud(supabaseClient, unlocked);
                }
                return unlocked;
            }
            return a;
        });

        setAgents(updated);
        localStorage.setItem('mc_agents', JSON.stringify(updated));
        writeLog('AUTH', `👑 หัวหน้า [${superUnlockName}] ได้ปลดล็อกบัญชี [${selectedAgentName}] และตั้งรหัสผ่านใหม่สำเร็จ`, 'success', superUnlockName);

        setShowSuperUnlock(false);
        setSuperUnlockPasscode('');
        setSuperUnlockError('');
        setErrorMsg('');
        setFailedAttempts(0);
        setSuperUnlockSuccess(lang === 'TH' 
            ? `✅ ปลดล็อกบัญชี [${selectedAgentName}] สำเร็จแล้ว! รหัสใหม่คือ "${newPass}" สามารถเข้าสู่ระบบได้ทันที`
            : `✅ Unlocked account [${selectedAgentName}] successfully! New passcode is "${newPass}"`);
    };

    const handleConfirmLogin = async () => {
        if (lockoutRemaining > 0) return;
        if (!selectedAgentName) {
            setErrorMsg(lang === 'TH' ? 'กรุณาเลือกบัญชีพนักงาน' : 'Please select a staff account');
            return;
        }

        if (!matchedAgent) {
            setErrorMsg(lang === 'TH' ? 'ไม่พบบัญชีพนักงานในระบบ' : 'Staff account not found');
            return;
        }

        if (matchedAgent.isLocked) {
            setErrorMsg(lang === 'TH' 
                ? `🔒 บัญชี [${matchedAgent.name}] ถูกระงับการใช้งานเนื่องจากกรอกรหัสผ่านผิดครบ 3 ครั้ง กรุณาให้หัวหน้า (Supervisor) ปลดล็อกและตั้งรหัสผ่านใหม่` 
                : `🔒 Account [${matchedAgent.name}] is locked due to 3 failed attempts. Please contact a Supervisor to unlock.`);
            return;
        }

        if (matchedAgent.isActive === false || matchedAgent.isArchived) {
            setErrorMsg(lang === 'TH' ? 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อหัวหน้า' : 'This account is suspended. Contact supervisor');
            return;
        }

        const storedPasscode = matchedAgent.passcode || '1234';
        let isMatch = await verifyPasscode(passwordInput, storedPasscode);

        // Fallback: check Supabase remote passcode directly in case updated on another device
        if (!isMatch && supabaseClient) {
            try {
                const { data: remoteData } = await supabaseClient
                    .from('mc_agents')
                    .select('passcode')
                    .eq('name', selectedAgentName)
                    .maybeSingle();

                if (remoteData && remoteData.passcode) {
                    isMatch = await verifyPasscode(passwordInput, remoteData.passcode);
                    if (isMatch) {
                        const updated = agents.map(a => a.name === selectedAgentName ? { ...a, passcode: remoteData.passcode } : a);
                        setAgents(updated);
                        localStorage.setItem('mc_agents', JSON.stringify(updated));
                    }
                }
            } catch (e) {
                console.warn('Fallback remote verification error', e);
            }
        }

        if (!isMatch) {
            const nextAttempts = failedAttempts + 1;
            setFailedAttempts(nextAttempts);
            const maxAttempts = APP_CONFIG.MAX_LOGIN_ATTEMPTS || 3;

            if (nextAttempts >= maxAttempts) {
                // 🔒 PERMANENT LOCK: Account is locked until a Supervisor unlocks it!
                const updatedAgents = (agents || []).map(a => {
                    if (a.name === selectedAgentName) {
                        const updated = {
                            ...a,
                            isLocked: true,
                            lockedReason: 'FAILED_ATTEMPTS_3',
                            lockedAt: new Date().toISOString()
                        };
                        if (supabaseClient) {
                            pushAgentToCloud(supabaseClient, updated);
                        }
                        return updated;
                    }
                    return a;
                });

                setAgents(updatedAgents);
                localStorage.setItem('mc_agents', JSON.stringify(updatedAgents));
                setFailedAttempts(0);
                setPasswordInput('');
                
                const lockMsg = lang === 'TH'
                    ? `🔒 บัญชี [${selectedAgentName}] ถูกล็อกแล้วเนื่องจากกรอกรหัสผ่านผิดครบ 3 ครั้ง กรุณาติดต่อหัวหน้า (Supervisor) เพื่อปลดล็อกและตั้งรหัสผ่านใหม่`
                    : `🔒 Account [${selectedAgentName}] has been locked due to 3 failed attempts. Please contact a Supervisor to unlock and reset passcode.`;
                setErrorMsg(lockMsg);
                writeLog('SECURITY', `🔒 บัญชี [${selectedAgentName}] ถูกล็อกเนื่องจากกรอกรหัสผ่านผิดครบ 3 ครั้ง - ต้องให้หัวหน้า (Supervisor) ปลดล็อกเท่านั้น`, 'danger', selectedAgentName);
            } else {
                setErrorMsg(lang === 'TH'
                    ? `รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง (ครั้งที่ ${nextAttempts}/${maxAttempts})`
                    : `Incorrect passcode. Please try again (${nextAttempts}/${maxAttempts})`);
            }
            return;
        }

        // Login Success
        const loginTimestamp = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' }).replace('T', ' ');
        setFailedAttempts(0);
        setLockoutUntil(0);
        setActiveAgentName(selectedAgentName);
        localStorage.setItem('mc_active_agent_name', selectedAgentName);
        localStorage.setItem('mc_last_selected_agent', selectedAgentName);
        localStorage.removeItem('mc_logged_out');
        setPasswordInput('');
        setErrorMsg('');
        setShowPassword(false);
        writeLog('AUTH', `เข้าสู่ระบบสำเร็จในนาม [${selectedAgentName}] (${matchedAgent.role})`, 'success', selectedAgentName);

        // Record last login in state & Supabase
        const updatedAgents = agents.map(a => a.id === matchedAgent.id ? { ...a, lastLoginAt: loginTimestamp } : a);
        setAgents(updatedAgents);
        localStorage.setItem('mc_agents', JSON.stringify(updatedAgents));

        if (supabaseClient) {
            supabaseClient
                .from('mc_agents')
                .update({ last_login_at: loginTimestamp })
                .eq('name', selectedAgentName)
                .then();
        }

        // Auto-upgrade plain text to SHA-256 hash if needed
        if (matchedAgent.passcode && matchedAgent.passcode.length < 32) {
            try {
                const hashed = await hashPasscode(passwordInput.trim());
                const upgraded = agents.map(a => a.id === matchedAgent.id ? { ...a, passcode: hashed } : a);
                setAgents(upgraded);
                localStorage.setItem('mc_agents', JSON.stringify(upgraded));
                if (supabaseClient) {
                    supabaseClient.from('mc_agents').update({ passcode: hashed }).eq('name', selectedAgentName).then();
                }
            } catch (e) {}
        }

        if (setIsLockedDueToInactivity) setIsLockedDueToInactivity(false);
        if (setIsLoginModalOpen) setIsLoginModalOpen(false);

        if (onClose) onClose();
    };

    const content = (
        <div style={{
            width: '100%',
            maxWidth: '440px',
            background: theme === 'light' ? '#ffffff' : 'rgba(15, 23, 42, 0.95)',
            border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(168, 85, 247, 0.25)',
            borderRadius: '24px',
            padding: '32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
            position: 'relative'
        }}>
            {!isFullscreen && onClose && (
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer'
                    }}
                >
                    <X size={20} />
                </button>
            )}

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{
                    width: '60px',
                    height: '60px',
                    margin: '0 auto 12px auto',
                    borderRadius: '18px',
                    background: isLockedDueToInactivity 
                        ? 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)' 
                        : 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isLockedDueToInactivity ? '0 8px 24px rgba(239, 68, 68, 0.4)' : '0 8px 24px rgba(168, 85, 247, 0.4)',
                    color: '#ffffff'
                }}>
                    {isLockedDueToInactivity ? <Lock size={30} /> : <PhoneOutgoing size={30} />}
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                    {isLockedDueToInactivity 
                        ? (lang === 'TH' ? '🔒 ล็อกหน้าจออัตโนมัติ' : '🔒 Session Locked')
                        : (lang === 'TH' ? 'เข้าสู่ระบบเจ้าหน้าที่' : 'Staff Sign In')}
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {isLockedDueToInactivity
                        ? (lang === 'TH' ? `ไม่มีการใช้งานเกิน 15 นาที กรุณากรอกรหัสผ่านเพื่อใช้งานต่อ` : `Inactive for 15 minutes. Enter passcode to continue`)
                        : (lang === 'TH' ? 'กรุณาเลือกบัญชีและกรอกรหัสผ่านเพื่อเข้าใช้งาน' : 'Select staff account and enter passcode')}
                </p>
            </div>

            {superUnlockSuccess && (
                <div style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    color: '#10b981',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    fontSize: '12.5px',
                    marginBottom: '18px',
                    textAlign: 'center',
                    fontWeight: 700,
                    lineHeight: 1.5
                }}>
                    {superUnlockSuccess}
                </div>
            )}

            {errorMsg && (
                <div style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    marginBottom: '18px',
                    textAlign: 'center',
                    fontWeight: 600,
                    lineHeight: 1.5
                }}>
                    {errorMsg}
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                        {lang === 'TH' ? 'บัญชีเจ้าหน้าที่ (Staff Account):' : 'Select Staff Account:'}
                    </label>
                    <select
                        className="select-input"
                        value={selectedAgentName}
                        onChange={(e) => {
                            setSelectedAgentName(e.target.value);
                            setErrorMsg('');
                            setSuperUnlockSuccess('');
                        }}
                        style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', fontSize: '14px' }}
                    >
                        {(agents || []).filter(a => !a.isArchived).map(a => (
                            <option key={a.id || a.name} value={a.name}>
                                {a.isLocked ? '🔒 ' : (a.role === 'SUPERVISOR' ? '👑 ' : '👤 ')} {a.name} ({a.role}){a.isLocked ? (lang === 'TH' ? ' - ถูกล็อก' : ' - Locked') : ''}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                        {lang === 'TH' ? 'รหัสผ่าน (Passcode):' : 'Passcode:'}
                    </label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            className="text-input"
                            placeholder={matchedAgent?.isLocked 
                                ? (lang === 'TH' ? '🔒 บัญชีถูกล็อก (กรุณาให้หัวหน้าปลดล็อก)' : '🔒 Account is locked')
                                : (lang === 'TH' ? 'กรอกรหัสผ่าน 4 หลัก...' : 'Enter passcode...')}
                            value={passwordInput}
                            onChange={(e) => {
                                setPasswordInput(e.target.value);
                                setErrorMsg('');
                                setSuperUnlockSuccess('');
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleConfirmLogin();
                            }}
                            disabled={matchedAgent?.isLocked || lockoutRemaining > 0}
                            style={{ 
                                width: '100%', 
                                padding: '12px 42px 12px 14px', 
                                borderRadius: '12px', 
                                fontSize: '15px',
                                opacity: matchedAgent?.isLocked ? 0.6 : 1,
                                cursor: matchedAgent?.isLocked ? 'not-allowed' : 'text'
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={matchedAgent?.isLocked}
                            style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: matchedAgent?.isLocked ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <button
                    className="btn btn-primary"
                    onClick={handleConfirmLogin}
                    disabled={matchedAgent?.isLocked || lockoutRemaining > 0}
                    style={{
                        padding: '13px',
                        fontSize: '15px',
                        fontWeight: 700,
                        borderRadius: '14px',
                        marginTop: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: (matchedAgent?.isLocked || lockoutRemaining > 0)
                            ? 'rgba(100, 116, 139, 0.4)' 
                            : 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                        cursor: (matchedAgent?.isLocked || lockoutRemaining > 0) ? 'not-allowed' : 'pointer'
                    }}
                >
                    {matchedAgent?.isLocked ? <Lock size={17} /> : (lockoutRemaining > 0 ? <Lock size={17} /> : <LogIn size={17} />)}
                    {matchedAgent?.isLocked 
                        ? (lang === 'TH' ? '🔒 บัญชีถูกล็อก (ให้หัวหน้าปลดล็อก)' : '🔒 Account Locked (Contact Supervisor)')
                        : (lockoutRemaining > 0 
                            ? (lang === 'TH' ? `กรุณารอ ${lockoutRemaining} วินาที...` : `Please wait ${lockoutRemaining}s...`) 
                            : (lang === 'TH' ? 'เข้าสู่ระบบ (Sign In)' : 'Sign In'))}
                </button>

                {/* Supervisor Direct Unlock Box for Locked Account */}
                {matchedAgent?.isLocked && (
                    <div style={{
                        marginTop: '12px',
                        padding: '14px',
                        borderRadius: '16px',
                        background: theme === 'light' ? '#fffbeb' : 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.35)',
                        boxShadow: '0 4px 14px rgba(245, 158, 11, 0.15)'
                    }}>
                        {!showSuperUnlock ? (
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowSuperUnlock(true)}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    background: theme === 'light' ? '#ffffff' : 'rgba(245, 158, 11, 0.2)',
                                    color: '#d97706',
                                    border: '1px solid rgba(245, 158, 11, 0.4)',
                                    cursor: 'pointer'
                                }}
                            >
                                <span>👑</span>
                                <span>{lang === 'TH' ? 'หัวหน้าปลดล็อกให้ตรงนี้ (Supervisor Unlock)' : 'Supervisor Unlock Here'}</span>
                            </button>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#d97706', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <ShieldCheck size={16} />
                                        {lang === 'TH' ? '👑 ปลดล็อกโดยหัวหน้างาน' : '👑 Supervisor Direct Unlock'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => { setShowSuperUnlock(false); setSuperUnlockError(''); }}
                                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {superUnlockError && (
                                    <div style={{ color: '#ef4444', fontSize: '11.5px', fontWeight: 700, padding: '4px 0' }}>
                                        ⚠️ {superUnlockError}
                                    </div>
                                )}

                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                                        {lang === 'TH' ? 'เลือกบัญชีหัวหน้า (Supervisor):' : 'Select Supervisor:'}
                                    </label>
                                    <select
                                        className="select-input"
                                        value={superUnlockName}
                                        onChange={(e) => setSuperUnlockName(e.target.value)}
                                        style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '8px' }}
                                    >
                                        {supervisorsList.map(s => (
                                            <option key={s.id || s.name} value={s.name}>
                                                👑 {s.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                                        {lang === 'TH' ? 'รหัสผ่านของหัวหน้า (Supervisor Passcode):' : 'Supervisor Passcode:'}
                                    </label>
                                    <input
                                        type="password"
                                        className="text-input"
                                        placeholder={lang === 'TH' ? 'กรอกรหัสผ่านหัวหน้า...' : 'Supervisor passcode...'}
                                        value={superUnlockPasscode}
                                        onChange={(e) => setSuperUnlockPasscode(e.target.value)}
                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '8px' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                                        {lang === 'TH' ? `กำหนดรหัสใหม่ให้ [${selectedAgentName}] (New Passcode):` : 'New Passcode for Staff:'}
                                    </label>
                                    <input
                                        type="text"
                                        className="text-input"
                                        placeholder={lang === 'TH' ? 'รหัสใหม่ 4 หลัก (เช่น 1234)' : 'New passcode (e.g. 1234)'}
                                        value={superNewPassForAgent}
                                        onChange={(e) => setSuperNewPassForAgent(e.target.value)}
                                        style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '8px', fontWeight: 700, letterSpacing: '2px' }}
                                    />
                                </div>

                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleSupervisorDirectUnlock}
                                    style={{
                                        padding: '10px',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        borderRadius: '10px',
                                        marginTop: '6px',
                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        color: '#ffffff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <ShieldCheck size={15} />
                                    <span>{lang === 'TH' ? 'ยืนยันปลดล็อกและตั้งรหัสผ่านใหม่' : 'Confirm Unlock & Reset Passcode'}</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {matchedAgent?.isLocked && supervisorsList.length > 0 && (
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedAgentName(supervisorsList[0].name);
                            setPasswordInput('');
                            setErrorMsg('');
                            setShowSuperUnlock(false);
                        }}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#a855f7',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            marginTop: '4px',
                            textAlign: 'center',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                        }}
                    >
                        <span>👑</span>
                        <span>{lang === 'TH' ? `สลับไปเข้าสู่ระบบด้วยบัญชีหัวหน้า [${supervisorsList[0].name}]` : `Switch to Supervisor [${supervisorsList[0].name}]`}</span>
                    </button>
                )}
            </div>
        </div>
    );

    if (isFullscreen) {
        return (
            <div className="login-fullscreen-page" style={{
                position: 'fixed',
                inset: 0,
                width: '100vw',
                height: '100vh',
                minHeight: '100vh',
                zIndex: 99999,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                boxSizing: 'border-box',
                background: theme === 'light'
                    ? 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)'
                    : 'radial-gradient(circle at 50% 25%, #1e1b4b 0%, #0b0f19 50%, #030712 100%)',
                color: 'var(--text-main)',
                fontFamily: "'Outfit', 'Prompt', sans-serif"
            }}>
                <div style={{ position: 'absolute', top: '24px', right: '28px', display: 'flex', gap: '10px' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setLang(lang === 'TH' ? 'EN' : 'TH')}
                        style={{ padding: '7px 14px', fontSize: '12px', fontWeight: 700, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Globe size={14} />
                        {lang === 'TH' ? 'ภาษาไทย (TH)' : 'English (EN)'}
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={toggleTheme}
                        style={{ padding: '7px 12px', fontSize: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center' }}
                    >
                        {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
                    </button>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                    <h1 style={{
                        fontSize: '32px',
                        fontWeight: 800,
                        margin: 0,
                        letterSpacing: '-0.5px',
                        background: theme === 'light' ? 'none' : 'linear-gradient(135deg, #ffffff 30%, #c084fc 100%)',
                        WebkitBackgroundClip: theme === 'light' ? 'unset' : 'text',
                        WebkitTextFillColor: theme === 'light' ? '#0f172a' : 'transparent',
                        color: theme === 'light' ? '#0f172a' : '#ffffff'
                    }}>
                        MC Daily Follow Up
                    </h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px', fontWeight: 500 }}>
                        {lang === 'TH' ? 'ระบบติดตามและบริหารงานลูกค้า MC (MC Daily Follow Up System)' : 'MC Daily Follow Up System'}
                    </p>
                </div>

                {content}

                <div style={{ marginTop: '32px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', opacity: 0.7 }}>
                    MC Daily Follow Up • Secure Operations Gateway • {new Date().getFullYear()}
                </div>
            </div>
        );
    }

    return (
        <div 
            className="modal-backdrop" 
            onClick={onClose} 
            style={{ 
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(8px)',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                padding: '16px'
            }}
        >
            <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '440px' }}>
                {content}
            </div>
        </div>
    );
};
