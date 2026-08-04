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
  ChevronDown,
  RefreshCw,
  Copy,
  SlidersHorizontal,
  X
} from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  settings: AppSettings;
  onEditTransactionClick: (tx: Transaction) => void;
  onDuplicateTransactionClick: (tx: Transaction) => void;
  onDeleteTransactionClick: (id: number) => void;
}

const ITEMS_PER_PAGE = 10;

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  settings,
  onEditTransactionClick,
  onDuplicateTransactionClick,
  onDeleteTransactionClick
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense' | 'savings'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all'); // format: YYYY-MM
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [filtersOpen, setFiltersOpen] = useState(false);

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
      <GlassCard style={{ padding: '16px 20px', marginBottom: '24px' }}>
        {/* Row 1: Search + Filter toggle */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: filtersOpen ? '16px' : '0' }}>
          <div className="search-input-wrapper" style={{ flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '42px', paddingRight: search ? '40px' : '14px' }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '4px'
                }}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => setFiltersOpen(f => !f)}
            className="icon-btn"
            aria-label="Toggle filters"
            title="Toggle filters"
            style={{
              border: '1px solid',
              borderColor: (typeFilter !== 'all' || categoryFilter !== 'all' || monthFilter !== 'all')
                ? 'var(--color-primary)'
                : 'var(--panel-border)',
              background: (typeFilter !== 'all' || categoryFilter !== 'all' || monthFilter !== 'all')
                ? 'var(--color-primary-light)'
                : 'transparent',
              color: (typeFilter !== 'all' || categoryFilter !== 'all' || monthFilter !== 'all')
                ? 'var(--color-primary)'
                : 'var(--text-secondary)',
              borderRadius: '10px',
              padding: '10px 14px',
              flexShrink: 0,
              gap: '6px',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            <SlidersHorizontal size={16} />
            <span className="filter-toggle-label">Filters</span>
            {(typeFilter !== 'all' || categoryFilter !== 'all' || monthFilter !== 'all') && (
              <span style={{
                background: 'var(--color-primary)',
                color: '#fff',
                borderRadius: '20px',
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '1px 6px',
                minWidth: '18px',
                textAlign: 'center'
              }}>
                {[typeFilter !== 'all', categoryFilter !== 'all', monthFilter !== 'all'].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Collapsible filter panel */}
        {filtersOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Type filter — pill tabs */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                Type
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(['all', 'income', 'expense', 'savings'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => { setTypeFilter(t); setCategoryFilter('all'); }}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '20px',
                      border: '1px solid',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      borderColor: typeFilter === t
                        ? t === 'income' ? 'var(--color-success)'
                          : t === 'expense' ? 'var(--color-danger)'
                          : t === 'savings' ? 'var(--color-primary)'
                          : 'var(--text-secondary)'
                        : 'var(--panel-border)',
                      background: typeFilter === t
                        ? t === 'income' ? 'var(--color-success-light)'
                          : t === 'expense' ? 'var(--color-danger-light)'
                          : t === 'savings' ? 'var(--color-primary-light)'
                          : 'var(--panel-border-hover)'
                        : 'transparent',
                      color: typeFilter === t
                        ? t === 'income' ? 'var(--color-success)'
                          : t === 'expense' ? 'var(--color-danger)'
                          : t === 'savings' ? 'var(--color-primary)'
                          : 'var(--text-primary)'
                        : 'var(--text-secondary)',
                    }}
                  >
                    {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Category + Month — two selects */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                  Category
                </div>
                <select
                  className="filter-select"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="all">All Categories</option>
                  {allCategories.map((cat: string) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                  Month
                </div>
                <select
                  className="filter-select"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  style={{ width: '100%' }}
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

            {/* Clear filters */}
            {(typeFilter !== 'all' || categoryFilter !== 'all' || monthFilter !== 'all') && (
              <button
                className="btn btn-secondary"
                onClick={() => { setTypeFilter('all'); setCategoryFilter('all'); setMonthFilter('all'); }}
                style={{ alignSelf: 'flex-start', padding: '7px 16px', fontSize: '0.82rem' }}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
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
                          <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {tx.description || tx.category}
                            {tx.isRecurring && (
                              <span title={`Recurring ${tx.frequency ?? 'monthly'}${tx.endDate ? ` until ${tx.endDate}` : ' (ongoing)'}`} style={{
                                display: 'inline-flex', alignItems: 'center', gap: '3px',
                                fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px',
                                borderRadius: '20px', background: 'var(--color-primary-light)',
                                color: 'var(--color-primary)', textTransform: 'uppercase'
                              }}>
                                <RefreshCw size={9} /> Recurring
                              </span>
                            )}
                            {tx.parentRecurringId && (
                              <span title="Auto-generated recurring entry" style={{
                                display: 'inline-flex', alignItems: 'center', gap: '3px',
                                fontSize: '0.65rem', fontWeight: 600, padding: '2px 6px',
                                borderRadius: '20px', background: 'rgba(139,92,246,0.08)',
                                color: 'var(--text-muted)'
                              }}>
                                <RefreshCw size={9} /> Auto
                              </span>
                            )}
                          </h4>
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
                            title="Edit transaction"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            className="icon-btn" 
                            onClick={() => onDuplicateTransactionClick(tx)}
                            aria-label="Duplicate transaction"
                            title="Duplicate transaction"
                          >
                            <Copy size={16} />
                          </button>
                          <button 
                            className="icon-btn btn-delete" 
                            onClick={() => tx.id && onDeleteTransactionClick(tx.id)}
                            aria-label="Delete transaction"
                            title="Delete transaction"
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
