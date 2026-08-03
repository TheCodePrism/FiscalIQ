import React, { useState, useMemo } from 'react';
import type { Transaction, AppSettings } from '../db/IndexedDBService';
import { GlassCard } from './ui/GlassCard';
import { DonutChart, TrendLineChart } from './ui/CustomChart';
import { ShoppingBag, PiggyBank, BarChart2 } from 'lucide-react';

interface AnalyticsTabProps {
  transactions: Transaction[];
  settings: AppSettings;
}

// Tailored vibrant color palette for expense categories
const CATEGORY_COLORS: Record<string, string> = {
  'Groceries': '#3b82f6', // blue
  'Housing & Rent': '#ec4899', // pink
  'Utilities': '#eab308', // yellow
  'Dining Out': '#f97316', // orange
  'Entertainment': '#a855f7', // purple
  'Transport': '#06b6d4', // cyan
  'Shopping': '#fd2e7a', // light pink/red
  'Medical & Health': '#10b981', // emerald
  'Education': '#6366f1', // indigo
  'Other Expense': '#6b7280' // slate
};

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ transactions, settings }) => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    return `${today.getFullYear()}-${mm}`; // YYYY-MM
  });

  const currencySymbol = settings.currency;

  // Extract unique months for dropdown
  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach(tx => {
      if (tx.date) months.add(tx.date.substring(0, 7));
    });
    // Add current month in case there are no transactions
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    months.add(`${today.getFullYear()}-${mm}`);
    
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  // 1. Calculations for selected month category breakdown
  const categoryData = useMemo(() => {
    const expenses = transactions.filter(tx => 
      tx.type === 'expense' && 
      tx.date.startsWith(selectedMonth)
    );

    const totals: Record<string, number> = {};
    expenses.forEach(tx => {
      totals[tx.category] = (totals[tx.category] || 0) + tx.amount;
    });

    const list = Object.keys(totals).map(cat => ({
      name: cat,
      value: totals[cat],
      color: CATEGORY_COLORS[cat] || '#808080'
    }));

    // Sort descending by value
    return list.sort((a, b) => b.value - a.value);
  }, [transactions, selectedMonth]);

  // Overall totals for selected month
  const monthSummary = useMemo(() => {
    const monthTxs = transactions.filter(tx => tx.date.startsWith(selectedMonth));
    const income = monthTxs.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
    const expense = monthTxs.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
    const avgSize = monthTxs.length > 0 ? (monthTxs.reduce((sum, tx) => sum + tx.amount, 0) / monthTxs.length) : 0;

    return {
      income,
      expense,
      balance: income - expense,
      avgSize
    };
  }, [transactions, selectedMonth]);

  // 2. Calculations for 6-Month Trend Chart
  const trendData = useMemo(() => {
    // Generate the last 6 months in YYYY-MM formats
    const list: { label: string; yearMonth: string; income: number; expense: number }[] = [];
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const label = d.toLocaleString('default', { month: 'short' });
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      list.push({
        label: `${label} ${yyyy.toString().substring(2)}`,
        yearMonth: `${yyyy}-${mm}`,
        income: 0,
        expense: 0
      });
    }

    // Populate values
    transactions.forEach(tx => {
      const txMonth = tx.date.substring(0, 7); // YYYY-MM
      const bucket = list.find(item => item.yearMonth === txMonth);
      if (bucket) {
        if (tx.type === 'income') {
          bucket.income += tx.amount;
        } else {
          bucket.expense += tx.amount;
        }
      }
    });

    return list;
  }, [transactions]);

  // Find top expense category
  const topCategory = categoryData[0] || null;

  const formatCurrency = (val: number) => {
    return currencySymbol + val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const selectedMonthFriendly = useMemo(() => {
    const [year, month] = selectedMonth.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  }, [selectedMonth]);

  return (
    <div className="fade-in">
      {/* Tab Header */}
      <div className="tab-header">
        <div>
          <h2 className="tab-title">Analytics & Insights</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Deep dive into your financial patterns and habits.</p>
        </div>

        {/* Month Selector */}
        <select
          className="filter-select"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          style={{ width: '200px' }}
        >
          {monthOptions.map(m => {
            const [year, month] = m.split('-');
            const date = new Date(Number(year), Number(month) - 1, 1);
            const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
            return <option key={m} value={m}>{monthName}</option>;
          })}
        </select>
      </div>

      {/* Analytics Grid */}
      <div className="analytics-grid">
        {/* Category Breakdown (Donut) */}
        <GlassCard className="chart-card">
          <h3 className="section-title" style={{ alignSelf: 'flex-start', marginBottom: '16px' }}>
            Category Distribution ({selectedMonthFriendly})
          </h3>
          <div className="chart-container">
            <DonutChart data={categoryData} currencySymbol={currencySymbol} />
          </div>

          <div className="chart-legend">
            {categoryData.map(item => (
              <div key={item.name} className="legend-item">
                <span className="legend-color" style={{ backgroundColor: item.color }}></span>
                <span style={{ flex: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{item.name}</span>
                <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(item.value)}</strong>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Cashflow Trends (Trend Line) */}
        <GlassCard className="chart-card">
          <h3 className="section-title" style={{ alignSelf: 'flex-start', marginBottom: '16px' }}>
            Cash Flow Trend (Last 6 Months)
          </h3>
          <div className="chart-container">
            <TrendLineChart data={trendData} currencySymbol={currencySymbol} />
          </div>
          
          <div 
            style={{ 
              display: 'flex', 
              gap: '24px', 
              marginTop: '32px', 
              justifyContent: 'center', 
              width: '100%',
              fontSize: '0.875rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: 'var(--color-success)' }}></span>
              <span style={{ color: 'var(--text-secondary)' }}>Income</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: 'var(--color-danger)' }}></span>
              <span style={{ color: 'var(--text-secondary)' }}>Expenses</span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Summary Insights Row */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '24px', 
          marginTop: '24px' 
        }}
      >
        <GlassCard style={{ padding: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ color: 'var(--color-danger)', background: 'var(--color-danger-light)', padding: '12px', borderRadius: '16px' }}>
            <ShoppingBag size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Top Expense Category</div>
            <h4 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>
              {topCategory ? topCategory.name : 'N/A'}
            </h4>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {topCategory ? `Spent ${formatCurrency(topCategory.value)} this month` : 'No expenses recorded'}
            </span>
          </div>
        </GlassCard>

        <GlassCard style={{ padding: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ color: 'var(--color-success)', background: 'var(--color-success-light)', padding: '12px', borderRadius: '16px' }}>
            <PiggyBank size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Savings / Surplus</div>
            <h4 style={{ fontSize: '1.25rem', color: monthSummary.balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
              {formatCurrency(monthSummary.balance)}
            </h4>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {monthSummary.income > 0 
                ? `${((monthSummary.balance / monthSummary.income) * 100).toFixed(0)}% of earnings saved` 
                : 'No income recorded'}
            </span>
          </div>
        </GlassCard>

        <GlassCard style={{ padding: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ color: 'var(--color-primary)', background: 'var(--color-primary-light)', padding: '12px', borderRadius: '16px' }}>
            <BarChart2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Avg. Transaction Size</div>
            <h4 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>
              {formatCurrency(monthSummary.avgSize)}
            </h4>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Across all items this month
            </span>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default AnalyticsTab;
export { CATEGORY_COLORS };
