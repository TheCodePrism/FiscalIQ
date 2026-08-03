import React, { useMemo } from 'react';
import type { Transaction, Budget, AppSettings } from '../db/IndexedDBService';
import { GlassCard } from './ui/GlassCard';
import { ProgressRing } from './ui/CustomChart';
import { 
  Lightbulb, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Award,
  Zap
} from 'lucide-react';

interface InsightsTabProps {
  transactions: Transaction[];
  budgets: Budget[];
  settings: AppSettings;
}

interface InsightCardItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  title: string;
  message: string;
  icon: React.ReactNode;
}

export const InsightsTab: React.FC<InsightsTabProps> = ({ transactions, budgets, settings }) => {
  const currencySymbol = settings.currency;

  // Time calculations
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  
  const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const lastMonthYear = lastMonthDate.getFullYear();
  const lastMonthVal = lastMonthDate.getMonth();

  // Filter lists
  const thisMonthTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const d = new Date(tx.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
  }, [transactions, currentYear, currentMonth]);

  const lastMonthTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const d = new Date(tx.date);
      return d.getFullYear() === lastMonthYear && d.getMonth() === lastMonthVal;
    });
  }, [transactions, lastMonthYear, lastMonthVal]);

  // Aggregate monthly amounts
  const currentIncome = thisMonthTransactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
  const currentExpense = thisMonthTransactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
  const currentSavings = Math.max(0, currentIncome - currentExpense);

  const lastMonthExpense = lastMonthTransactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);

  // 1. Savings Goal calculations
  const savingsRate = currentIncome > 0 ? (currentSavings / currentIncome) * 100 : 0;
  const savingsGoalPercentage = settings.monthlySavingsGoal > 0 
    ? Math.min((savingsRate / settings.monthlySavingsGoal) * 100, 100) 
    : 0;

  // 2. Spending Velocity calculations
  const velocityMetrics = useMemo(() => {
    // Current month days elapsed
    const daysElapsedThisMonth = today.getDate();
    // Total days in last month
    const daysInLastMonth = new Date(lastMonthYear, lastMonthVal + 1, 0).getDate();

    const dailyAvgThisMonth = currentExpense / daysElapsedThisMonth;
    const dailyAvgLastMonth = lastMonthExpense / daysInLastMonth;

    const percentDiff = dailyAvgLastMonth > 0 
      ? ((dailyAvgThisMonth - dailyAvgLastMonth) / dailyAvgLastMonth) * 100 
      : 0;

    return {
      dailyAvgThisMonth,
      dailyAvgLastMonth,
      percentDiff
    };
  }, [currentExpense, lastMonthExpense, lastMonthYear, lastMonthVal, today]);

  // 3. 50/30/20 Rule Analysis
  // Needs: Housing, Groceries, Utilities, Medical
  // Wants: Dining, Entertainment, Shopping, Other
  // Savings: Actual Savings (or savings goal allocation)
  const ruleAnalysis = useMemo(() => {
    if (currentIncome === 0) return null;

    let needs = 0;
    let wants = 0;
    
    thisMonthTransactions.filter(tx => tx.type === 'expense').forEach(tx => {
      const cat = tx.category;
      if (['Housing & Rent', 'Groceries', 'Utilities', 'Medical & Health', 'Education'].includes(cat)) {
        needs += tx.amount;
      } else {
        wants += tx.amount;
      }
    });

    const needsPercent = (needs / currentIncome) * 100;
    const wantsPercent = (wants / currentIncome) * 100;
    const savingsPercent = (currentSavings / currentIncome) * 100;

    return {
      needs: { spent: needs, percent: needsPercent },
      wants: { spent: wants, percent: wantsPercent },
      savings: { spent: currentSavings, percent: savingsPercent }
    };
  }, [thisMonthTransactions, currentIncome, currentSavings]);

  // 4. Generate dynamic suggestions cards
  const suggestions = useMemo(() => {
    const list: InsightCardItem[] = [];

    // Rule 1: No budgets set
    if (budgets.length === 0) {
      list.push({
        id: 'no-budgets',
        type: 'info',
        title: 'Create Category Budgets',
        message: 'You have not set any category budgets yet. Creating budgets can help reduce impulse purchases by up to 20%. Try setting one on the Budgets page!',
        icon: <Lightbulb size={20} style={{ color: 'var(--color-primary)' }} />
      });
    }

    // Rule 2: Savings rate vs Goal
    if (currentIncome > 0) {
      if (savingsRate >= settings.monthlySavingsGoal) {
        list.push({
          id: 'savings-goal-reached',
          type: 'success',
          title: 'Savings Target Met!',
          message: `Incredible! Your current savings rate is ${savingsRate.toFixed(0)}%, which exceeds your monthly savings goal of ${settings.monthlySavingsGoal}%. Keep up the fantastic progress!`,
          icon: <Award size={20} style={{ color: 'var(--color-success)' }} />
        });
      } else if (savingsRate < settings.monthlySavingsGoal && savingsRate > 0) {
        const gap = settings.monthlySavingsGoal - savingsRate;
        list.push({
          id: 'savings-goal-short',
          type: 'warning',
          title: 'Closing in on Savings Goal',
          message: `You are saving ${savingsRate.toFixed(0)}% of your income. You need to save ${gap.toFixed(0)}% more to hit your goal. Consider trimming back on Wants this week.`,
          icon: <Zap size={20} style={{ color: 'var(--color-warning)' }} />
        });
      } else if (savingsRate === 0 && currentExpense > 0) {
        list.push({
          id: 'savings-goal-zero',
          type: 'danger',
          title: 'Savings Deficit Alert',
          message: 'Your expenses have exceeded your income this month. Look through your recent transactions to identify non-essential subscriptions or shopping entries that can be canceled.',
          icon: <AlertTriangle size={20} style={{ color: 'var(--color-danger)' }} />
        });
      }
    }

    // Rule 3: Category specific budget overruns
    budgets.forEach(b => {
      const spent = thisMonthTransactions
        .filter(tx => tx.type === 'expense' && tx.category === b.category)
        .reduce((sum, tx) => sum + tx.amount, 0);

      const percent = b.limit > 0 ? (spent / b.limit) * 100 : 0;
      if (percent >= 100) {
        list.push({
          id: `overrun-${b.category}`,
          type: 'danger',
          title: `${b.category} Budget Exceeded`,
          message: `You have spent ${currencySymbol}${spent.toLocaleString()} which is over your set limit of ${currencySymbol}${b.limit.toLocaleString()} for ${b.category}. Consider postponing other purchases in this category.`,
          icon: <AlertTriangle size={20} style={{ color: 'var(--color-danger)' }} />
        });
      } else if (percent >= 85) {
        list.push({
          id: `warning-${b.category}`,
          type: 'warning',
          title: `${b.category} Budget Critical`,
          message: `Spending on ${b.category} is at ${percent.toFixed(0)}% of your budget limit. You have only ${currencySymbol}${(b.limit - spent).toLocaleString()} left for the rest of the month.`,
          icon: <AlertTriangle size={20} style={{ color: 'var(--color-warning)' }} />
        });
      }
    });

    // Rule 4: Spending velocity acceleration
    if (lastMonthExpense > 0 && velocityMetrics.percentDiff > 15) {
      list.push({
        id: 'spending-velocity-warning',
        type: 'warning',
        title: 'Spending Velocity Accelerating',
        message: `Your average daily spend this month (${currencySymbol}${Math.round(velocityMetrics.dailyAvgThisMonth).toLocaleString()}/day) is ${velocityMetrics.percentDiff.toFixed(0)}% higher than last month (${currencySymbol}${Math.round(velocityMetrics.dailyAvgLastMonth).toLocaleString()}/day). Try to moderate your outflow.`,
        icon: <Activity size={20} style={{ color: 'var(--color-warning)' }} />
      });
    } else if (lastMonthExpense > 0 && velocityMetrics.percentDiff < -10) {
      list.push({
        id: 'spending-velocity-success',
        type: 'success',
        title: 'Spending Velocity Slowing',
        message: `Fantastic! Your average daily spend this month is ${Math.abs(velocityMetrics.percentDiff).toFixed(0)}% lower than last month. You are maintaining excellent budget control.`,
        icon: <CheckCircle size={20} style={{ color: 'var(--color-success)' }} />
      });
    }

    // Rule 5: Heavy single categories (e.g. Dining out is > 20% of expenses)
    if (currentExpense > 0) {
      const diningSpent = thisMonthTransactions
        .filter(tx => tx.type === 'expense' && tx.category === 'Dining Out')
        .reduce((sum, tx) => sum + tx.amount, 0);

      const diningRatio = (diningSpent / currentExpense) * 100;
      if (diningRatio > 25 && diningSpent > 100) {
        list.push({
          id: 'dining-out-heavy',
          type: 'info',
          title: 'Optimize Food Expenses',
          message: `Dining out accounts for ${diningRatio.toFixed(0)}% of your total expenses this month (${currencySymbol}${diningSpent.toLocaleString()}). Packing a lunch or cooking at home twice this week could save you up to ${currencySymbol}100!`,
          icon: <Lightbulb size={20} style={{ color: 'var(--color-primary)' }} />
        });
      }
    }

    // If no specific advice, show a default info cards
    if (list.length === 0) {
      list.push({
        id: 'generic-saving-tip',
        type: 'info',
        title: 'General Wealth Advice',
        message: 'Try saving small amounts consistently. Setting aside just 10% of freelance or side-hustle earnings directly into an investment bucket creates compound growth over time.',
        icon: <Info size={20} style={{ color: 'var(--color-accent)' }} />
      });
    }

    return list;
  }, [budgets, currentIncome, currentExpense, savingsRate, settings, thisMonthTransactions, lastMonthExpense, velocityMetrics, currencySymbol]);

  const formatCurrency = (val: number) => {
    return currencySymbol + val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  return (
    <div className="fade-in">
      <div className="tab-header">
        <div>
          <h2 className="tab-title">Financial Insights</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Automated audits and spending recommendations generated on your local device.</p>
        </div>
      </div>

      <div className="analytics-grid" style={{ marginBottom: '32px' }}>
        {/* Savings Gauge */}
        <GlassCard style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3 className="section-title" style={{ alignSelf: 'flex-start', marginBottom: '24px' }}>Monthly Savings Target</h3>
          
          <ProgressRing 
            percentage={savingsGoalPercentage} 
            color={savingsGoalPercentage >= 100 ? 'var(--color-success)' : savingsGoalPercentage >= 50 ? 'var(--color-primary)' : 'var(--color-warning)'}
            size={160}
            strokeWidth={16}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{savingsRate.toFixed(0)}%</div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Rate Saved</div>
            </div>
          </ProgressRing>

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>
              {savingsGoalPercentage >= 100 
                ? '🏆 Savings Goal Achieved!' 
                : `Currently saved ${formatCurrency(currentSavings)} of earnings.`
              }
            </p>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Goal: Save {settings.monthlySavingsGoal}% of monthly earnings.
            </span>
          </div>
        </GlassCard>

        {/* 50/30/20 Budget Rule */}
        <GlassCard style={{ padding: '24px' }}>
          <h3 className="section-title" style={{ marginBottom: '8px' }}>50/30/20 Rule Benchmark</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            A standard framework: 50% on Needs (Housing, Food, Health), 30% on Wants (Entertainment, Shopping), and 20% saved.
          </p>

          {ruleAnalysis === null ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <p>Add income and expense transactions to view the 50/30/20 breakdown.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Needs bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '6px' }}>
                  <span>Needs (Target: 50%)</span>
                  <strong>{ruleAnalysis.needs.percent.toFixed(0)}% ({formatCurrency(ruleAnalysis.needs.spent)})</strong>
                </div>
                <div className="budget-progress-bar">
                  <div 
                    className="budget-progress-fill progress-success" 
                    style={{ 
                      width: `${Math.min(ruleAnalysis.needs.percent, 100)}%`,
                      backgroundColor: ruleAnalysis.needs.percent > 50 ? 'var(--color-warning)' : 'var(--color-success)'
                    }}
                  ></div>
                </div>
              </div>

              {/* Wants bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '6px' }}>
                  <span>Wants (Target: 30%)</span>
                  <strong>{ruleAnalysis.wants.percent.toFixed(0)}% ({formatCurrency(ruleAnalysis.wants.spent)})</strong>
                </div>
                <div className="budget-progress-bar">
                  <div 
                    className="budget-progress-fill progress-primary" 
                    style={{ 
                      width: `${Math.min(ruleAnalysis.wants.percent, 100)}%`,
                      backgroundColor: ruleAnalysis.wants.percent > 30 ? 'var(--color-danger)' : 'var(--color-primary)'
                    }}
                  ></div>
                </div>
              </div>

              {/* Savings bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '6px' }}>
                  <span>Savings (Target: 20%)</span>
                  <strong>{ruleAnalysis.savings.percent.toFixed(0)}% ({formatCurrency(ruleAnalysis.savings.spent)})</strong>
                </div>
                <div className="budget-progress-bar">
                  <div 
                    className="budget-progress-fill progress-warning" 
                    style={{ 
                      width: `${Math.min(ruleAnalysis.savings.percent, 100)}%`,
                      backgroundColor: ruleAnalysis.savings.percent >= 20 ? 'var(--color-success)' : 'var(--color-warning)'
                    }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Spending Velocity Meter */}
      {lastMonthExpense > 0 && (
        <GlassCard style={{ padding: '20px 24px', marginBottom: '32px', display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Spending Velocity</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                {formatCurrency(velocityMetrics.dailyAvgThisMonth)}/day
              </span>
              <span style={{ fontSize: '0.85rem', color: velocityMetrics.percentDiff > 0 ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                {velocityMetrics.percentDiff > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {velocityMetrics.percentDiff > 0 ? '+' : ''}{velocityMetrics.percentDiff.toFixed(0)}% vs last month
              </span>
            </div>
          </div>

          <div style={{ borderLeft: '1px solid var(--panel-border)', height: '40px', display: 'none' }} className="analytics-grid"></div>

          <div style={{ flex: 1, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Last month, you spent an average of <strong>{formatCurrency(velocityMetrics.dailyAvgLastMonth)}</strong> per day. 
            {velocityMetrics.percentDiff > 10 
              ? ' You are spending faster this month. Consider dialing back on non-essentials.' 
              : velocityMetrics.percentDiff < -5 
                ? ' Excellent budget discipline! You are pacing well below last month\'s rate.' 
                : ' You are pacing almost exactly the same as last month. Good stability.'
            }
          </div>
        </GlassCard>
      )}

      {/* Suggestion Cards */}
      <h3 className="section-title" style={{ marginBottom: '20px' }}>Tailored Spending Audits</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {suggestions.map((s) => (
          <div key={s.id} className={`glass-panel insight-card ${s.type}`}>
            <div className="insight-icon">{s.icon}</div>
            <div className="insight-content">
              <h4 style={{ color: `var(--color-${s.type === 'info' ? 'primary' : s.type})` }}>
                {s.title}
              </h4>
              <p>{s.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InsightsTab;
export type { InsightCardItem };
