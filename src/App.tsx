import React, { useState, useEffect } from 'react';
import { useExpenses } from './hooks/useExpenses';
import type { Transaction } from './db/IndexedDBService';
import DashboardTab from './components/DashboardTab';
import TransactionList from './components/TransactionList';
import AnalyticsTab from './components/AnalyticsTab';
import BudgetTab from './components/BudgetTab';
import InsightsTab from './components/InsightsTab';
import SettingsTab from './components/SettingsTab';
import TransactionForm from './components/TransactionForm';

// Global Styles
import './styles/index.css';
import './styles/tabs.css';

// Icons
import { 
  LayoutDashboard, 
  Receipt, 
  PieChart, 
  Sliders, 
  Lightbulb, 
  Settings as SettingsIcon,
  Plus,
  WifiOff,
  DownloadCloud,
  Moon,
  Sun
} from 'lucide-react';

type TabType = 'dashboard' | 'transactions' | 'analytics' | 'budgets' | 'insights' | 'settings';

export const App: React.FC = () => {
  const {
    transactions,
    budgets,
    settings,
    loading,
    error,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    saveBudget,
    deleteBudget,
    saveSettings,
    clearAllData,
    exportData,
    importData
  } = useExpenses();

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  
  // Offline state tracking
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // PWA Install prompt handling
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // 1. Online/Offline events
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // 2. Catch PWA prompt
    const catchPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', catchPrompt);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('beforeinstallprompt', catchPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted PWA installation');
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    }
  };

  const handleOpenAddModal = () => {
    setTransactionToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tx: Transaction) => {
    setTransactionToEdit(tx);
    setIsModalOpen(true);
  };

  const handleSaveTransaction = async (tx: Transaction) => {
    if (tx.id !== undefined) {
      await updateTransaction(tx);
    } else {
      await addTransaction(tx);
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    const tx = transactions.find(t => t.id === id);
    const isMasterRecurring = tx?.isRecurring && !tx?.parentRecurringId;

    const message = isMasterRecurring
      ? `Delete this recurring template?\n\nAll auto-generated entries linked to it will also be permanently deleted.`
      : 'Are you sure you want to delete this transaction?';

    if (window.confirm(message)) {
      await deleteTransaction(id);
    }
  };

  const toggleTheme = async () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    await saveSettings({ theme: nextTheme });
  };

  // Nav link helper
  const renderNavLink = (tab: TabType, label: string, Icon: React.ComponentType<any>) => {
    const isActive = activeTab === tab;
    return (
      <div 
        className={`list-item`} 
        style={{ 
          cursor: 'pointer',
          padding: '12px 16px',
          background: isActive ? 'var(--color-primary-light)' : 'transparent',
          borderColor: isActive ? 'var(--color-primary)' : 'transparent',
          transform: 'none',
          marginBottom: '8px'
        }}
        onClick={() => setActiveTab(tab)}
      >
        <div className="item-left" style={{ gap: '12px' }}>
          <div style={{ 
            color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Icon size={20} />
          </div>
          <span style={{ 
            fontWeight: isActive ? 700 : 500,
            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: '0.95rem'
          }}>
            {label}
          </span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '16px' }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '4px solid var(--panel-border)', 
          borderTopColor: 'var(--color-primary)', 
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}} />
        <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Waking up database...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Offline Mode Banner */}
      {!isOnline && (
        <div className="offline-banner">
          <WifiOff size={16} /> Offline Mode — Data is saved locally to your device
        </div>
      )}

      {/* 2. Mobile Top Bar */}
      <header className="mobile-top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)', 
            width: '32px', 
            height: '32px', 
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: 'var(--shadow-primary-glow)'
          }}>
            <LayoutDashboard size={18} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 800, background: 'linear-gradient(135deg, #fff 0%, #9ca3af 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0, lineHeight: 1.1 }}>
              FiscalIQ
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            fontSize: '0.75rem', 
            fontWeight: 700, 
            padding: '4px 8px', 
            borderRadius: '20px', 
            background: 'var(--color-primary-light)', 
            color: 'var(--color-primary)' 
          }}>
            {settings.currency}
          </span>
          <button 
            onClick={toggleTheme} 
            className="icon-btn" 
            title={settings.theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            style={{ width: '32px', height: '32px', borderRadius: '8px' }}
          >
            {settings.theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button 
            onClick={() => setActiveTab('settings')} 
            className={`icon-btn ${activeTab === 'settings' ? 'active' : ''}`}
            title="Settings"
            style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '8px',
              color: activeTab === 'settings' ? 'var(--color-primary)' : 'var(--text-secondary)',
              background: activeTab === 'settings' ? 'var(--color-primary-light)' : 'transparent'
            }}
          >
            <SettingsIcon size={16} />
          </button>
        </div>
      </header>

      {/* 3. Main App Container */}
      <div className="app-container">
        
        {/* Sidebar Nav */}
        <aside className="sidebar">
          {/* Logo Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', padding: '0 8px' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)', 
              width: '36px', 
              height: '36px', 
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: 'var(--shadow-primary-glow)'
            }}>
              <LayoutDashboard size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #fff 0%, #9ca3af 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                FiscalIQ
              </h1>
              <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-primary)', fontWeight: 700 }}>
                IndexedDB PWA
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ flex: 1 }}>
            {renderNavLink('dashboard', 'Dashboard', LayoutDashboard)}
            {renderNavLink('transactions', 'Transactions', Receipt)}
            {renderNavLink('analytics', 'Analytics', PieChart)}
            {renderNavLink('budgets', 'Budgets', Sliders)}
            {renderNavLink('insights', 'Insights', Lightbulb)}
            {renderNavLink('settings', 'Settings', SettingsIcon)}
          </nav>

          {/* Install Promo Banner */}
          {showInstallBanner && (
            <div className="pwa-promo" style={{ padding: '12px', fontSize: '0.8rem', flexDirection: 'column', gap: '8px', borderStyle: 'solid' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                <DownloadCloud size={16} style={{ color: 'var(--color-primary)' }} />
                <span>Install FiscalIQ App</span>
              </div>
              <button 
                className="btn btn-primary" 
                onClick={handleInstallClick}
                style={{ width: '100%', padding: '6px 12px', fontSize: '0.75rem' }}
              >
                Install
              </button>
            </div>
          )}

          {/* Sidebar Footer Controls */}
          <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              v1.0.0
            </span>
            <button 
              onClick={toggleTheme} 
              className="icon-btn" 
              title={settings.theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              style={{ width: '36px', height: '36px', borderRadius: '10px' }}
            >
              {settings.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </aside>

        {/* Dynamic Main Body Content */}
        <main className="main-content">
          {error && (
            <div className="glass-panel" style={{ padding: '16px 24px', marginBottom: '24px', borderLeft: '4px solid var(--color-danger)', background: 'var(--color-danger-light)', color: 'var(--color-danger)', fontWeight: 500 }}>
              ⚠️ {error}
            </div>
          )}

          {activeTab === 'dashboard' && (
            <DashboardTab
              transactions={transactions}
              budgets={budgets}
              settings={settings}
              onAddTransactionClick={handleOpenAddModal}
              onEditTransactionClick={handleOpenEditModal}
              onDeleteTransactionClick={handleDeleteTransaction}
              onViewAllClick={() => setActiveTab('transactions')}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionList
              transactions={transactions}
              settings={settings}
              onEditTransactionClick={handleOpenEditModal}
              onDeleteTransactionClick={handleDeleteTransaction}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsTab
              transactions={transactions}
              settings={settings}
            />
          )}

          {activeTab === 'budgets' && (
            <BudgetTab
              transactions={transactions}
              budgets={budgets}
              settings={settings}
              onSaveBudget={saveBudget}
              onDeleteBudget={deleteBudget}
            />
          )}

          {activeTab === 'insights' && (
            <InsightsTab
              transactions={transactions}
              budgets={budgets}
              settings={settings}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              settings={settings}
              onSaveSettings={saveSettings}
              onClearAllData={clearAllData}
              onExportData={exportData}
              onImportData={importData}
            />
          )}
        </main>
      </div>

      {/* Mobile Floating Action Button (FAB) */}
      <button 
        className="fab-add-btn" 
        onClick={handleOpenAddModal}
        title="Add Transaction"
        aria-label="Add Transaction"
      >
        <Plus size={26} />
      </button>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        <button 
          className={`mobile-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={18} />
          <span>Overview</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          <Receipt size={18} />
          <span>Ledger</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <PieChart size={18} />
          <span>Charts</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeTab === 'budgets' ? 'active' : ''}`}
          onClick={() => setActiveTab('budgets')}
        >
          <Sliders size={18} />
          <span>Budgets</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeTab === 'insights' ? 'active' : ''}`}
          onClick={() => setActiveTab('insights')}
        >
          <Lightbulb size={18} />
          <span>Insights</span>
        </button>
      </nav>

      {/* 3. Global Transaction Dialog Modal */}
      <TransactionForm
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTransaction}
        transactionToEdit={transactionToEdit}
        currencySymbol={settings.currency}
      />
    </div>
  );
};

export default App;
