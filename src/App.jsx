import React from 'react';
import { useApp } from './context/AppContext';

// Common Components
import { 
    Navbar, 
    Sidebar, 
    LoginModal, 
    DbSettingsModal, 
    TourOverlay 
} from './components/common';

// Subcomponents / Modals
import { 
    EditCustomerModal, 
    AddConfirmModal, 
    AddSuccessModal, 
    ArchiveAgentModal, 
    ChangePasscodeModal 
} from './components/subcomponents';

// Views
import { 
    DashboardView, 
    FollowUpView, 
    UploadDepositsView, 
    SupervisorAuditView, 
    NewCustomerView, 
    BackOfficeView, 
    AuditLogsView, 
    RecycleBinView 
} from './components/views';

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

            {/* Global Context-Driven Modals */}
            <EditCustomerModal />
            <AddConfirmModal />
            <AddSuccessModal />
            <ArchiveAgentModal />
            <ChangePasscodeModal />

            {/* Admin Supabase Connection Settings Modal */}
            <DbSettingsModal 
                isOpen={showDbSettings} 
                onClose={() => setShowDbSettings(false)} 
            />

            {/* Interactive Spotlight Guided Tour */}
            <TourOverlay 
                isActive={isTourActive} 
                onClose={() => setIsTourActive(false)} 
            />

            {/* Staff Login / Account Switcher / Inactivity Lock Modal */}
            <LoginModal 
                isOpen={isLoginModalOpen || !activeAgentName}
                isFullscreen={!activeAgentName}
                onClose={isLockedDueToInactivity ? null : handleCloseLogin}
            />
        </div>
    );
}

export { App };
