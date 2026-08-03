import { useState, useEffect, useCallback } from 'react';
import dbService from '../db/IndexedDBService';
import type { Transaction, Budget, AppSettings } from '../db/IndexedDBService';
import { getLocaleCurrency } from '../db/IndexedDBService';

export interface UseExpensesResult {
  transactions: Transaction[];
  budgets: Budget[];
  settings: AppSettings;
  loading: boolean;
  error: string | null;
  addTransaction: (tx: Transaction) => Promise<void>;
  updateTransaction: (tx: Transaction) => Promise<void>;
  deleteTransaction: (id: number) => Promise<void>;
  saveBudget: (budget: Budget) => Promise<void>;
  deleteBudget: (category: string) => Promise<void>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<void>;
  clearAllData: () => Promise<void>;
  exportData: () => Promise<string>;
  importData: (json: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useExpenses(): UseExpensesResult {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    name: 'User',
    monthlySavingsGoal: 500,
    currency: getLocaleCurrency(),
    theme: 'dark',
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await dbService.initDB();
      
      const [txList, budgetList, appSettings] = await Promise.all([
        dbService.getAllTransactions(),
        dbService.getAllBudgets(),
        dbService.getSettings()
      ]);

      setTransactions(txList);
      setBudgets(budgetList);
      setSettings(appSettings);
      
      // Update HTML theme attribute
      document.documentElement.setAttribute('data-theme', appSettings.theme);
    } catch (err: any) {
      console.error('Failed to load data from IndexedDB:', err);
      setError(err?.message || 'Failed to load data from database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addTransaction = async (tx: Transaction) => {
    try {
      await dbService.addTransaction(tx);
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to add transaction.');
      throw err;
    }
  };

  const updateTransaction = async (tx: Transaction) => {
    try {
      await dbService.updateTransaction(tx);
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to update transaction.');
      throw err;
    }
  };

  const deleteTransaction = async (id: number) => {
    try {
      await dbService.deleteTransaction(id);
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete transaction.');
      throw err;
    }
  };

  const saveBudget = async (budget: Budget) => {
    try {
      await dbService.saveBudget(budget);
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to save budget.');
      throw err;
    }
  };

  const deleteBudget = async (category: string) => {
    try {
      await dbService.deleteBudget(category);
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete budget.');
      throw err;
    }
  };

  const saveSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      await dbService.saveSettings(newSettings);
      if (newSettings.theme) {
        document.documentElement.setAttribute('data-theme', newSettings.theme);
      }
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to save settings.');
      throw err;
    }
  };

  const clearAllData = async () => {
    try {
      await dbService.clearAllData();
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to clear database data.');
      throw err;
    }
  };

  const exportData = async () => {
    try {
      return await dbService.exportDatabase();
    } catch (err: any) {
      setError(err?.message || 'Failed to export database.');
      throw err;
    }
  };

  const importData = async (jsonString: string) => {
    try {
      await dbService.importDatabase(jsonString);
      await refresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to import database.');
      throw err;
    }
  };

  return {
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
    importData,
    refresh,
  };
}
