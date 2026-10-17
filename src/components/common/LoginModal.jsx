// Staff Login Component (Full-page & Modal Mode)
import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { verifyPasscode, hashPasscode } from '../../utils/auth';
import { 
    PhoneOutgoing, 
    Lock, 
    LogIn, 
    Eye, 
    EyeOff, 
    Globe, 
    Sun, 
    Moon, 
    X 
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
        writeLog 
    } = useApp();

    const [selectedAgentName, setSelectedAgentName] = useState(() => {
        return localStorage.getItem('mc_last_selected_agent') || '';
    });
    const [passwordInput, setPasswordInput] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [lockoutUntil, setLockoutUntil] = useState(0);
    const [lockoutRemaining, setLockoutRemaining] = useState(0);

    // Brute-force lockout countdown timer
    useEffect(() => {
        if (!lockoutUntil) return;
        const interval = setInterval(() => {
            const rem = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
            setLockoutRemaining(rem);
            if (rem <= 0) {
                setLockoutUntil(0);
                setErrorMsg('');
            }
        }, 500);
        return () => clearInterval(interval);
    }, [lockoutUntil]);

    // Set default selected agent if empty
    useEffect(() => {
        if (!selectedAgentName && agents && agents.length > 0) {
            const firstActive = agents.find(a => !a.isArchived && a.isActive !== false);
            if (firstActive) setSelectedAgentName(firstActive.name);
        }
    }, [agents, selectedAgentName]);

    if (!isOpen && !isFullscreen) return null;

    const handleConfirmLogin = async () => {
        if (lockoutRemaining > 0) return;
        if (!selectedAgentName) {
            setErrorMsg(lang === 'TH' ? 'กรุณาเลือกบัญชีพนักงาน' : 'Please select a staff account');
            return;
        }

        const matchedAgent = (agents || []).find(a => a.name === selectedAgentName);
        if (!matchedAgent) {
            setErrorMsg(lang === 'TH' ? 'ไม่พบบัญชีพนักงานในระบบ' : 'Staff account not found');
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
            if (nextAttempts >= 5) {
                const lockUntil = Date.now() + 30000;
                setLockoutUntil(lockUntil);
                setLockoutRemaining(30);
                setFailedAttempts(0);
                setErrorMsg(lang === 'TH'
                    ? '⚠️ กรอกรหัสผ่านไม่ถูกต้องเกิน 5 ครั้ง ระบบระงับการเข้าสู่ระบบ 30 วินาที เพื่อความปลอดภัย'
                    : '⚠️ Too many failed attempts. Locked out for 30 seconds.');
            } else {
                setErrorMsg(lang === 'TH'
                    ? `รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง (ครั้งที่ ${nextAttempts}/5)`
                    : `Incorrect passcode. Please try again (${nextAttempts}/5)`);
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
                    background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 24px rgba(168, 85, 247, 0.4)',
                    color: '#ffffff'
                }}>
                    <PhoneOutgoing size={30} />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                    {lang === 'TH' ? 'เข้าสู่ระบบเจ้าหน้าที่' : 'Staff Sign In'}
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {lang === 'TH' ? 'กรุณาเลือกบัญชีและกรอกรหัสผ่านเพื่อเข้าใช้งาน' : 'Select staff account and enter passcode'}
                </p>
            </div>

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
                    fontWeight: 600
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
                        }}
                        style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', fontSize: '14px' }}
                    >
                        {(agents || []).filter(a => !a.isArchived).map(a => (
                            <option key={a.id || a.name} value={a.name}>
                                {a.role === 'SUPERVISOR' ? '👑 ' : '👤 '} {a.name} ({a.role})
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
                            placeholder={lang === 'TH' ? 'กรอกรหัสผ่าน 4 หลัก...' : 'Enter passcode...'}
                            value={passwordInput}
                            onChange={(e) => {
                                setPasswordInput(e.target.value);
                                setErrorMsg('');
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleConfirmLogin();
                            }}
                            disabled={lockoutRemaining > 0}
                            style={{ width: '100%', padding: '12px 42px 12px 14px', borderRadius: '12px', fontSize: '15px' }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer'
                            }}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <button
                    className="btn btn-primary"
                    onClick={handleConfirmLogin}
                    disabled={lockoutRemaining > 0}
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
                        background: lockoutRemaining > 0 ? 'rgba(100, 116, 139, 0.4)' : 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                        cursor: lockoutRemaining > 0 ? 'not-allowed' : 'pointer'
                    }}
                >
                    {lockoutRemaining > 0 ? <Lock size={17} /> : <LogIn size={17} />}
                    {lockoutRemaining > 0 
                        ? (lang === 'TH' ? `กรุณารอ ${lockoutRemaining} วินาที...` : `Please wait ${lockoutRemaining}s...`) 
                        : (lang === 'TH' ? 'เข้าสู่ระบบ (Sign In)' : 'Sign In')}
                </button>
            </div>
        </div>
    );

    if (isFullscreen) {
        return (
            <div className="login-fullscreen-page" style={{
                minHeight: '100vh',
                width: '100vw',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                boxSizing: 'border-box',
                position: 'relative',
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
        <div className="modal-backdrop" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div onClick={(e) => e.stopPropagation()}>
                {content}
            </div>
        </div>
    );
};
