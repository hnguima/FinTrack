import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Fab,
  Alert,
  Snackbar,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  Chip,
  CircularProgress,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { ApiClient } from "../utils/apiClient";
import { FinancialCacheManager } from "../utils/financialCacheManager";
import type { Account, CreateAccountRequest, AccountType } from "../types/finance";
import AccountForm from "../components/AccountForm";

// Temporary interface until we fix the module import issue
interface AccountWithBalance extends Account {
  balance: number;
}

interface AccountsScreenProps {
  user: any;
}

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(2),
}));

const AccountCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  transition: "transform 0.2s ease-in-out",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: theme.shadows[4],
  },
}));

const BalanceText = styled(Typography, {
  shouldForwardProp: (prop) => prop !== "negative",
})<{ negative?: boolean }>(({ theme, negative }) => ({
  fontWeight: "bold",
  fontSize: "1.25rem",
  color: negative ? theme.palette.error.main : theme.palette.success.main,
}));

const AccountsScreen: React.FC<AccountsScreenProps> = () => {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] =
    useState<AccountWithBalance | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{
    [key: number]: HTMLElement | null;
  }>({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  // Convert AccountWithBalance to CreateAccountRequest for form
  const convertAccountForForm = (account: AccountWithBalance | null): Partial<CreateAccountRequest> | null => {
    if (!account) return null;
    return {
      name: account.name,
      type: account.type as AccountType,
      currency: account.currency,
      institution: account.institution,
      metadata: account.metadata,
    };
  };

  // Load accounts on component mount
  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      console.log('[AccountsScreen] Loading accounts with smart balance caching...');
      
      // Use the smart balance caching method which handles everything
      const accountsWithBalances = await FinancialCacheManager.getAccountsWithCachedBalances();
      
      // Update accounts with the result (may be instant if cache was current)
      setAccounts(accountsWithBalances);
      console.log('[AccountsScreen] Accounts loaded/updated');
    } catch (error) {
      console.error("Error loading accounts:", error);
      setSnackbar({
        open: true,
        message:
          error instanceof Error ? error.message : "Failed to load accounts",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (accountData: CreateAccountRequest) => {
    try {
      const response = await ApiClient.createAccount(accountData);

      if (response.status === 201) {
        // Remove success message for seamless UX
        loadAccounts(); // Refresh accounts data
        setFormOpen(false);
      } else {
        throw new Error(response.data.message || "Failed to create account");
      }
    } catch (error) {
      console.error("Error creating account:", error);
      setSnackbar({
        open: true,
        message:
          error instanceof Error ? error.message : "Failed to create account",
        severity: "error",
      });
    }
  };

  const handleUpdateAccount = async (
    accountData: Partial<CreateAccountRequest>
  ) => {
    if (!editingAccount) return;

    try {
      const response = await ApiClient.updateAccount(
        editingAccount.id,
        accountData
      );

      if (response.status === 200) {
        // Remove success message for seamless UX
        loadAccounts(); // Refresh accounts data
        setFormOpen(false);
        setEditingAccount(null);
      } else {
        throw new Error(response.data.message || "Failed to update account");
      }
    } catch (error) {
      console.error("Error updating account:", error);
      setSnackbar({
        open: true,
        message:
          error instanceof Error ? error.message : "Failed to update account",
        severity: "error",
      });
    }
  };

  const handleDeleteAccount = async (accountId: number) => {
    try {
      const response = await ApiClient.deleteAccount(accountId);

      if (response.status === 200) {
        // Remove success message for seamless UX
        loadAccounts(); // Refresh accounts data
        closeAccountMenu(accountId);
      } else {
        throw new Error(response.data.message || "Failed to delete account");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      setSnackbar({
        open: true,
        message:
          error instanceof Error ? error.message : "Failed to delete account",
        severity: "error",
      });
    }
  };

  const openAccountMenu = (
    event: React.MouseEvent<HTMLElement>,
    accountId: number
  ) => {
    setMenuAnchor({ ...menuAnchor, [accountId]: event.currentTarget });
  };

  const closeAccountMenu = (accountId: number) => {
    setMenuAnchor({ ...menuAnchor, [accountId]: null });
  };

  const startEditAccount = (account: AccountWithBalance) => {
    setEditingAccount(account);
    setFormOpen(true);
    closeAccountMenu(account.id);
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const getAccountIcon = (type: string = "other") => {
    // Return different icons based on account type
    switch (type.toLowerCase()) {
      case "checking":
        return <AccountBalanceIcon />;
      case "savings":
        return <AccountBalanceIcon />;
      case "credit":
        return <AccountBalanceIcon />;
      case "investment":
        return <AccountBalanceIcon />;
      default:
        return <AccountBalanceIcon />;
    }
  };

  const getTotalBalance = () => {
    return accounts.reduce(
      (total, account) => total + (account.balance || 0),
      0
    );
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "50vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 3, maxWidth: 800, margin: "0 auto" }}>
      {/* Summary Section */}
      <StyledPaper>
        <Typography variant="h5" gutterBottom>
          {t("accounts", "Accounts")}
        </Typography>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <Typography variant="body2" color="text.secondary">
              {t("totalBalance", "Total Balance")}
            </Typography>
            <BalanceText negative={getTotalBalance() < 0}>
              {formatCurrency(getTotalBalance())}
            </BalanceText>
          </div>
          <Chip
            label={`${accounts.length} ${t("accounts", "accounts")}`}
            color="primary"
            variant="outlined"
          />
        </Box>
      </StyledPaper>

      {/* Accounts List */}
      {accounts.length === 0 ? (
        <StyledPaper>
          <Typography variant="body1" color="text.secondary" textAlign="center">
            {t(
              "noAccountsYet",
              "No accounts yet. Create your first account to get started!"
            )}
          </Typography>
        </StyledPaper>
      ) : (
        accounts.map((account) => (
          <AccountCard key={account.id}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", flex: 1 }}>
                  {getAccountIcon(account.type)}
                  <Box sx={{ ml: 2 }}>
                    <Typography variant="h6" component="div">
                      {account.name}
                    </Typography>
                    {account.institution && (
                      <Typography variant="body2" color="text.secondary">
                        {account.institution}
                      </Typography>
                    )}
                    <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                      {account.type && (
                        <Chip
                          label={account.type}
                          size="small"
                          variant="outlined"
                        />
                      )}
                      {account.currency && (
                        <Chip
                          label={account.currency}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <BalanceText negative={(account.balance || 0) < 0}>
                    {formatCurrency(account.balance || 0, account.currency)}
                  </BalanceText>
                  <IconButton
                    onClick={(e) => openAccountMenu(e, account.id)}
                    size="small"
                    sx={{ ml: 1 }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Box>
              </Box>
            </CardContent>

            {/* Account Menu */}
            <Menu
              anchorEl={menuAnchor[account.id]}
              open={Boolean(menuAnchor[account.id])}
              onClose={() => closeAccountMenu(account.id)}
            >
              <MenuItem onClick={() => startEditAccount(account)}>
                <ListItemIcon>
                  <EditIcon fontSize="small" />
                </ListItemIcon>
                {t("edit", "Edit")}
              </MenuItem>
              <MenuItem
                onClick={() => handleDeleteAccount(account.id)}
                sx={{ color: "error.main" }}
              >
                <ListItemIcon>
                  <DeleteIcon fontSize="small" color="error" />
                </ListItemIcon>
                {t("delete", "Delete")}
              </MenuItem>
            </Menu>
          </AccountCard>
        ))
      )}

      {/* Add Account FAB */}
      <Fab
        color="primary"
        aria-label="add account"
        sx={{
          position: "fixed",
          bottom: 16,
          right: 16,
        }}
        onClick={() => {
          setEditingAccount(null);
          setFormOpen(true);
        }}
      >
        <AddIcon />
      </Fab>

      {/* Account Form Dialog */}
      <AccountForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingAccount(null);
        }}
        onSubmit={editingAccount ? handleUpdateAccount : handleCreateAccount}
        initialData={convertAccountForForm(editingAccount)}
        title={
          editingAccount
            ? t("editAccount", "Edit Account")
            : t("createAccount", "Create Account")
        }
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AccountsScreen;
