import React, { useState, useEffect } from 'react';
import type { Transaction } from '../db/IndexedDBService';
import { X } from 'lucide-react';

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
    } else {
      setType('expense');
      setAmount('');
      setCategory('');
      // Default to local YYYY-MM-DD
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);
      setDescription('');
    }
    setErrorMsg('');
  }, [transactionToEdit, isOpen]);

  // Set default category when type changes
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
        type
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
          {transactionToEdit ? 'Edit Transaction' : 'Add Transaction'}
        </h3>

        <form onSubmit={handleSubmit}>
          {/* 1. Type Toggle */}
          <div className="type-selector" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            <div 
              className={`type-btn ${type === 'expense' ? 'active expense' : ''}`}
              onClick={() => setType('expense')}
            >
              Expense
            </div>
            <div 
              className={`type-btn ${type === 'income' ? 'active income' : ''}`}
              onClick={() => setType('income')}
            >
              Income
            </div>
            <div 
              className={`type-btn ${type === 'savings' ? 'active savings' : ''}`}
              onClick={() => setType('savings')}
            >
              Savings
            </div>
          </div>

          {/* 2. Amount Input */}
          <div className="form-group">
            <label htmlFor="amount">Amount ({currencySymbol})</label>
            <input
              type="number"
              id="amount"
              step="any"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              autoFocus
            />
          </div>

          {/* 3. Category Select */}
          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Date Input */}
          <div className="form-group">
            <label htmlFor="date">Date</label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* 5. Description Textarea */}
          <div className="form-group">
            <label htmlFor="description">Description (Optional)</label>
            <input
              type="text"
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Weekly groceries shopping"
              maxLength={120}
            />
          </div>

          {errorMsg && (
            <div style={{ color: 'var(--color-danger)', fontSize: '0.875rem', marginBottom: '20px', fontWeight: 500 }}>
              {errorMsg}
            </div>
          )}

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '30px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className={type === 'expense' ? 'btn btn-danger' : 'btn btn-success'}
              disabled={submitting}
            >
              {submitting ? 'Saving...' : transactionToEdit ? 'Save Changes' : 'Add Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionForm;
