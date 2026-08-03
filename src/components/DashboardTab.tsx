import React from 'react';
import type { Transaction, Budget, AppSettings } from '../db/IndexedDBService';
import { GlassCard } from './ui/GlassCard';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  Percent, 
  Plus, 
  AlertTriangle,
  ArrowRight,
  ShoppingBag, 
  Home, 
  Zap, 
  Utensils, 
  Film, 
  Car, 
  Tag, 
  HeartPulse, 
  BookOpen, 
  DollarSign, 
  Briefcase, 
  TrendingUp, 
  Gift, 
  HelpCircle,
  Edit2,
  Trash2
} from 'lucide-react';

interface DashboardTabProps {
  transactions: Transaction[];
  budgets: Budget[];
  settings: AppSettings;
  onAddTransactionClick: () => void;
  onEditTransactionClick: (tx: Transaction) => void;
  onDeleteTransactionClick: (id: number) => void;
  onViewAllClick: () => void;
}

export const categoryIcons: Record<string, React.ComponentType<any>> = {
  // Expenses
  'Groceries': ShoppingBag,
  'Housing & Rent': Home,
  'Utilities': Zap,
  'Dining Out': Utensils,
  'Entertainment': Film,
  'Transport': Car,
  'Shopping': Tag,
  'Medical & Health': HeartPulse,
  'Education': BookOpen,
  'Other Expense': HelpCircle,
  // Income
  'Salary': DollarSign,
  'Freelance & Side Hustle': Briefcase,
  'Investments': TrendingUp,
  'Gifts': Gift,
  'Other Income': HelpCircle
};

export const getCategoryIcon = (category: string) => {
  const IconComponent = categoryIcons[category] || HelpCircle;
  return <IconComponent size={20} />;
};

export const getCategoryIconStyle = (category: string, isExpense: boolean) => {
  const styles: Record<string, { bg: string; color: string }> = {
    'Groceries': { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
    'Housing & Rent': { bg: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' },
    'Utilities': { bg: 'rgba(234, 179, 8, 0.15)', color: '#eab308' },
    'Dining Out': { bg: 'rgba(244, 63, 94, 0.15)', color: '#fb7185' },
    'Entertainment': { bg: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' },
    'Transport': { bg: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' },
    'Shopping': { bg: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' },
    'Medical & Health': { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171' },
    'Education': { bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' },
    'Salary': { bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399' },
    'Freelance & Side Hustle': { bg: 'rgba(20, 184, 166, 0.15)', color: '#2dd4bf' },
    'Investments': { bg: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' },
    'Gifts': { bg: 'rgba(244, 114, 182, 0.15)', color: '#f472b6' },
  };
  if (styles[category]) return styles[category];
  return isExpense 
    ? { bg: 'var(--color-danger-light)', color: 'var(--color-danger)' }
    : { bg: 'var(--color-success-light)', color: 'var(--color-success)' };
};

export const DashboardTab: React.FC<DashboardTabProps> = ({
  transactions,
  budgets,
  settings,
  onAddTransactionClick,
  onEditTransactionClick,
  onDeleteTransactionClick,
  onViewAllClick
}) => {
  const currencySymbol = settings.currency;

  // Filter transactions for the current month
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed

  const thisMonthTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.date);
    return txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth;
  });

  // Calculations for current month
  const currentMonthIncome = thisMonthTransactions
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const currentMonthExpenses = thisMonthTransactions
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const currentMonthBalance = currentMonthIncome - currentMonthExpenses;

  // Savings rate calculation
  const savingsRate = currentMonthIncome > 0 
    ? Math.max(0, ((currentMonthIncome - currentMonthExpenses) / currentMonthIncome) * 100) 
    : 0;

  // All-time balance
  const totalIncomeAllTime = transactions
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totalExpensesAllTime = transactions
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totalBalanceAllTime = totalIncomeAllTime - totalExpensesAllTime;

  // Budget warnings
  const budgetAlerts = budgets.map(budget => {
    const categorySpent = thisMonthTransactions
      .filter(tx => tx.type === 'expense' && tx.category === budget.category)
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const percentage = budget.limit > 0 ? (categorySpent / budget.limit) * 100 : 0;
    return {
      category: budget.category,
      limit: budget.limit,
      spent: categorySpent,
      percentage
    };
  }).filter(b => b.percentage >= 80);

  const recentTransactions = transactions.slice(0, 5);

  const formatCurrency = (val: number) => {
    return currencySymbol + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="fade-in">
      {/* 1. Header Row */}
      <div className="tab-header">
        <div>
          <h2 className="tab-title">Welcome back, {settings.name}!</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Here is your spending overview for {today.toLocaleString('default', { month: 'long', year: 'numeric' })}.
          </p>
        </div>
        <button className="btn btn-primary" onClick={onAddTransactionClick}>
          <Plus size={18} /> Add Transaction
        </button>
      </div>

      {/* 2. Stats Grid */}
      <div className="stats-grid">
        {/* Balance Card */}
        <GlassCard glowColor={currentMonthBalance >= 0 ? 'var(--color-primary)' : 'var(--color-danger)'}>
          <div className="stat-label">Net Balance (Monthly)</div>
          <div className="stat-value" style={{ color: currentMonthBalance >= 0 ? 'var(--text-primary)' : 'var(--color-danger)' }}>
            {formatCurrency(currentMonthBalance)}
          </div>
          <div className="stat-sub">
            <Wallet size={14} /> All-time: {formatCurrency(totalBalanceAllTime)}
          </div>
        </GlassCard>

        {/* Income Card */}
        <GlassCard glowColor="var(--color-success)">
          <div className="stat-label">Total Income</div>
          <div className="stat-value" style={{ color: 'var(--color-success)' }}>
            {formatCurrency(currentMonthIncome)}
          </div>
          <div className="stat-sub" style={{ color: 'var(--color-success)' }}>
            <ArrowUpRight size={14} /> Earned this month
          </div>
        </GlassCard>

        {/* Expense Card */}
        <GlassCard glowColor="var(--color-danger)">
          <div className="stat-label">Total Expenses</div>
          <div className="stat-value" style={{ color: 'var(--color-danger)' }}>
            {formatCurrency(currentMonthExpenses)}
          </div>
          <div className="stat-sub" style={{ color: 'var(--color-danger)' }}>
            <ArrowDownRight size={14} /> Spent this month
          </div>
        </GlassCard>

        {/* Savings Rate Card */}
        <GlassCard glowColor="var(--color-warning)">
          <div className="stat-label">Savings Rate</div>
          <div className="stat-value" style={{ color: 'var(--color-warning)' }}>
            {savingsRate.toFixed(1)}%
          </div>
          <div className="stat-sub">
            <Percent size={14} /> Goal: {settings.monthlySavingsGoal}%
          </div>
        </GlassCard>
      </div>

      {/* 3. Budget alerts (if any) */}
      {budgetAlerts.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          {budgetAlerts.map(alert => (
            <div 
              key={alert.category} 
              className="glass-panel"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px 24px',
                borderRadius: '16px',
                borderLeft: `4px solid ${alert.percentage >= 100 ? 'var(--color-danger)' : 'var(--color-warning)'}`,
                marginBottom: '12px'
              }}
            >
              <div style={{ color: alert.percentage >= 100 ? 'var(--color-danger)' : 'var(--color-warning)' }}>
                <AlertTriangle size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                  {alert.percentage >= 100 ? 'Budget Exceeded!' : 'Budget Warning!'}
                </span>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  You have spent {formatCurrency(alert.spent)} of your {formatCurrency(alert.limit)} limit in <strong>{alert.category}</strong> ({alert.percentage.toFixed(0)}%).
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Recent Transactions */}
      <GlassCard className="section-card">
        <div className="section-header">
          <h3 className="section-title">Recent Transactions</h3>
          <button className="btn btn-secondary" onClick={onViewAllClick} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
            View All <ArrowRight size={14} />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <p>No transactions added yet. Click "Add Transaction" to start!</p>
          </div>
        ) : (
          <div className="list-container">
            {recentTransactions.map((tx) => {
              const isExpense = tx.type === 'expense';
              const style = getCategoryIconStyle(tx.category, isExpense);
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
                      <span>
                        {tx.category} • {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <div className="item-right">
                    <span className={`item-amount ${isExpense ? 'amount-expense' : 'amount-income'}`}>
                      {isExpense ? '-' : '+'}{formatCurrency(tx.amount)}
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
        )}
      </GlassCard>
    </div>
  );
};

export default DashboardTab;
