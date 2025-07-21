import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  Chip,
  Divider,
  Grid,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

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

interface TransactionDetailsProps {
  open: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  accounts: any[];
}

const TransactionDetails: React.FC<TransactionDetailsProps> = ({
  open,
  onClose,
  transaction,
  accounts,
}) => {
  if (!transaction) return null;

  const formatAmount = (amount: number, type: string) => {
    const formatted = Math.abs(amount).toFixed(2);
    return type === 'income' ? `+$${formatted}` : `-$${formatted}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      let processedDate = dateStr;
      if (dateStr.includes('T')) {
        processedDate = dateStr.split('T')[0];
      } else if (dateStr.includes(' ')) {
        processedDate = dateStr.split(' ')[0];
      }
      
      const date = new Date(processedDate);
      if (isNaN(date.getTime())) {
        return dateStr;
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateStr;
    }
  };

  const getAccountName = (accountId: number | null | undefined) => {
    if (!accountId) return 'External';
    const account = accounts.find(acc => acc.id === accountId);
    return account ? account.name : `Account ${accountId}`;
  };

  const getTransactionType = () => {
    if (!transaction.to_account_id) {
      return transaction.entry_type === 'income' ? 'Income from External Source' : 'Expense to External Destination';
    } else if (!transaction.account_id) {
      return 'Income from External Source';
    } else {
      return 'Transfer';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Transaction Details
        <IconButton
          onClick={onClose}
          sx={{ 
            color: 'grey.500',
            '&:hover': { color: 'grey.700' }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          {/* Transaction Type & Amount */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography
              variant="h4"
              color={transaction.amount >= 0 ? 'success.main' : 'error.main'}
              fontWeight="bold"
              gutterBottom
            >
              {formatAmount(transaction.amount, transaction.entry_type)}
            </Typography>
            <Chip
              label={getTransactionType()}
              color={(() => {
                if (transaction.entry_type === 'income') return 'success';
                if (transaction.entry_type === 'expense') return 'error';
                return 'primary';
              })()}
              variant="outlined"
            />
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Transaction Details Grid */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Description
              </Typography>
              <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
                {transaction.description}
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Category
              </Typography>
              <Chip
                label={transaction.category}
                size="small"
                color={transaction.category.includes('External') ? 'secondary' : 'default'}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Date
              </Typography>
              <Typography variant="body1">
                {formatDate(transaction.date)}
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle2" color="text.secondary">
                From Account
              </Typography>
              <Typography variant="body1">
                {getAccountName(transaction.account_id)}
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle2" color="text.secondary">
                To Account
              </Typography>
              <Typography variant="body1">
                {getAccountName(transaction.to_account_id)}
              </Typography>
            </Grid>

            {transaction.location && (
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Location
                </Typography>
                <Typography variant="body1">
                  {transaction.location}
                </Typography>
              </Grid>
            )}

            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Transaction ID
              </Typography>
              <Typography variant="body2" color="text.secondary">
                #{transaction.id}
              </Typography>
            </Grid>
          </Grid>

          {transaction.attachment_url && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Attachment
              </Typography>
              <Box
                component="a"
                href={transaction.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  display: 'inline-block',
                  padding: 1,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  textDecoration: 'none',
                  color: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                View Attachment
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionDetails;
