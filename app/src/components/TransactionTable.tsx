import React from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import TransactionItem from "./TransactionItem";

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

interface TransactionTableProps {
  transactions: Transaction[];
  loading: boolean;
  onMenuOpen: (
    event: React.MouseEvent<HTMLElement>,
    transaction: Transaction
  ) => void;
}

const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  loading,
  onMenuOpen,
}) => {
  const formatAmount = (amount: number, type: string) => {
    const formatted = Math.abs(amount).toFixed(2);
    return type === "income" ? `+$${formatted}` : `-$${formatted}`;
  };

  const groupTransactionsByMonth = (transactions: Transaction[]) => {
    const grouped: { [key: string]: Transaction[] } = {};

    transactions.forEach((transaction) => {
      try {
        let dateStr = transaction.date || (transaction as any).created_at;
        if (!dateStr) {
          const fallbackDate = new Date();
          const monthKey = `${fallbackDate.getFullYear()}-${String(
            fallbackDate.getMonth() + 1
          ).padStart(2, "0")}`;
          if (!grouped[monthKey]) {
            grouped[monthKey] = [];
          }
          grouped[monthKey].push(transaction);
          return;
        }

        if (dateStr.includes("T")) {
          dateStr = dateStr.split("T")[0];
        } else if (dateStr.includes(" ")) {
          dateStr = dateStr.split(" ")[0];
        }

        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          const fallbackDate = new Date();
          const monthKey = `${fallbackDate.getFullYear()}-${String(
            fallbackDate.getMonth() + 1
          ).padStart(2, "0")}`;
          if (!grouped[monthKey]) {
            grouped[monthKey] = [];
          }
          grouped[monthKey].push(transaction);
          return;
        }

        const monthKey = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;

        if (!grouped[monthKey]) {
          grouped[monthKey] = [];
        }
        grouped[monthKey].push(transaction);
      } catch (error) {
        console.error(
          "Error parsing date for transaction:",
          transaction,
          error
        );
        const fallbackDate = new Date();
        const monthKey = `${fallbackDate.getFullYear()}-${String(
          fallbackDate.getMonth() + 1
        ).padStart(2, "0")}`;
        if (!grouped[monthKey]) {
          grouped[monthKey] = [];
        }
        grouped[monthKey].push(transaction);
      }
    });

    return grouped;
  };

  const formatMonthHeader = (monthKey: string) => {
    const [year, month] = monthKey.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography>Loading transactions...</Typography>
      </Paper>
    );
  }

  const groupedTransactions = groupTransactionsByMonth(transactions);

  if (Object.keys(groupedTransactions).length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography align="center">No transactions found</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ mb: 2 }}>
      <TableContainer sx={{ maxHeight: { xs: "70vh", md: "none" } }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 60, width: 60 }}>Date</TableCell>
              <TableCell sx={{ minWidth: 120 }}>Description</TableCell>
              <TableCell
                sx={{
                  minWidth: 100,
                  display: { xs: "none", sm: "table-cell" },
                }}
              >
                Category
              </TableCell>
              <TableCell sx={{ minWidth: 80, textAlign: "right" }}>
                Amount
              </TableCell>
              <TableCell sx={{ minWidth: 48, width: 48 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.keys(groupedTransactions)
              .sort((a, b) => b.localeCompare(a))
              .map((monthKey) => {
                const sortedTransactions = [
                  ...groupedTransactions[monthKey],
                ].sort((a: Transaction, b: Transaction) => {
                  try {
                    let dateA = a.date;
                    let dateB = b.date;

                    if (dateA.includes("T")) dateA = dateA.split("T")[0];
                    if (dateB.includes("T")) dateB = dateB.split("T")[0];

                    const timeA = new Date(dateA).getTime();
                    const timeB = new Date(dateB).getTime();

                    if (isNaN(timeA) || isNaN(timeB)) {
                      return b.id - a.id;
                    }

                    return timeB - timeA;
                  } catch (error) {
                    console.error("Error sorting transactions by date:", error);
                    return b.id - a.id;
                  }
                });

                return [
                  // Month separator row
                  <TableRow key={`header-${monthKey}`}>
                    <TableCell
                      colSpan={5}
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                        fontWeight: "bold",
                        textAlign: "center",
                        py: 1,
                      }}
                    >
                      {formatMonthHeader(monthKey)}
                    </TableCell>
                  </TableRow>,
                  // Transaction rows for this month
                  ...sortedTransactions.map((transaction: Transaction) => (
                    <TransactionItem
                      key={transaction.id}
                      transaction={transaction}
                      onMenuOpen={onMenuOpen}
                      formatAmount={formatAmount}
                    />
                  )),
                ];
              })
              .flat()}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default TransactionTable;
