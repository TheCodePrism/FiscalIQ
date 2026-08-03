import React, { useState, useEffect, useRef } from 'react';
import type { AppSettings } from '../db/IndexedDBService';
import { GlassCard } from './ui/GlassCard';
import { 
  User, 
  Settings, 
  Download, 
  Upload, 
  Trash2, 
  AlertTriangle, 
  Sun, 
  Moon 
} from 'lucide-react';

interface SettingsTabProps {
  settings: AppSettings;
  onSaveSettings: (settings: Partial<AppSettings>) => Promise<void>;
  onClearAllData: () => Promise<void>;
  onExportData: () => Promise<string>;
  onImportData: (json: string) => Promise<void>;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  onSaveSettings,
  onClearAllData,
  onExportData,
  onImportData
}) => {
  const [name, setName] = useState(settings.name);
  const [savingsGoal, setSavingsGoal] = useState(settings.monthlySavingsGoal.toString());
  const [currency, setCurrency] = useState(settings.currency);
  const [theme, setTheme] = useState<'dark' | 'light'>(settings.theme);
  
  const [savingSettings, setSavingSettings] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearInput, setClearInput] = useState('');
  
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state with settings prop when it updates
  useEffect(() => {
    setName(settings.name);
    setSavingsGoal(settings.monthlySavingsGoal.toString());
    setCurrency(settings.currency);
    setTheme(settings.theme);
  }, [settings]);

  // Handle Save Settings Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setSavingSettings(true);

    const goalNum = parseInt(savingsGoal);
    if (isNaN(goalNum) || goalNum < 0 || goalNum > 100) {
      alert('Savings goal must be a percentage between 0 and 100.');
      setSavingSettings(false);
      return;
    }

    try {
      await onSaveSettings({
        name: name.trim(),
        monthlySavingsGoal: goalNum,
        currency,
        theme
      });
      setSuccessMsg('Settings updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to update settings', err);
      alert('Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Toggle theme utility
  const handleThemeChange = async (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    await onSaveSettings({ theme: newTheme });
  };

  // Trigger JSON file export download
  const handleExport = async () => {
    try {
      const dataStr = await onExportData();
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const today = new Date();
      const exportFileDefaultName = `expense_tracker_backup_${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (err) {
      alert('Failed to export data.');
    }
  };

  // Handle JSON file import upload
  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError('');
    setImportSuccess('');

    const fileReader = new FileReader();
    const files = e.target.files;
    
    if (!files || files.length === 0) return;

    fileReader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        await onImportData(text);
        setImportSuccess('Data imported successfully! The dashboard has updated.');
        
        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err: any) {
        console.error(err);
        setImportError(err?.message || 'Failed to import backup. Ensure the file is a valid Expense Tracker JSON file.');
      }
    };

    fileReader.readAsText(files[0]);
  };

  const triggerImportSelect = () => {
    fileInputRef.current?.click();
  };

  // Handle DB Wipe
  const handleClearData = async () => {
    if (clearInput !== 'DELETE') {
      alert('Please type "DELETE" to confirm data deletion.');
      return;
    }

    try {
      await onClearAllData();
      setShowClearConfirm(false);
      setClearInput('');
      alert('All local data wiped successfully. App reset.');
    } catch (err) {
      alert('Failed to clear database data.');
    }
  };

  return (
    <div className="fade-in">
      <div className="tab-header">
        <div>
          <h2 className="tab-title">App Configuration</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your profile settings, theme choices, and data options.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }} className="analytics-grid">
        {/* Profile Settings */}
        <GlassCard className="settings-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <User size={20} style={{ color: 'var(--color-primary)' }} />
            <h3 className="section-title">Profile Configuration</h3>
          </div>

          <form onSubmit={handleSaveProfile}>
            <div className="form-group">
              <label htmlFor="pref-name">Your Name</label>
              <input
                type="text"
                id="pref-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="User"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="pref-currency">Preferred Currency</label>
              <select
                id="pref-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                required
              >
                <option value="$">US Dollar ($)</option>
                <option value="€">Euro (€)</option>
                <option value="₹">Indian Rupee (₹)</option>
                <option value="£">British Pound (£)</option>
                <option value="¥">Yen / Yuan (¥)</option>
                <option value="₩">Korean Won (₩)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="pref-goal">Monthly Savings Goal (% of Income)</label>
              <input
                type="number"
                id="pref-goal"
                min="0"
                max="100"
                value={savingsGoal}
                onChange={(e) => setSavingsGoal(e.target.value)}
                required
              />
            </div>

            {successMsg && (
              <p style={{ color: 'var(--color-success)', fontSize: '0.9rem', marginBottom: '16px', fontWeight: 600 }}>
                {successMsg}
              </p>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={savingSettings}>
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </button>
          </form>
        </GlassCard>

        {/* General App controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Theme card */}
          <GlassCard className="settings-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Settings size={20} style={{ color: 'var(--color-primary)' }} />
              <h3 className="section-title">Aesthetics</h3>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Choose your default styling color scheme:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button 
                type="button" 
                className={`type-btn ${theme === 'dark' ? 'active expense' : ''}`}
                onClick={() => handleThemeChange('dark')}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Moon size={16} /> Dark Mode
              </button>
              <button 
                type="button" 
                className={`type-btn ${theme === 'light' ? 'active income' : ''}`}
                onClick={() => handleThemeChange('light')}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Sun size={16} /> Light Mode
              </button>
            </div>
          </GlassCard>

          {/* Backup card */}
          <GlassCard className="settings-section">
            <h3 className="section-title" style={{ marginBottom: '16px' }}>Data Portability</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Backup your transactions, budgets, and settings locally, or import a previously saved file.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button className="btn btn-secondary" onClick={handleExport} style={{ width: '100%' }}>
                <Download size={16} /> Export Data (JSON)
              </button>
              
              <button className="btn btn-secondary" onClick={triggerImportSelect} style={{ width: '100%' }}>
                <Upload size={16} /> Import Data (JSON)
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleImportFileChange}
              />
            </div>

            {importSuccess && (
              <p style={{ color: 'var(--color-success)', fontSize: '0.8rem', marginTop: '12px', fontWeight: 600 }}>
                {importSuccess}
              </p>
            )}
            {importError && (
              <p style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '12px', fontWeight: 500 }}>
                {importError}
              </p>
            )}
          </GlassCard>

          {/* Wipe card */}
          <GlassCard className="settings-section" glowColor="var(--color-danger)">
            <h3 className="section-title" style={{ marginBottom: '8px', color: 'var(--color-danger)' }}>Danger Zone</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Irreversibly delete all budgets, settings, and transaction ledger items.
            </p>

            {!showClearConfirm ? (
              <button className="btn btn-danger" onClick={() => setShowClearConfirm(true)} style={{ width: '100%' }}>
                <Trash2 size={16} /> Wipe Database Data
              </button>
            ) : (
              <div style={{ background: 'rgba(244, 63, 94, 0.05)', border: '1px solid rgba(244, 63, 94, 0.2)', padding: '16px', borderRadius: '12px', marginTop: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--color-danger)', fontWeight: 600, fontSize: '0.875rem', marginBottom: '8px' }}>
                  <AlertTriangle size={16} /> Confirm Deletion
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  To proceed, type <strong>DELETE</strong> in the box below:
                </p>
                <input
                  type="text"
                  value={clearInput}
                  onChange={(e) => setClearInput(e.target.value)}
                  placeholder="Type DELETE"
                  style={{ marginBottom: '12px', borderColor: 'rgba(244, 63, 94, 0.4)' }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-danger" onClick={handleClearData} style={{ flex: 1, padding: '8px' }}>
                    Yes, Wipe Data
                  </button>
                  <button className="btn btn-secondary" onClick={() => { setShowClearConfirm(false); setClearInput(''); }} style={{ flex: 1, padding: '8px' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
