import React, { useState, useMemo } from 'react';
import type { Transaction, Budget, AppSettings } from '../db/IndexedDBService';
import { GlassCard } from './ui/GlassCard';
import { EXPENSE_CATEGORIES } from './TransactionForm';
import { Plus, Trash2, ShieldAlert, Award } from 'lucide-react';

interface BudgetTabProps {
  transactions: Transaction[];
  budgets: Budget[];
  settings: AppSettings;
  onSaveBudget: (budget: Budget) => Promise<void>;
  onDeleteBudget: (category: string) => Promise<void>;
}

export const BudgetTab: React.FC<BudgetTabProps> = ({
  transactions,
  budgets,
  settings,
  onSaveBudget,
  onDeleteBudget
}) => {
  const [selectedCategory, setSelectedCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [limit, setLimit] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const currencySymbol = settings.currency;

  // Filter transactions for current month
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const thisMonthExpenses = useMemo(() => {
    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return tx.type === 'expense' && 
             txDate.getFullYear() === currentYear && 
             txDate.getMonth() === currentMonth;
    });
  }, [transactions, currentYear, currentMonth]);

  // Aggregate spending by category for the current month
  const categorySpending = useMemo(() => {
    const spending: Record<string, number> = {};
    thisMonthExpenses.forEach(tx => {
      spending[tx.category] = (spending[tx.category] || 0) + tx.amount;
    });
    return spending;
  }, [thisMonthExpenses]);

  // Handle budget form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const parsedLimit = parseFloat(limit);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      setErrorMsg('Please enter a valid limit greater than 0.');
      return;
    }

    setSaving(true);
    try {
      await onSaveBudget({
        category: selectedCategory,
        limit: parsedLimit
      });
      setLimit('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save budget.');
    } finally {
      setSaving(false);
    }
  };

  // Detailed budget details
  const budgetDetails = useMemo(() => {
    return budgets.map(b => {
      const spent = categorySpending[b.category] || 0;
      const remaining = b.limit - spent;
      const percentage = b.limit > 0 ? (spent / b.limit) * 100 : 0;
      
      let progressColorClass = 'progress-success';
      let borderGlow = 'var(--color-success)';
      
      if (percentage >= 100) {
        progressColorClass = 'progress-danger';
        borderGlow = 'var(--color-danger)';
      } else if (percentage >= 80) {
        progressColorClass = 'progress-warning';
        borderGlow = 'var(--color-warning)';
      }

      return {
        ...b,
        spent,
        remaining,
        percentage,
        progressColorClass,
        borderGlow
      };
    });
  }, [budgets, categorySpending]);

  // Total budget summary
  const totalSummary = useMemo(() => {
    const totalLimit = budgets.reduce((sum, b) => sum + b.limit, 0);
    const totalSpentInBudgetedCategories = budgets.reduce((sum, b) => {
      return sum + (categorySpending[b.category] || 0);
    }, 0);
    const totalRemaining = totalLimit - totalSpentInBudgetedCategories;
    const overallPercentage = totalLimit > 0 ? (totalSpentInBudgetedCategories / totalLimit) * 100 : 0;

    return {
      totalLimit,
      totalSpent: totalSpentInBudgetedCategories,
      totalRemaining,
      overallPercentage
    };
  }, [budgets, categorySpending]);

  const formatCurrency = (val: number) => {
    return currencySymbol + val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  return (
    <div className="fade-in">
      <div className="tab-header">
        <div>
          <h2 className="tab-title">Budget Allocation</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Establish limits for individual spending categories and monitor compliance.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '24px', alignItems: 'flex-start' }} className="analytics-grid">
        {/* Create/Update Budget Form */}
        <GlassCard style={{ padding: '24px' }}>
          <h3 className="section-title" style={{ marginBottom: '20px' }}>Set Category Budget</h3>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="budget-cat">Category</label>
              <select
                id="budget-cat"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                required
              >
                {EXPENSE_CATEGORIES.map((cat: string) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="budget-limit">Monthly Limit ({currencySymbol})</label>
              <input
                type="number"
                id="budget-limit"
                step="any"
                min="1"
                placeholder="e.g. 500"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                required
              />
            </div>

            {errorMsg && (
              <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: '16px', fontWeight: 500 }}>
                {errorMsg}
              </p>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={saving}>
              <Plus size={18} /> {saving ? 'Saving...' : 'Set Budget'}
            </button>
          </form>

          {/* Quick instructions or notes */}
          <div style={{ marginTop: '24px', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            <p>💡 Budgets are calculated per calendar month. Setting a new budget for an existing category will overwrite the previous limit.</p>
          </div>
        </GlassCard>

        {/* Budget list */}
        <div>
          {/* Overall summary bar */}
          {budgets.length > 0 && (
            <GlassCard 
              style={{ 
                padding: '20px 24px', 
                marginBottom: '24px',
                '--card-border-color': totalSummary.overallPercentage >= 100 ? 'var(--color-danger)' : totalSummary.overallPercentage >= 80 ? 'var(--color-warning)' : 'var(--color-primary)'
              } as React.CSSProperties}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Overall Budget Utilization</span>
                <span style={{ fontSize: '1rem', fontWeight: 700 }}>
                  {formatCurrency(totalSummary.totalSpent)} / {formatCurrency(totalSummary.totalLimit)}
                </span>
              </div>
              
              <div className="budget-progress-bar" style={{ height: '10px' }}>
                <div 
                  className={`budget-progress-fill ${totalSummary.overallPercentage >= 100 ? 'progress-danger' : totalSummary.overallPercentage >= 80 ? 'progress-warning' : 'progress-success'}`}
                  style={{ width: `${Math.min(totalSummary.overallPercentage, 100)}%` }}
                ></div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                <span>Spent: {totalSummary.overallPercentage.toFixed(0)}%</span>
                <span>
                  {totalSummary.totalRemaining >= 0 
                    ? `Remaining: ${formatCurrency(totalSummary.totalRemaining)}` 
                    : `Over Limit By: ${formatCurrency(Math.abs(totalSummary.totalRemaining))}`
                  }
                </span>
              </div>
            </GlassCard>
          )}

          {budgets.length === 0 ? (
            <GlassCard style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <ShieldAlert size={40} style={{ color: 'var(--text-muted)' }} />
                <p>No budgets configured. Use the form on the left to set limits!</p>
              </div>
            </GlassCard>
          ) : (
            <div className="budget-grid">
              {budgetDetails.map(item => (
                <GlassCard key={item.category} className="budget-card" glowColor={item.borderGlow}>
                  <div className="budget-card-header">
                    <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{item.category}</span>
                    <button 
                      className="icon-btn btn-delete" 
                      onClick={() => onDeleteBudget(item.category)}
                      title={`Remove budget for ${item.category}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="budget-progress-container">
                    <div className="budget-progress-bar">
                      <div 
                        className={`budget-progress-fill ${item.progressColorClass}`}
                        style={{ width: `${Math.min(item.percentage, 100)}%` }}
                      ></div>
                    </div>

                    <div className="budget-values">
                      <span>Spent: <strong>{formatCurrency(item.spent)}</strong></span>
                      <span>Limit: <strong>{formatCurrency(item.limit)}</strong></span>
                    </div>

                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      marginTop: '12px',
                      fontSize: '0.8rem',
                      borderTop: '1px solid var(--panel-border)',
                      paddingTop: '8px',
                      color: item.remaining >= 0 ? 'var(--text-secondary)' : 'var(--color-danger)'
                    }}>
                      <span>{item.remaining >= 0 ? 'Remaining' : 'Over limit'}</span>
                      <strong style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {item.remaining < 0 && <ShieldAlert size={12} />}
                        {item.percentage >= 100 && item.spent > 0 ? (
                          <span style={{ color: 'var(--color-danger)' }}>{formatCurrency(Math.abs(item.remaining))}</span>
                        ) : item.percentage === 0 ? (
                          <span style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '2px' }}><Award size={12} /> {formatCurrency(item.remaining)}</span>
                        ) : (
                          <span>{formatCurrency(item.remaining)}</span>
                        )}
                      </strong>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BudgetTab;
