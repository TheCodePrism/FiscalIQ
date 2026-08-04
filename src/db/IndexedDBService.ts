export interface Transaction {
  id?: number;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  description: string;
  type: 'income' | 'expense' | 'savings';
  isRecurring?: boolean;
  frequency?: 'monthly' | 'weekly' | 'yearly';
  dayOfMonth?: number;
  endDate?: string; // YYYY-MM-DD or empty for ongoing
  parentRecurringId?: number;
}

export interface Budget {
  category: string;
  limit: number;
}

export interface AppSettings {
  name: string;
  monthlySavingsGoal: number;
  currency: string;
  theme: 'dark' | 'light';
}

/** Maps browser locale to a sensible default currency symbol. */
export function getLocaleCurrency(): string {
  const locale = navigator.language || 'en-US';
  const region = locale.split('-')[1]?.toUpperCase() ?? '';
  const map: Record<string, string> = {
    // Americas
    US: '$', CA: 'CA$', MX: 'MX$', BR: 'R$', AR: 'AR$', CL: 'CL$', CO: 'Col$', PE: 'S/',
    // Europe
    GB: '£', CH: 'CHF', SE: 'kr', NO: 'kr', DK: 'kr', PL: 'zł', CZ: 'Kč', HU: 'Ft',
    UA: '₴', TR: '₺', RU: '₽',
    // Asia & Pacific
    IN: '₹', JP: '¥', CN: '元', KR: '₩', SG: 'S$', HK: 'HK$', TW: 'NT$',
    AU: 'A$', NZ: 'NZ$', ID: 'Rp', PH: '₱', TH: '฿', MY: 'RM', VN: '₫',
    BD: '৳', PK: 'Rs', LK: 'Rs', NP: '₨',
    // Middle East & Africa
    SA: '﷼', AE: 'د.إ', IL: '₪', QA: '﹩', KW: 'KD', NG: '₦', ZA: 'R',
    KE: 'KSh', EG: 'E£', MA: 'DH',
  };
  // Euro zone countries
  const euroZone = ['AT','BE','CY','EE','FI','FR','DE','GR','IE','IT','LV','LT','LU','MT','NL','PT','SK','SI','ES'];
  if (euroZone.includes(region)) return '€';
  return map[region] ?? '$';
}

const DB_NAME = 'ExpenseTrackerDB';
const DB_VERSION = 1;

class IndexedDBService {
  private db: IDBDatabase | null = null;

  public async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB open error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        
        // 1. Transactions Store
        if (!db.objectStoreNames.contains('transactions')) {
          const transactionStore = db.createObjectStore('transactions', {
            keyPath: 'id',
            autoIncrement: true,
          });
          transactionStore.createIndex('date', 'date', { unique: false });
          transactionStore.createIndex('category', 'category', { unique: false });
          transactionStore.createIndex('type', 'type', { unique: false });
        }

        // 2. Budgets Store
        if (!db.objectStoreNames.contains('budgets')) {
          db.createObjectStore('budgets', { keyPath: 'category' });
        }

        // 3. Settings Store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  // --- TRANSACTIONS ---

  public async getAllTransactions(): Promise<Transaction[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('transactions', 'readonly');
      const store = transaction.objectStore('transactions');
      const request = store.getAll();

      request.onsuccess = async () => {
        let result = request.result || [];
        
        // Run auto-sync generator for active recurring items
        try {
          const synced = await this.syncRecurringTransactions(result);
          if (synced) {
            // Re-fetch using a FRESH DB transaction — the original one is already closed
            const freshDb = await this.initDB();
            result = await new Promise<Transaction[]>((res) => {
              const freshTx = freshDb.transaction('transactions', 'readonly');
              const freshStore = freshTx.objectStore('transactions');
              const req2 = freshStore.getAll();
              req2.onsuccess = () => res(req2.result || []);
              req2.onerror = () => res(result); // fallback to pre-sync list
            });
          }
        } catch {
          // ignore auto-sync errors — data will be correct on next refresh
        }

        // Sort transactions by date descending (newest first)
        result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        resolve(result);
      };

      request.onerror = () => reject(request.error);
    });
  }

  public async addTransaction(tx: Transaction): Promise<number> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('transactions', 'readwrite');
      const store = transaction.objectStore('transactions');
      const request = store.add(tx);

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  public async updateTransaction(tx: Transaction): Promise<void> {
    if (tx.id === undefined) throw new Error('Transaction ID is required for updates.');
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('transactions', 'readwrite');
      const store = transaction.objectStore('transactions');
      const request = store.put(tx);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async deleteTransaction(id: number): Promise<void> {
    const db = await this.initDB();

    // Fetch all transactions to detect cascade-delete of recurring children
    const allTx = await new Promise<Transaction[]>((res, rej) => {
      const readTx = db.transaction('transactions', 'readonly');
      const req = readTx.objectStore('transactions').getAll();
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => rej(req.error);
    });

    const master = allTx.find(tx => tx.id === id);
    const idsToDelete: number[] = [id];

    // If deleting a child entry of a recurring transaction, record it as skipped
    if (master && master.parentRecurringId && master.date) {
      try {
        const skippedRaw = localStorage.getItem('fiscaliq_skipped_recurrences');
        const skippedList: string[] = skippedRaw ? JSON.parse(skippedRaw) : [];
        const skipKey = `${master.parentRecurringId}-${master.date}`;
        if (!skippedList.includes(skipKey)) {
          skippedList.push(skipKey);
          localStorage.setItem('fiscaliq_skipped_recurrences', JSON.stringify(skippedList));
        }
      } catch (e) {
        console.error('Failed to save skipped recurrence to localStorage:', e);
      }
    }

    // If deleting a master recurring entry, cascade-delete all auto-generated children
    if (master?.isRecurring && !master?.parentRecurringId) {
      allTx.forEach(tx => {
        if (tx.parentRecurringId === id && tx.id !== undefined) {
          idsToDelete.push(tx.id);
        }
      });
      // Clean up localStorage skipped entries for this master ID
      try {
        const skippedRaw = localStorage.getItem('fiscaliq_skipped_recurrences');
        if (skippedRaw) {
          const skippedList: string[] = JSON.parse(skippedRaw);
          const prefix = `${id}-`;
          const filtered = skippedList.filter(item => !item.startsWith(prefix));
          localStorage.setItem('fiscaliq_skipped_recurrences', JSON.stringify(filtered));
        }
      } catch (e) {
        console.error('Failed to clean up skipped list:', e);
      }
    }

    return new Promise((resolve, reject) => {
      const writeTx = db.transaction('transactions', 'readwrite');
      const store = writeTx.objectStore('transactions');
      let remaining = idsToDelete.length;
      let failed = false;

      idsToDelete.forEach(deleteId => {
        const req = store.delete(deleteId);
        req.onsuccess = () => {
          if (!failed && --remaining === 0) resolve();
        };
        req.onerror = () => {
          failed = true;
          reject(req.error);
        };
      });
    });
  }

  /**
   * Auto-generates missing transaction entries for active recurring items.
   * Supports monthly, weekly, and yearly frequencies.
   */
  public async syncRecurringTransactions(transactions: Transaction[]): Promise<boolean> {
    const recurringMasters = transactions.filter(tx => tx.isRecurring && !tx.parentRecurringId);
    if (recurringMasters.length === 0) return false;

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexed
    const currentMonthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    let createdCount = 0;

    // Load explicitly skipped recurrences
    let skippedList: string[] = [];
    try {
      const skippedRaw = localStorage.getItem('fiscaliq_skipped_recurrences');
      if (skippedRaw) skippedList = JSON.parse(skippedRaw);
    } catch {}

    const makeEntry = async (masterId: number, master: Transaction, dateStr: string) => {
      await this.addTransaction({
        amount: master.amount,
        category: master.category,
        date: dateStr,
        description: `${master.description || master.category} (Auto-recurring)`,
        type: master.type,
        parentRecurringId: masterId,
        isRecurring: false
      });
      createdCount++;
    };

    for (const master of recurringMasters) {
      if (master.id === undefined) continue;

      const frequency = master.frequency ?? 'monthly';
      const startDate = new Date(master.date);

      // Skip if not yet reached start month
      if (currentMonthPrefix < master.date.substring(0, 7)) continue;

      // Skip if end date has passed
      if (master.endDate && currentMonthPrefix > master.endDate.substring(0, 7)) continue;

      if (frequency === 'monthly') {
        // One entry per month on dayOfMonth (or the day from start date)
        const alreadyExists = transactions.some(tx =>
          (tx.parentRecurringId === master.id || tx.id === master.id) &&
          tx.date.startsWith(currentMonthPrefix)
        );
        if (!alreadyExists) {
          const day = master.dayOfMonth || parseInt(master.date.split('-')[2] || '1', 10);
          const validDay = Math.min(day, daysInMonth);
          const autoDateStr = `${currentMonthPrefix}-${String(validDay).padStart(2, '0')}`;
          
          const skipKey = `${master.id}-${autoDateStr}`;
          if (!skippedList.includes(skipKey)) {
            await makeEntry(master.id, master, autoDateStr);
          }
        }

      } else if (frequency === 'weekly') {
        // One entry per week — same day-of-week as the start date, up to today
        const targetDayOfWeek = startDate.getDay();
        for (let d = 1; d <= daysInMonth; d++) {
          const candidate = new Date(currentYear, currentMonth, d);
          if (candidate > today) break; // never generate future entries
          if (candidate.getDay() !== targetDayOfWeek) continue;

          const candidateDateStr = `${currentMonthPrefix}-${String(d).padStart(2, '0')}`;
          const alreadyExists = transactions.some(tx =>
            tx.parentRecurringId === master.id && tx.date === candidateDateStr
          );
          if (!alreadyExists) {
            const skipKey = `${master.id}-${candidateDateStr}`;
            if (!skippedList.includes(skipKey)) {
              await makeEntry(master.id, master, candidateDateStr);
            }
          }
        }

      } else if (frequency === 'yearly') {
        // One entry per year — only in the same calendar month as the start date
        const startMonthStr = master.date.split('-')[1]; // '01'–'12'
        const currentMonthStr = String(currentMonth + 1).padStart(2, '0');
        if (startMonthStr !== currentMonthStr) continue;

        const alreadyExists = transactions.some(tx =>
          (tx.parentRecurringId === master.id || tx.id === master.id) &&
          tx.date.startsWith(`${currentYear}-`) &&
          tx.date.split('-')[1] === currentMonthStr
        );
        if (!alreadyExists) {
          const day = parseInt(master.date.split('-')[2] || '1', 10);
          const validDay = Math.min(day, daysInMonth);
          const autoDateStr = `${currentMonthPrefix}-${String(validDay).padStart(2, '0')}`;
          
          const skipKey = `${master.id}-${autoDateStr}`;
          if (!skippedList.includes(skipKey)) {
            await makeEntry(master.id, master, autoDateStr);
          }
        }
      }
    }

    return createdCount > 0;
  }

  // --- BUDGETS ---

  public async getAllBudgets(): Promise<Budget[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('budgets', 'readonly');
      const store = transaction.objectStore('budgets');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  public async saveBudget(budget: Budget): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('budgets', 'readwrite');
      const store = transaction.objectStore('budgets');
      const request = store.put(budget);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async deleteBudget(category: string): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('budgets', 'readwrite');
      const store = transaction.objectStore('budgets');
      const request = store.delete(category);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- SETTINGS ---

  public async getSettings(): Promise<AppSettings> {
    const db = await this.initDB();
    const defaultSettings: AppSettings = {
      name: 'User',
      monthlySavingsGoal: 500,
      currency: getLocaleCurrency(),
      theme: 'dark',
    };

    return new Promise((resolve) => {
      const transaction = db.transaction('settings', 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result || [];
        const settingsMap = results.reduce((acc, curr) => {
          acc[curr.key] = curr.value;
          return acc;
        }, {} as Record<string, any>);

        resolve({
          name: settingsMap.name !== undefined ? settingsMap.name : defaultSettings.name,
          monthlySavingsGoal: settingsMap.monthlySavingsGoal !== undefined ? Number(settingsMap.monthlySavingsGoal) : defaultSettings.monthlySavingsGoal,
          currency: settingsMap.currency !== undefined ? settingsMap.currency : defaultSettings.currency,
          theme: settingsMap.theme !== undefined ? settingsMap.theme : defaultSettings.theme,
        });
      };

      request.onerror = () => {
        resolve(defaultSettings);
      };
    });
  }

  public async saveSettings(settings: Partial<AppSettings>): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('settings', 'readwrite');
      const store = transaction.objectStore('settings');

      let completed = 0;
      const keys = Object.keys(settings) as Array<keyof AppSettings>;
      
      if (keys.length === 0) {
        resolve();
        return;
      }

      keys.forEach((key) => {
        const value = settings[key];
        const request = store.put({ key, value });

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          completed++;
          if (completed === keys.length) {
            resolve();
          }
        };
      });
    });
  }

  // --- IMPORT / EXPORT / CLEAR ---

  public async clearAllData(): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['transactions', 'budgets', 'settings'], 'readwrite');
      const txStore = transaction.objectStore('transactions');
      const budgetStore = transaction.objectStore('budgets');
      const settingsStore = transaction.objectStore('settings');

      txStore.clear();
      budgetStore.clear();
      settingsStore.clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  public async exportDatabase(): Promise<string> {
    const transactions = await this.getAllTransactions();
    const budgets = await this.getAllBudgets();
    const settings = await this.getSettings();

    const data = {
      version: DB_VERSION,
      exportDate: new Date().toISOString(),
      transactions,
      budgets,
      settings,
    };

    return JSON.stringify(data, null, 2);
  }

  public async importDatabase(jsonString: string): Promise<void> {
    const parsed = JSON.parse(jsonString);
    
    // Schema verification
    if (!parsed || typeof parsed !== 'object') throw new Error('Invalid JSON format.');
    if (!Array.isArray(parsed.transactions)) throw new Error('Invalid data: transactions list is missing.');
    if (!Array.isArray(parsed.budgets)) throw new Error('Invalid data: budgets list is missing.');
    if (!parsed.settings || typeof parsed.settings !== 'object') throw new Error('Invalid data: settings object is missing.');

    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['transactions', 'budgets', 'settings'], 'readwrite');
      
      const txStore = transaction.objectStore('transactions');
      const budgetStore = transaction.objectStore('budgets');
      const settingsStore = transaction.objectStore('settings');

      // Clear existing
      txStore.clear();
      budgetStore.clear();
      settingsStore.clear();

      // Load transactions (strip id if we want them autoincremented, or keep them to preserve link)
      parsed.transactions.forEach((tx: Transaction) => {
        const cleanTx = { ...tx };
        delete cleanTx.id; // Let IndexedDB assign new auto-increment keys to avoid duplicate issues
        txStore.add(cleanTx);
      });

      // Load budgets
      parsed.budgets.forEach((b: Budget) => {
        budgetStore.put(b);
      });

      // Load settings
      const settings = parsed.settings as AppSettings;
      Object.keys(settings).forEach((key) => {
        settingsStore.put({ key, value: settings[key as keyof AppSettings] });
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

export const dbService = new IndexedDBService();
export default dbService;
