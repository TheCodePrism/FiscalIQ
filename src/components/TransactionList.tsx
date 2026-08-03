import React, { useState, useMemo } from 'react';
import type { Transaction, AppSettings } from '../db/IndexedDBService';
import { GlassCard } from './ui/GlassCard';
import { getCategoryIcon, getCategoryIconStyle } from './DashboardTab';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, SAVINGS_CATEGORIES } from './TransactionForm';
import { 
  Search, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Edit2, 
  Trash2,
  ChevronDown
} from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  settings: AppSettings;
  onEditTransactionClick: (tx: Transaction) => void;
  onDeleteTransactionClick: (id: number) => void;
}

const ITEMS_PER_PAGE = 10;

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  settings,
  onEditTransactionClick,
  onDeleteTransactionClick
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense' | 'savings'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all'); // format: YYYY-MM
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const currencySymbol = settings.currency;

  // Extract unique month-years from all transactions to populate the month dropdown
  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach(tx => {
      if (tx.date) {
        months.add(tx.date.substring(0, 7)); // YYYY-MM
      }
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  // Combined list of categories for filter dropdown
  const allCategories = useMemo(() => {
    if (typeFilter === 'income') return INCOME_CATEGORIES;
    if (typeFilter === 'expense') return EXPENSE_CATEGORIES;
    if (typeFilter === 'savings') return SAVINGS_CATEGORIES;
    return [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES, ...SAVINGS_CATEGORIES];
  }, [typeFilter]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // 1. Search Filter
      const matchSearch = 
        tx.description.toLowerCase().includes(search.toLowerCase()) ||
        tx.category.toLowerCase().includes(search.toLowerCase());
      
      // 2. Type Filter
      const matchType = typeFilter === 'all' || tx.type === typeFilter;

      // 3. Category Filter
      const matchCategory = categoryFilter === 'all' || tx.category === categoryFilter;

      // 4. Month Filter
      const matchMonth = monthFilter === 'all' || tx.date.startsWith(monthFilter);

      return matchSearch && matchType && matchCategory && matchMonth;
    });
  }, [transactions, search, typeFilter, categoryFilter, monthFilter]);

  // Reset pagination when filter changes
  React.useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [search, typeFilter, categoryFilter, monthFilter]);

  // Filter stats summary
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    let savings = 0;
    filteredTransactions.forEach(tx => {
      if (tx.type === 'income') income += tx.amount;
      else if (tx.type === 'expense') expense += tx.amount;
      else if (tx.type === 'savings') savings += tx.amount;
    });
    return {
      income,
      expense,
      savings,
      balance: income - expense - savings
    };
  }, [filteredTransactions]);

  // Group visible transactions by date
  const groupedTransactions = useMemo(() => {
    const visibleList = filteredTransactions.slice(0, visibleCount);
    const groups: Record<string, Transaction[]> = {};
    
    visibleList.forEach(tx => {
      const dateStr = tx.date;
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(tx);
    });

    return groups;
  }, [filteredTransactions, visibleCount]);

  const formatCurrency = (val: number) => {
    return currencySymbol + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getFriendlyDateString = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    return date.toLocaleDateString(undefined, { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <div className="fade-in">
      <div className="tab-header">
        <div>
          <h2 className="tab-title">Transactions Ledger</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Review, search, and manage your income and expenses.</p>
        </div>
      </div>

      {/* Filters Bar */}
      <GlassCard style={{ padding: '20px', marginBottom: '24px' }}>
        <div className="filters-bar">
          {/* Search bar */}
          <div className="search-input-wrapper">
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search descriptions, categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '48px' }}
            />
          </div>

          {/* Type Select */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <select
              className="filter-select"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as any);
                setCategoryFilter('all'); // reset category
              }}
            >
              <option value="all">All Types</option>
              <option value="income">Income Only</option>
              <option value="expense">Expense Only</option>
              <option value="savings">Savings Only</option>
            </select>

            {/* Category Select */}
            <select
              className="filter-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              {allCategories.map((cat: string) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Month Select */}
            <select
              className="filter-select"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
            >
              <option value="all">All Months</option>
              {monthOptions.map(m => {
                const [year, month] = m.split('-');
                const date = new Date(Number(year), Number(month) - 1, 1);
                const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
                return <option key={m} value={m}>{monthName}</option>;
              })}
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Summary Box */}
      <div 
        className="glass-panel" 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
          padding: '16px 24px', 
          borderRadius: '16px', 
          marginBottom: '24px',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ color: 'var(--color-success)', background: 'var(--color-success-light)', padding: '8px', borderRadius: '10px' }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Filtered Income</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-success)' }}>{formatCurrency(stats.income)}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ color: 'var(--color-danger)', background: 'var(--color-danger-light)', padding: '8px', borderRadius: '10px' }}>
            <TrendingDown size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Filtered Expenses</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-danger)' }}>{formatCurrency(stats.expense)}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ color: 'var(--color-primary)', background: 'var(--color-primary-light)', padding: '8px', borderRadius: '10px' }}>
            <DollarSign size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Filtered Savings</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary)' }}>{formatCurrency(stats.savings)}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ color: 'var(--text-primary)', background: 'var(--panel-border-hover)', padding: '8px', borderRadius: '10px' }}>
            <DollarSign size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Remaining Net</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: stats.balance >= 0 ? 'var(--text-primary)' : 'var(--color-danger)' }}>{formatCurrency(stats.balance)}</div>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <GlassCard style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>No matching transactions found. Try adjusting your filters!</p>
        </GlassCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {Object.keys(groupedTransactions).map(dateStr => (
            <div key={dateStr}>
              <div 
                style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: 600, 
                  color: 'var(--text-secondary)', 
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Calendar size={14} />
                {getFriendlyDateString(dateStr)}
              </div>
              <div className="list-container">
                {groupedTransactions[dateStr].map(tx => {
                  const isExpense = tx.type === 'expense';
                  const isSavings = tx.type === 'savings';
                  const style = getCategoryIconStyle(tx.category, isExpense);
                  const amountClass = isExpense ? 'amount-expense' : isSavings ? 'amount-savings' : 'amount-income';
                  const sign = isExpense ? '-' : isSavings ? '💎 ' : '+';
                  return (
                    <div key={tx.id} className="list-item">
                      <div className="item-left">
                        <div 
                          className="icon-wrapper" 
                          style={{ 
                            background: style.bg,
                            color: style.color
                          }}
                        >
                          {getCategoryIcon(tx.category)}
                        </div>
                        <div className="item-details">
                          <h4>{tx.description || tx.category}</h4>
                          <span>{tx.category} • {tx.type.toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="item-right">
                        <span className={`item-amount ${amountClass}`}>
                          {sign}{formatCurrency(tx.amount)}
                        </span>
                        <div className="item-actions">
                          <button 
                            className="icon-btn" 
                            onClick={() => onEditTransactionClick(tx)}
                            aria-label="Edit transaction"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            className="icon-btn btn-delete" 
                            onClick={() => tx.id && onDeleteTransactionClick(tx.id)}
                            aria-label="Delete transaction"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Load More Button */}
          {filteredTransactions.length > visibleCount && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}
                style={{ padding: '12px 24px' }}
              >
                Load More <ChevronDown size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TransactionList;
