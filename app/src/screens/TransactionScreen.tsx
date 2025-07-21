import React, { useState, useEffect } from 'react';
import {
  Box,
  Alert,
  Fab,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as DuplicateIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import ApiClient from '../utils/apiClient';
import { FinancialCacheManager } from '../utils/financialCacheManager';
import TransactionTable from '../components/TransactionTable';
import TransactionForm from '../components/TransactionForm';
import TransactionDetails from '../components/TransactionDetails';

interface Transaction {
  id: number;
  account_id: number;
  amount: number;
  description: string;
  entry_type: string;
  category: string;
  date: string;
  location?: string;
  attachment_url?: string;
  account_name?: string;
  to_account_id?: number;
  to_account_name?: string;
}

const TransactionScreen: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    account_id: '',
    to_account_id: null as string | null,
    amount: '',
    description: '',
    entry_type: 'expense',
    category: '',
    date: new Date().toISOString().split('T')[0],
    location: '',
  });

  // Categories including external options
  const categories = [
    'Food & Dining',
    'Transportation',
    'Shopping',
    'Entertainment',
    'Bills & Utilities',
    'Healthcare',
    'Education',
    'Travel',
    'Groceries',
    'Gas',
    'Other',
    'External Income',
    'External Expense'
  ];

  useEffect(() => {
    loadFinanceData();
  }, []);

  const loadFinanceData = async () => {
    try {
      console.log('[TransactionScreen] Loading finance data with optimistic cache...');
      
      // First, try to load cached data immediately (no loading state)
      const cachedData = await FinancialCacheManager.getCachedFinanceData();
      if (cachedData) {
        console.log('[TransactionScreen] Loading cached data immediately...');
        setAccounts(cachedData.accounts);
        
        // Sort chronologically (newest first)
        const sortedTransactions = [...cachedData.transactions].sort((a: Transaction, b: Transaction) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        
        setTransactions(sortedTransactions);
        console.log('[TransactionScreen] Cached data loaded instantly');
      } else {
        // Only show loading if we have no cached data
        setLoading(true);
      }

      // Now check if we need to update in the background
      const updateStatus = await FinancialCacheManager.checkFinanceUpdateStatus();
      
      if (updateStatus.shouldUpdate || !updateStatus.cachedData) {
        console.log('[TransactionScreen] Fetching fresh data in background...');
        
        // Fetch fresh data in background
        const { transactions: transactionData, accounts: accountData } = 
          await FinancialCacheManager.getFinanceDataWithCache();

        setAccounts(accountData);
        
        // Sort chronologically (newest first)
        const sortedTransactions = [...transactionData].sort((a: Transaction, b: Transaction) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        
        setTransactions(sortedTransactions);
        console.log('[TransactionScreen] Fresh data updated');
      } else {
        console.log('[TransactionScreen] Using cached data (already up to date)');
      }
    } catch (error) {
      setError('Error loading finance data');
      console.error('Error loading finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAddTransaction = () => {
    setEditingTransaction(null);
    setFormData({
      account_id: '',
      to_account_id: null,
      amount: '',
      description: '',
      entry_type: 'expense',
      category: '',
      date: new Date().toISOString().split('T')[0],
      location: '',
    });
    setIsFormOpen(true);
  };

  const openDuplicateTransaction = (transaction: Transaction) => {
    setEditingTransaction(null); // This is a new transaction, not editing
    
    // Copy all data except date (use today's date)
    setFormData({
      account_id: transaction.account_id ? transaction.account_id.toString() : '',
      to_account_id: transaction.to_account_id ? transaction.to_account_id.toString() : null,
      amount: Math.abs(transaction.amount).toString(),
      description: transaction.description,
      entry_type: transaction.entry_type,
      category: transaction.category,
      date: new Date().toISOString().split('T')[0], // Today's date
      location: transaction.location || '',
    });
    setIsFormOpen(true);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, transaction: Transaction) => {
    setMenuAnchor(event.currentTarget);
    setSelectedTransaction(transaction);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    // Don't clear selectedTransaction immediately - let dialogs use it
    // It will be cleared when a new transaction is selected
  };

  const openEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    
    // Fix date parsing - check multiple possible date fields
    let dateValue = transaction.date || (transaction as any).created_at || (transaction as any).timestamp;
    if (!dateValue) {
      dateValue = new Date().toISOString().split('T')[0]; // fallback to today
    } else if (dateValue.includes('T')) {
      dateValue = dateValue.split('T')[0];
    } else if (dateValue.includes(' ')) {
      // Handle datetime format like '2025-07-20 16:26:38'
      dateValue = dateValue.split(' ')[0];
    }
    
    setFormData({
      account_id: transaction.account_id ? transaction.account_id.toString() : '',
      to_account_id: transaction.to_account_id ? transaction.to_account_id.toString() : '',
      amount: Math.abs(transaction.amount).toString(),
      description: transaction.description,
      entry_type: transaction.entry_type,
      category: transaction.category,
      date: dateValue,
      location: transaction.location || '',
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      let transactionData: any = {
        ...formData,
        amount: parseFloat(formData.amount),
        date: formData.date,
      };

      // Handle transaction logic based on account perspective
      
      if (formData.account_id === 'external_source' && formData.to_account_id) {
        // External Source -> Account = Income for the destination account
        transactionData.from_account_id = null; // External source
        transactionData.to_account_id = parseInt(formData.to_account_id);
        transactionData.entry_type = 'income';
        transactionData.amount = Math.abs(transactionData.amount); // Positive for income
      } else if (formData.account_id && !formData.account_id.toString().startsWith('external') && formData.to_account_id === 'external_destination') {
        // Account -> External Destination = Expense for the source account
        transactionData.from_account_id = parseInt(formData.account_id);
        transactionData.to_account_id = null; // External destination
        transactionData.entry_type = 'expense';
        transactionData.amount = -Math.abs(transactionData.amount); // Negative for expense
      } else if (formData.account_id && !formData.account_id.toString().startsWith('external') && formData.to_account_id && !formData.to_account_id.toString().startsWith('external')) {
        // Account -> Account = Transfer
        transactionData.from_account_id = parseInt(formData.account_id);
        transactionData.to_account_id = parseInt(formData.to_account_id);
        transactionData.entry_type = 'transfer';
        transactionData.amount = -Math.abs(transactionData.amount); // Negative from source perspective
      } else {
        // Invalid combination
        setError('Invalid transaction combination');
        return;
      }

      let response;
      if (editingTransaction) {
        response = await ApiClient.updateTransaction(editingTransaction.id, transactionData);
      } else {
        response = await ApiClient.createEntry(transactionData);
      }

      if (response.status === 200 || response.status === 201) {
        // Remove success message for seamless UX
        setIsFormOpen(false);
        // Optimistically refresh data from cache
        loadFinanceData();
      } else {
        setError('Failed to save transaction');
      }
    } catch (error) {
      setError('Error saving transaction');
      console.error('Error saving transaction:', error);
    }
  };

  const handleDelete = async (transactionId: number) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    try {
      const response = await ApiClient.deleteTransaction(transactionId);
      if (response.status === 200) {
        // Remove success message for seamless UX
        // Optimistically refresh data from cache
        loadFinanceData();
      } else {
        setError('Failed to delete transaction');
      }
    } catch (error) {
      setError('Error deleting transaction');
      console.error('Error deleting transaction:', error);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Transactions Table */}
      <TransactionTable
        transactions={transactions}
        loading={loading}
        onMenuOpen={handleMenuOpen}
      />

      {/* Add Transaction FAB */}
      <Fab
        color="primary"
        aria-label="add transaction"
        sx={{
          position: 'fixed',
          bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', // Above bottom navigation + safe area
          right: 'calc(16px + env(safe-area-inset-right, 0px))', // Right margin + safe area
        }}
        onClick={openAddTransaction}
      >
        <AddIcon />
      </Fab>

      {/* Transaction Form Dialog */}
      <TransactionForm
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
        editingTransaction={editingTransaction}
        formData={formData}
        setFormData={setFormData}
        accounts={accounts}
        categories={categories}
      />

      {/* Transaction Details Dialog */}
      <TransactionDetails
        open={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
        accounts={accounts}
      />

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          handleMenuClose();
          setIsDetailsOpen(true);
        }}>
          <ListItemIcon>
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          handleMenuClose();
          if (selectedTransaction) {
            openEditTransaction(selectedTransaction);
          }
        }}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          handleMenuClose();
          if (selectedTransaction) {
            openDuplicateTransaction(selectedTransaction);
          }
        }}>
          <ListItemIcon>
            <DuplicateIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Duplicate</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          handleMenuClose();
          if (selectedTransaction) {
            handleDelete(selectedTransaction.id);
          }
        }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default TransactionScreen;
