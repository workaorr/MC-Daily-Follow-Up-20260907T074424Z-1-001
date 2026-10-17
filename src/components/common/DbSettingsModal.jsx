// Supabase Cloud Connection Settings Modal
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SUPABASE_CONFIG } from '../../constants/config';
import { createSupabaseInstance } from '../../services/supabase';
import { Database, RefreshCw, CheckCircle, AlertTriangle, X } from 'lucide-react';

export const DbSettingsModal = ({ isOpen, onClose }) => {
    const { 
        supabaseUrl, 
        setSupabaseUrl, 
        supabaseKey, 
        setSupabaseKey, 
        setSupabaseClient, 
        lang, 
        writeLog 
    } = useApp();

    const [inputUrl, setInputUrl] = useState(supabaseUrl || SUPABASE_CONFIG.DEFAULT_URL);
    const [inputKey, setInputKey] = useState(supabaseKey || SUPABASE_CONFIG.DEFAULT_KEY);
    const [testStatus, setTestStatus] = useState(null); // 'testing', 'success', 'error'
    const [testMsg, setTestMsg] = useState('');

    if (!isOpen) return null;

    const handleTestConnection = async () => {
        setTestStatus('testing');
        setTestMsg(lang === 'TH' ? 'กำลังทดสอบเชื่อมต่อ...' : 'Testing connection...');
        try {
            const client = createSupabaseInstance(inputUrl.trim(), inputKey.trim());
            if (!client) throw new Error('Client creation failed');
            const { error } = await client.from('mc_agents').select('id').limit(1);
            if (error) throw error;
            setTestStatus('success');
            setTestMsg(lang === 'TH' ? '✅ เชื่อมต่อ Supabase สำเร็จ!' : '✅ Connected successfully!');
        } catch (e) {
            setTestStatus('error');
            setTestMsg(lang === 'TH' ? `❌ เชื่อมต่อล้มเหลว: ${e.message}` : `❌ Failed: ${e.message}`);
        }
    };

    const handleSave = () => {
        const cleanUrl = inputUrl.trim();
        const cleanKey = inputKey.trim();
        localStorage.setItem('mc_supabase_url', cleanUrl);
        localStorage.setItem('mc_supabase_key', cleanKey);
        setSupabaseUrl(cleanUrl);
        setSupabaseKey(cleanKey);
        const newClient = createSupabaseInstance(cleanUrl, cleanKey);
        setSupabaseClient(newClient);
        writeLog('SUPABASE', 'อัปเดตการตั้งค่าการเชื่อมต่อฐานข้อมูลเรียบร้อย', 'success');
        if (onClose) onClose();
    };

    const handleResetDefaults = () => {
        if (window.confirm(lang === 'TH' ? 'รีเซ็ตการตั้งค่าเป็นค่าเริ่มต้นของระบบ?' : 'Reset connection to system defaults?')) {
            setInputUrl(SUPABASE_CONFIG.DEFAULT_URL);
            setInputKey(SUPABASE_CONFIG.DEFAULT_KEY);
            setTestStatus(null);
            setTestMsg('');
        }
    };

    return (
        <div className="modal-backdrop" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div 
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: '520px',
                    borderRadius: '20px',
                    padding: '28px',
                    position: 'relative'
                }}
            >
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '18px',
                        right: '18px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer'
                    }}
                >
                    <X size={20} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Database size={22} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                            {lang === 'TH' ? 'ตั้งค่าฐานข้อมูล Supabase Cloud' : 'Supabase Cloud Settings'}
                        </h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                            {lang === 'TH' ? 'กำหนดค่า Project URL และ Anon Key สำหรับเชื่อมต่อฐานข้อมูล' : 'Configure Project URL and Anon API Key'}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                            Supabase Project URL:
                        </label>
                        <input
                            type="text"
                            className="text-input"
                            value={inputUrl}
                            onChange={(e) => setInputUrl(e.target.value)}
                            placeholder="https://xyzcompany.supabase.co"
                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '13px' }}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                            Supabase Publishable/Anon Key:
                        </label>
                        <input
                            type="password"
                            className="text-input"
                            value={inputKey}
                            onChange={(e) => setInputKey(e.target.value)}
                            placeholder="sb_publishable_..."
                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '13px' }}
                        />
                    </div>

                    {testMsg && (
                        <div style={{
                            padding: '10px 14px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: testStatus === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: testStatus === 'success' ? '#10b981' : '#ef4444',
                            border: `1px solid ${testStatus === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                        }}>
                            {testMsg}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap', gap: '10px' }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleResetDefaults}
                            style={{ padding: '8px 14px', fontSize: '12px', borderRadius: '8px' }}
                        >
                            {lang === 'TH' ? 'รีเซ็ตค่าเริ่มต้น' : 'Reset Defaults'}
                        </button>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleTestConnection}
                                disabled={testStatus === 'testing'}
                                style={{ padding: '8px 14px', fontSize: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <RefreshCw size={13} className={testStatus === 'testing' ? 'spin' : ''} />
                                <span>{lang === 'TH' ? 'ทดสอบเชื่อมต่อ' : 'Test Connection'}</span>
                            </button>

                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleSave}
                                style={{ padding: '8px 18px', fontSize: '12px', fontWeight: 700, borderRadius: '8px' }}
                            >
                                {lang === 'TH' ? 'บันทึกการตั้งค่า' : 'Save Settings'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
