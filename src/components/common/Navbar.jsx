// Top Navigation Header Bar
import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
    User, 
    LogIn, 
    LogOut, 
    Sun, 
    Moon, 
    Globe, 
    Database, 
    HelpCircle 
} from 'lucide-react';

export const Navbar = ({ onOpenLogin, onOpenTour, onOpenDbSettings }) => {
    const { 
        lang, 
        setLang, 
        theme, 
        toggleTheme, 
        supabaseClient, 
        activeAgentName, 
        isSupervisor, 
        setActiveAgentName,
        activeAgent 
    } = useApp();

    const canBackOffice = activeAgent?.permissions?.canBackOffice || isSupervisor;

    const handleLogout = () => {
        if (window.confirm(lang === 'TH' ? `🚪 ยืนยันการออกจากระบบของบัญชี [${activeAgentName}]?` : `🚪 Confirm logout from account [${activeAgentName}]?`)) {
            localStorage.setItem('mc_logged_out', 'true');
            localStorage.removeItem('mc_active_agent_name');
            setActiveAgentName('');
            if (onOpenLogin) onOpenLogin();
        }
    };

    return (
        <header className="app-topbar">
            {/* Left: Brand Logo & Title */}
            <div id="tour-brand" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {/* Modern High-End Pro Studio Vector Logo Badge (Mint-Green with Yellow/Lime Tint) */}
                <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, borderRadius: '12px', filter: 'drop-shadow(0 4px 14px rgba(16, 185, 129, 0.45))' }}>
                    <defs>
                        <linearGradient id="mcBgGrad" x1="0" y1="0" x2="42" y2="42" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#059669" />
                            <stop offset="45%" stopColor="#10b981" />
                            <stop offset="85%" stopColor="#84cc16" />
                            <stop offset="100%" stopColor="#a3e635" />
                        </linearGradient>
                        <linearGradient id="mcGlassShine" x1="0" y1="0" x2="0" y2="20" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <rect width="42" height="42" rx="12" fill="url(#mcBgGrad)" />
                    <path d="M0 12C0 5.37258 5.37258 0 12 0H30C36.6274 0 42 5.37258 42 12V21H0V12Z" fill="url(#mcGlassShine)" />
                    <rect x="0.5" y="0.5" width="41" height="41" rx="11.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
                    {/* Precision Ergonomic Headband */}
                    <path d="M11 20V17C11 11.4772 15.4772 7 21 7C26.5228 7 31 11.4772 31 17V20" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" />
                    {/* High-End Studio Ear Cushions with inner bevel */}
                    <rect x="8.5" y="18.5" width="5.2" height="9.5" rx="2.6" fill="#ffffff" />
                    <rect x="28.3" y="18.5" width="5.2" height="9.5" rx="2.6" fill="#ffffff" />
                    <rect x="10" y="20.5" width="2.2" height="5.5" rx="1.1" fill="#059669" />
                    <rect x="29.8" y="20.5" width="2.2" height="5.5" rx="1.1" fill="#059669" />
                    {/* High-Tech Curved Mic Boom */}
                    <path d="M29 25.5C29 29.5 25.8 32.5 21.5 32.5H18" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
                    {/* Glowing Mic Status Capsule (Lime-Yellow) */}
                    <circle cx="16.5" cy="32.5" r="3" fill="#bef264" stroke="#ffffff" strokeWidth="1.2" />
                    {/* Inner Soundwave M-shape Equalizer */}
                    <path d="M17.5 19V23M21 16V25M24.5 19V23" stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeLinecap="round" />
                </svg>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
                        <span style={{ 
                            background: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #84cc16 100%)', 
                            color: '#ffffff', 
                            padding: '3px 9px', 
                            borderRadius: '7px', 
                            fontSize: '12.5px', 
                            fontWeight: 900, 
                            letterSpacing: '0.6px',
                            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)'
                        }}>MC</span>
                        <span style={{ 
                            fontSize: '18px', 
                            fontWeight: 800, 
                            letterSpacing: '-0.3px', 
                            color: 'var(--text-main)' 
                        }}>
                            Daily Follow Up
                        </span>
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: supabaseClient ? 'rgba(16, 185, 129, 0.12)' : 'rgba(148, 163, 184, 0.12)',
                            color: supabaseClient ? '#10b981' : 'var(--text-muted)',
                            border: supabaseClient ? '1px solid rgba(16, 185, 129, 0.28)' : '1px solid rgba(148, 163, 184, 0.25)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: supabaseClient ? '#10b981' : '#94a3b8', boxShadow: supabaseClient ? '0 0 6px #10b981' : 'none' }}></span>
                            {supabaseClient ? (lang === 'TH' ? 'คลาวด์ซิงค์เรียลไทม์' : 'Cloud Sync Live') : (lang === 'TH' ? 'ออฟไลน์' : 'Offline')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Right: User Profile & Top Action Controls */}
            <div id="tour-profile" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {activeAgentName ? (
                    <div 
                        onClick={onOpenLogin}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '9px',
                            padding: '4px 12px 4px 6px',
                            borderRadius: '10px',
                            background: theme === 'light' ? '#f8fafc' : 'rgba(255, 255, 255, 0.05)',
                            border: theme === 'light' ? '1px solid #e2e8f0' : (isSupervisor ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)'),
                            cursor: 'pointer'
                        }}
                        title={lang === 'TH' ? 'คลิกเพื่อสลับผู้ใช้งาน (Switch Account)' : 'Click to switch account'}
                    >
                        <div style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '8px',
                            background: isSupervisor ? 'rgba(245, 158, 11, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                            color: isSupervisor ? '#fbbf24' : '#c084fc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <User size={15} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
                                {activeAgentName}
                            </span>
                            <span style={{ fontSize: '10px', fontWeight: 600, color: isSupervisor ? '#f59e0b' : '#c084fc', lineHeight: 1.2 }}>
                                {isSupervisor ? (lang === 'TH' ? '👑 หัวหน้า' : '👑 Supervisor') : (lang === 'TH' ? '👤 MC Agent' : '👤 MC Agent')}
                            </span>
                        </div>
                    </div>
                ) : (
                    <button
                        className="btn btn-primary"
                        onClick={onOpenLogin}
                        style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <LogIn size={14} />
                        <span>{lang === 'TH' ? 'เข้าสู่ระบบ' : 'Sign In'}</span>
                    </button>
                )}

                {/* Interactive Guide Tour Button */}
                <button
                    id="tour-trigger-btn"
                    onClick={onOpenTour}
                    className="btn"
                    style={{
                        padding: '6px 11px',
                        fontSize: '12px',
                        fontWeight: 700,
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: theme === 'light' ? '#f5f3ff' : 'rgba(168, 85, 247, 0.15)',
                        border: theme === 'light' ? '1px solid #ddd6fe' : '1px solid rgba(168, 85, 247, 0.4)',
                        color: theme === 'light' ? '#7c3aed' : '#c084fc',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(168, 85, 247, 0.2)',
                        transition: 'all 0.2s ease'
                    }}
                    title={lang === 'TH' ? 'คลิกเพื่อเปิดคู่มือแนะนำการใช้งานระบบแบบทีละขั้นตอน (Interactive Tour)' : 'Interactive Guided Tour'}
                >
                    <span style={{ fontSize: '13px' }}>💡</span>
                    <span>{lang === 'TH' ? 'แนะนำการใช้งาน' : 'Guide Tour'}</span>
                </button>

                {/* Theme Switcher Button */}
                <button
                    onClick={toggleTheme}
                    className="btn btn-secondary"
                    style={{ padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', borderRadius: '8px' }}
                    title={theme === 'dark' ? (lang === 'TH' ? 'เปลี่ยนเป็นโหมดสว่าง (Light)' : 'Switch to Light mode') : (lang === 'TH' ? 'เปลี่ยนเป็นโหมดมืด (Dark)' : 'Switch to Dark mode')}
                >
                    {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                    <span>{theme === 'dark' ? (lang === 'TH' ? 'สว่าง' : 'Light') : (lang === 'TH' ? 'มืด' : 'Dark')}</span>
                </button>

                {/* Language Toggle */}
                <button
                    onClick={() => {
                        const nextLang = lang === 'TH' ? 'EN' : 'TH';
                        setLang(nextLang);
                    }}
                    className="btn btn-secondary"
                    style={{ padding: '6px 10px', fontSize: '11px', fontWeight: 700, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title={lang === 'TH' ? 'สลับภาษา (Switch Language)' : 'Switch Language'}
                >
                    <Globe size={13} />
                    <span>{lang}</span>
                </button>

                {/* DB Settings */}
                {canBackOffice && (
                    <button
                        onClick={onOpenDbSettings}
                        className="btn btn-secondary"
                        style={{ padding: '6px 9px', borderRadius: '8px' }}
                        title={lang === 'TH' ? 'ตั้งค่าฐานข้อมูล Supabase' : 'Supabase Cloud Database Settings'}
                    >
                        <Database size={14} />
                    </button>
                )}

                {/* Logout Button */}
                {activeAgentName && (
                    <button
                        onClick={handleLogout}
                        className="btn"
                        style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: 'rgba(244, 63, 94, 0.12)',
                            color: '#f43f5e',
                            border: '1px solid rgba(244, 63, 94, 0.3)',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer'
                        }}
                        title={lang === 'TH' ? 'ออกจากระบบ' : 'Sign Out'}
                    >
                        <LogOut size={13} />
                        <span>{lang === 'TH' ? 'ออก' : 'Logout'}</span>
                    </button>
                )}
            </div>
        </header>
    );
};
