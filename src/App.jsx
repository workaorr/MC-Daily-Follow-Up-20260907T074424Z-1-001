import React from 'react';
import { useApp } from './context/AppContext';

// Common Shell Components
import { 
    Navbar, 
    Sidebar, 
    DbSettingsModal, 
    TourOverlay 
} from './components/common';

// Domain Feature Modules
import { LoginModal, ChangePasscodeModal } from './features/auth';
import { 
    NewCustomerView, 
    EditCustomerModal, 
    AddConfirmModal, 
    AddSuccessModal 
} from './features/customers';
import { DashboardView } from './features/dashboard';
import { FollowUpView } from './features/followUp';
import { UploadDepositsView } from './features/deposits';
import { SupervisorAuditView } from './features/supervisor';
import { BackOfficeView } from './features/backoffice';
import { AuditLogsView } from './features/auditLogs';
import { RecycleBinView, ArchiveAgentModal } from './features/recycleBin';

export default function App() {
    const {
        viewMode,
        activeAgentName,
        isLoginModalOpen,
        setIsLoginModalOpen,
        isLockedDueToInactivity,
        setIsLockedDueToInactivity,
        showDbSettings,
        setShowDbSettings,
        isTourActive,
        setIsTourActive
    } = useApp();

    const handleCloseLogin = () => {
        if (isLockedDueToInactivity) return;
        setIsLoginModalOpen(false);
    };

    // 🛡️ Strict Auth Guard:
    // If unauthenticated or session is locked due to inactivity,
    // do NOT render the application layout, navbar, sidebar, or customer data.
    // Mount ONLY the secure full-screen staff login portal.
    if (!activeAgentName || isLockedDueToInactivity) {
        return (
            <LoginModal 
                isOpen={true}
                isFullscreen={true}
                onClose={null}
            />
        );
    }

    const renderActiveView = () => {
        switch (viewMode) {
            case 'supervisor':
            case 'dashboard':
                return <DashboardView />;
            case 'agent':
            case 'follow-up':
                return <FollowUpView />;
            case 'upload-deposits':
            case 'upload':
                return <UploadDepositsView />;
            case 'new-customer':
                return <NewCustomerView />;
            case 'audit':
                return <SupervisorAuditView />;
            case 'backoffice':
                return <BackOfficeView />;
            case 'audit-logs':
                return <AuditLogsView />;
            case 'recycle-bin':
                return <RecycleBinView />;
            default:
                return <DashboardView />;
        }
    };

    return (
        <div className="app-layout">
            {/* Top Navigation Bar */}
            <Navbar 
                onOpenLogin={() => setIsLoginModalOpen(true)}
                onOpenTour={() => setIsTourActive(true)}
                onOpenDbSettings={() => setShowDbSettings(true)}
            />

            {/* Left Sidebar Navigation */}
            <Sidebar onStartTour={() => setIsTourActive(true)} />

            {/* Main Application Workspace */}
            <main className="app-main">
                {renderActiveView()}
            </main>

            {/* Customer Domain Modals */}
            <EditCustomerModal />
            <AddConfirmModal />
            <AddSuccessModal />

            {/* Recycle Bin & Staff Lifecycle Modal */}
            <ArchiveAgentModal />

            {/* Auth Domain Modals (Account Switcher Modal for authenticated user) */}
            <ChangePasscodeModal />
            {isLoginModalOpen && (
                <LoginModal 
                    isOpen={isLoginModalOpen}
                    isFullscreen={false}
                    onClose={handleCloseLogin}
                />
            )}

            {/* System DB Connection Settings */}
            <DbSettingsModal 
                isOpen={showDbSettings} 
                onClose={() => setShowDbSettings(false)} 
            />

            {/* Interactive Spotlight Guided Tour */}
            <TourOverlay 
                isActive={isTourActive} 
                onClose={() => setIsTourActive(false)} 
            />
        </div>
    );
}

export { App };
