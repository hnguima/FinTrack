import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type { CreateAccountRequest, AccountType } from "../types/finance";

interface AccountFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAccountRequest) => void;
  initialData?: Partial<CreateAccountRequest> | null;
  title: string;
}

const accountTypes: AccountType[] = [
  "checking",
  "savings",
  "credit",
  "investment",
  "cash",
  "other",
];

const currencies = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CAD",
  "AUD",
  "CHF",
  "CNY",
  "BRL",
];

const AccountForm: React.FC<AccountFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialData,
  title,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<CreateAccountRequest>({
    name: "",
    type: "checking",
    currency: "USD",
    institution: "",
    metadata: "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          name: initialData.name || "",
          type: initialData.type || "checking",
          currency: initialData.currency || "USD",
          institution: initialData.institution || "",
          metadata: initialData.metadata || "",
        });
      } else {
        setFormData({
          name: "",
          type: "checking",
          currency: "USD",
          institution: "",
          metadata: "",
        });
      }
      setErrors({});
    }
  }, [open, initialData]);

  const handleInputChange = (
    field: keyof CreateAccountRequest,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = t("accountNameRequired", "Account name is required");
    }

    if (formData.name.trim().length < 2) {
      newErrors.name = t(
        "accountNameTooShort",
        "Account name must be at least 2 characters"
      );
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      type: "checking",
      currency: "USD",
      institution: "",
      metadata: "",
    });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {title}
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 1 }}>
          <TextField
            label={t("accountName", "Account Name")}
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            error={!!errors.name}
            helperText={errors.name}
            required
            fullWidth
          />

          <TextField
            label={t("accountType", "Account Type")}
            value={formData.type}
            onChange={(e) =>
              handleInputChange("type", e.target.value as AccountType)
            }
            select
            fullWidth
          >
            {accountTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {t(
                  `accountType_${type}`,
                  type.charAt(0).toUpperCase() + type.slice(1)
                )}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label={t("currency", "Currency")}
            value={formData.currency}
            onChange={(e) => handleInputChange("currency", e.target.value)}
            select
            fullWidth
          >
            {currencies.map((currency) => (
              <MenuItem key={currency} value={currency}>
                {currency}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label={t("institution", "Institution")}
            value={formData.institution}
            onChange={(e) => handleInputChange("institution", e.target.value)}
            placeholder={t(
              "institutionPlaceholder",
              "e.g. Bank of America, Chase, etc."
            )}
            fullWidth
          />

          <TextField
            label={t("notes", "Notes")}
            value={formData.metadata}
            onChange={(e) => handleInputChange("metadata", e.target.value)}
            placeholder={t(
              "notesPlaceholder",
              "Optional notes about this account"
            )}
            multiline
            rows={3}
            fullWidth
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={handleClose} color="inherit">
          {t("cancel", "Cancel")}
        </Button>
        <Button onClick={handleSubmit} variant="contained">
          {initialData ? t("update", "Update") : t("create", "Create")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AccountForm;
