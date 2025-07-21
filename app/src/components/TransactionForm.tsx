import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  IconButton,
  Fab,
} from "@mui/material";
import { Close as CloseIcon, Check as CheckIcon } from "@mui/icons-material";

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

interface FormData {
  account_id: string;
  to_account_id: string | null;
  amount: string;
  description: string;
  entry_type: string;
  category: string;
  date: string;
  location: string;
}

interface Account {
  id: number;
  name: string;
}

interface TransactionFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  editingTransaction: Transaction | null;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  accounts: Account[];
  categories: string[];
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  open,
  onClose,
  onSubmit,
  editingTransaction,
  formData,
  setFormData,
  accounts,
  categories,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={onSubmit}>
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {editingTransaction ? "Edit Transaction" : "Add Transaction"}
          <IconButton
            onClick={onClose}
            sx={{
              color: "grey.500",
              "&:hover": { color: "grey.700" },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pb: 10 }}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth required>
                <InputLabel>From Account</InputLabel>
                <Select
                  value={formData.account_id}
                  onChange={(e) => {
                    const newFromValue = e.target.value;
                    setFormData((prev) => {
                      let newToValue = prev.to_account_id;

                      if (newFromValue === prev.to_account_id) {
                        newToValue = null;
                      }
                      if (
                        newFromValue === "external_source" &&
                        prev.to_account_id === "external_destination"
                      ) {
                        newToValue = null;
                      }

                      return {
                        ...prev,
                        account_id: newFromValue,
                        to_account_id: newToValue,
                      };
                    });
                  }}
                >
                  {formData.to_account_id !== "external_destination" && (
                    <MenuItem value="external_source">External Source</MenuItem>
                  )}
                  {accounts
                    .filter(
                      (account) =>
                        account.id.toString() !== formData.to_account_id
                    )
                    .map((account) => (
                      <MenuItem key={account.id} value={account.id}>
                        {account.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>To Account</InputLabel>
                <Select
                  value={formData.to_account_id || ""}
                  onChange={(e) => {
                    const newToValue = e.target.value || null;
                    setFormData((prev) => {
                      let newFromValue = prev.account_id;

                      if (newToValue === prev.account_id) {
                        newFromValue = "";
                      }
                      if (
                        newToValue === "external_destination" &&
                        prev.account_id === "external_source"
                      ) {
                        newFromValue = "";
                      }

                      return {
                        ...prev,
                        account_id: newFromValue,
                        to_account_id: newToValue,
                      };
                    });
                  }}
                >
                  {formData.account_id !== "external_source" && (
                    <MenuItem value="external_destination">
                      External Destination
                    </MenuItem>
                  )}
                  {accounts
                    .filter(
                      (account) => account.id.toString() !== formData.account_id
                    )
                    .map((account) => (
                      <MenuItem key={account.id} value={account.id}>
                        {account.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                required
                label="Amount"
                type="number"
                slotProps={{
                  htmlInput: {
                    step: "0.01",
                    min: "0.01",
                  },
                }}
                value={formData.amount}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (value >= 0 || e.target.value === "") {
                    setFormData((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }));
                  }
                }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                required
                label="Description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                >
                  {categories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, date: e.target.value }))
                }
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: {
                    max: new Date().toISOString().split("T")[0],
                  },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Location"
                value={formData.location}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, location: e.target.value }))
                }
              />
            </Grid>
          </Grid>
        </DialogContent>

        {/* Floating Submit Button */}
        <Fab
          color="success"
          type="submit"
          sx={{
            position: "absolute",
            bottom: 16,
            right: 16,
          }}
        >
          <CheckIcon />
        </Fab>
      </form>
    </Dialog>
  );
};

export default TransactionForm;
