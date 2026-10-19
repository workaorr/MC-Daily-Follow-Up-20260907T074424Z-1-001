import React from 'react';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an unhandled runtime error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReload = () => {
        window.location.reload();
    };

    handleResetAndClear = () => {
        try {
            localStorage.removeItem('mc_active_agent_name');
            localStorage.removeItem('mc_logged_out');
            localStorage.removeItem('mc_view_mode');
            localStorage.removeItem('mc_last_selected_agent');
        } catch (e) {}
        window.location.href = window.location.pathname || '/';
    };

    render() {
        if (this.state.hasError) {
            const errorMsg = this.state.error?.message || String(this.state.error || 'Unknown error');
            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px',
                    fontFamily: "'Outfit', 'Prompt', sans-serif",
                    backgroundColor: '#0b1120',
                    color: '#f8fafc',
                    boxSizing: 'border-box',
                    textAlign: 'center'
                }}>
                    <div style={{
                        maxWidth: '480px',
                        width: '100%',
                        backgroundColor: '#1e293b',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: '20px',
                        padding: '32px 24px',
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
                    }}>
                        <div style={{
                            width: '56px',
                            height: '56px',
                            margin: '0 auto 16px auto',
                            borderRadius: '16px',
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '28px'
                        }}>
                            ⚠️
                        </div>

                        <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px 0', color: '#ffffff' }}>
                            เกิดข้อผิดพลาดในการโหลดระบบ
                        </h2>
                        <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 20px 0', lineHeight: 1.5 }}>
                            ระบบพบข้อขัดข้องชั่วคราว คุณสามารถรีเฟรชหน้าเว็บ หรือล้างข้อมูลเซสชันเพื่อเข้าสู่ระบบใหม่ได้ทันที
                        </p>

                        <div style={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: '10px',
                            padding: '12px',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            color: '#f87171',
                            textAlign: 'left',
                            wordBreak: 'break-all',
                            maxHeight: '100px',
                            overflowY: 'auto',
                            marginBottom: '20px'
                        }}>
                            {errorMsg}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button
                                onClick={this.handleReload}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    borderRadius: '12px',
                                    backgroundColor: '#a855f7',
                                    color: '#ffffff',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                🔄 รีเฟรชหน้าระบบ (Reload Page)
                            </button>
                            <button
                                onClick={this.handleResetAndClear}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    borderRadius: '12px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                    color: '#cbd5e1',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    cursor: 'pointer'
                                }}
                            >
                                🧹 ล้างแคชและเริ่มเซสชันใหม่ (Clear & Reset)
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
