import React, { useState, useEffect } from 'react';
import type { Transaction } from '../db/IndexedDBService';
import { X, RefreshCw } from 'lucide-react';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Transaction) => Promise<void>;
  transactionToEdit?: Transaction | null;
  currencySymbol: string;
}

export const EXPENSE_CATEGORIES = [
  'Groceries',
  'Housing & Rent',
  'Utilities',
  'EMI & Loans',
  'Dining Out',
  'Entertainment',
  'Transport',
  'Shopping',
  'Medical & Health',
  'Education',
  'Other Expense'
];

export const INCOME_CATEGORIES = [
  'Salary',
  'Freelance & Side Hustle',
  'Investments',
  'Gifts',
  'Other Income'
];

export const SAVINGS_CATEGORIES = [
  'Emergency Fund',
  'Mutual Funds & Stocks',
  'Fixed Deposit / RD',
  'Retirement & Pension',
  'Crypto & Digital Assets',
  'Gold & Commodities',
  'Other Savings'
];

export const TransactionForm: React.FC<TransactionFormProps> = ({
  isOpen,
  onClose,
  onSave,
  transactionToEdit,
  currencySymbol
}) => {
  const [type, setType] = useState<'income' | 'expense' | 'savings'>('expense');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [frequency, setFrequency] = useState<'monthly' | 'weekly' | 'yearly'>('monthly');
  const [endDate, setEndDate] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Reset or load initial fields
  useEffect(() => {
    if (transactionToEdit) {
      setType(transactionToEdit.type);
      setAmount(transactionToEdit.amount.toString());
      setCategory(transactionToEdit.category);
      setDate(transactionToEdit.date);
      setDescription(transactionToEdit.description);
      setIsRecurring(!!transactionToEdit.isRecurring);
      setFrequency(transactionToEdit.frequency ?? 'monthly');
      setEndDate(transactionToEdit.endDate ?? '');
    } else {
      setType('expense');
      setAmount('');
      setCategory('');
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);
      setDescription('');
      setIsRecurring(false);
      setFrequency('monthly');
      setEndDate('');
    }
    setErrorMsg('');
  }, [transactionToEdit, isOpen]);

  useEffect(() => {
    if (!transactionToEdit) {
      if (type === 'expense') setCategory(EXPENSE_CATEGORIES[0]);
      else if (type === 'income') setCategory(INCOME_CATEGORIES[0]);
      else setCategory(SAVINGS_CATEGORIES[0]);
    }
  }, [type, transactionToEdit]);

  const categories = type === 'expense' 
    ? EXPENSE_CATEGORIES 
    : type === 'income' 
      ? INCOME_CATEGORIES 
      : SAVINGS_CATEGORIES;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid amount greater than 0.');
      return;
    }

    if (!category) {
      setErrorMsg('Please select a category.');
      return;
    }

    if (!date) {
      setErrorMsg('Please select a date.');
      return;
    }

    setSubmitting(true);
    try {
      const txData: Transaction = {
        amount: parsedAmount,
        category,
        date,
        description: description.trim(),
        type,
        isRecurring,
        ...(isRecurring && { frequency, endDate: endDate || undefined })
      };

      if (transactionToEdit && transactionToEdit.id !== undefined) {
        txData.id = transactionToEdit.id;
      }

      await onSave(txData);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="glass-panel modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ '--card-border-color': type === 'expense' ? 'var(--color-danger)' : 'var(--color-success)' } as React.CSSProperties}
      >
        <button className="icon-btn modal-close" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        <h3 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>
          {transactionToEdit && transactionToEdit.id !== undefined 
            ? 'Edit Transaction' 
            : transactionToEdit 
              ? 'Duplicate Transaction' 
              : 'Add Transaction'}
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="type-selector" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            <div className={`type-btn ${type === 'expense' ? 'active expense' : ''}`} onClick={() => setType('expense')}>Expense</div>
            <div className={`type-btn ${type === 'income' ? 'active income' : ''}`} onClick={() => setType('income')}>Income</div>
            <div className={`type-btn ${type === 'savings' ? 'active savings' : ''}`} onClick={() => setType('savings')}>Savings</div>
          </div>

          <div className="form-group">
            <label htmlFor="amount">Amount ({currencySymbol})</label>
            <input type="number" id="amount" step="any" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
          </div>

          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} required>
              {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="date">Date</label>
            <input type="date" id="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          {/* Recurring Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: '12px',
              background: isRecurring ? 'var(--color-primary-light)' : 'var(--glass-bg)',
              border: `1px solid ${isRecurring ? 'var(--color-primary)' : 'var(--panel-border)'}`,
              marginBottom: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onClick={() => setIsRecurring(!isRecurring)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <RefreshCw size={15} style={{ color: isRecurring ? 'var(--color-primary)' : 'var(--text-muted)', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: isRecurring ? 'var(--color-primary)' : 'var(--text-primary)' }}>
                  Recurring Transaction
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Auto-posts every month/period until end date
                </div>
              </div>
            </div>
            <div style={{
              width: '44px', height: '24px', borderRadius: '12px',
              background: isRecurring ? 'var(--color-primary)' : 'var(--panel-border)',
              position: 'relative', transition: 'background 0.2s ease', flexShrink: 0
            }}>
              <div style={{
                width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
                position: 'absolute', top: '3px',
                left: isRecurring ? '23px' : '3px',
                transition: 'left 0.2s ease',
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
              }} />
            </div>
          </div>

          {isRecurring && (
            <>
              <div className="form-group">
                <label>Frequency</label>
                <select value={frequency} onChange={(e) => setFrequency(e.target.value as 'monthly' | 'weekly' | 'yearly')}>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div className="form-group">
                <label>End Date (Optional)</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="description">Description (Optional)</label>
            <input type="text" id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Weekly groceries shopping" maxLength={120} />
          </div>

          {errorMsg && <div style={{ color: 'var(--color-danger)', fontSize: '0.875rem', marginBottom: '20px', fontWeight: 500 }}>{errorMsg}</div>}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '30px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className={type === 'expense' ? 'btn btn-danger' : 'btn btn-success'} disabled={submitting}>
              {submitting 
                ? 'Saving...' 
                : (transactionToEdit && transactionToEdit.id !== undefined) 
                  ? 'Save Changes' 
                  : 'Add Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionForm;
