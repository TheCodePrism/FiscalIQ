export interface Transaction {
  id?: number;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  description: string;
  type: 'income' | 'expense' | 'savings';
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

      request.onsuccess = () => {
        // Sort transactions by date descending (newest first)
        const result = request.result || [];
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
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('transactions', 'readwrite');
      const store = transaction.objectStore('transactions');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
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
