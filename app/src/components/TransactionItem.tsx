import React from "react";
import {
  TableRow,
  TableCell,
  Typography,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import { MoreVert as MoreVertIcon } from "@mui/icons-material";

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

interface TransactionItemProps {
  transaction: Transaction;
  onMenuOpen: (
    event: React.MouseEvent<HTMLElement>,
    transaction: Transaction
  ) => void;
  formatAmount: (amount: number, type: string) => string;
}

const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  onMenuOpen,
  formatAmount,
}) => {
  const formatDate = (transaction: Transaction) => {
    try {
      let dateStr = transaction.date || (transaction as any).created_at;
      if (!dateStr) {
        return "N/A";
      }

      if (dateStr.includes("T")) {
        dateStr = dateStr.split("T")[0];
      } else if (dateStr.includes(" ")) {
        dateStr = dateStr.split(" ")[0];
      }

      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return dateStr;
      }
      return date.getDate(); // Only show the day
    } catch (error) {
      console.error("Error formatting date:", error);
      return "N/A";
    }
  };

  const truncateText = (text: string, maxLength: number = 30) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <TableRow
      key={transaction.id}
      hover
      sx={{
        "&:hover": {
          backgroundColor: "action.hover",
        },
      }}
    >
      <TableCell sx={{ py: 1.5 }}>
        <Typography variant="body2" fontWeight="medium">
          {formatDate(transaction)}
        </Typography>
      </TableCell>
      <TableCell sx={{ py: 1.5, maxWidth: { xs: 120, sm: 200, md: "none" } }}>
        <Tooltip title={transaction.description} arrow placement="top">
          <Typography
            variant="body2"
            sx={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              cursor: "pointer",
            }}
          >
            {truncateText(transaction.description, 25)}
          </Typography>
        </Tooltip>
      </TableCell>
      <TableCell sx={{ py: 1.5, display: { xs: "none", sm: "table-cell" } }}>
        <Chip
          label={transaction.category}
          size="small"
          color={
            transaction.category.includes("External") ? "secondary" : "default"
          }
          sx={{
            fontSize: "0.75rem",
            height: 24,
            maxWidth: 100,
            "& .MuiChip-label": {
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            },
          }}
        />
      </TableCell>
      <TableCell sx={{ py: 1.5, textAlign: "right" }}>
        <Typography
          variant="body2"
          color={transaction.amount >= 0 ? "success.main" : "error.main"}
          fontWeight="bold"
          sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}
        >
          {formatAmount(transaction.amount, transaction.entry_type)}
        </Typography>
      </TableCell>
      <TableCell sx={{ py: 1.5, textAlign: "right" }}>
        <IconButton
          size="small"
          onClick={(e) => onMenuOpen(e, transaction)}
          sx={{ p: 0.5 }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
};

export default TransactionItem;
