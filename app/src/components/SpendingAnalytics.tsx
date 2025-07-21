import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { FinancialCacheManager } from "../utils/financialCacheManager";

interface SpendingData {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

interface AnalyticsProps {
  dateRange?: {
    start_date?: string;
    end_date?: string;
  };
}

const SpendingAnalytics: React.FC<AnalyticsProps> = ({ dateRange }) => {
  const [spendingData, setSpendingData] = useState<SpendingData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Colors for pie chart
  const COLORS = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff7300",
    "#00ff00",
    "#ff00ff",
    "#00ffff",
    "#ff0000",
    "#0000ff",
    "#ffff00",
  ];

  useEffect(() => {
    loadSpendingAnalysis();
  }, [period, dateRange]);

  const calculateSpendingAnalysis = (
    transactions: any[],
    startDate: string,
    endDate: string
  ): SpendingData[] => {
    // Filter transactions by date range and exclude income (positive amounts)
    const filteredTransactions = transactions.filter((transaction) => {
      const transactionDate = transaction.date;
      return (
        transactionDate >= startDate &&
        transactionDate <= endDate &&
        transaction.amount < 0
      ); // Only expenses (negative amounts)
    });

    // Group by category and calculate totals
    const categoryTotals: { [key: string]: { amount: number; count: number } } =
      {};

    filteredTransactions.forEach((transaction) => {
      const category = transaction.category || "Uncategorized";
      if (!categoryTotals[category]) {
        categoryTotals[category] = { amount: 0, count: 0 };
      }
      categoryTotals[category].amount += Math.abs(transaction.amount); // Convert to positive for display
      categoryTotals[category].count += 1;
    });

    // Calculate total spending for percentage calculation
    const totalSpending = Object.values(categoryTotals).reduce(
      (sum, cat) => sum + cat.amount,
      0
    );

    // Convert to array format expected by charts with percentage
    return Object.entries(categoryTotals)
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage: totalSpending > 0 ? (data.amount / totalSpending) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount); // Sort by amount descending
  };

  const loadSpendingAnalysis = async () => {
    try {
      setLoading(true);
      setError("");

      let startDate: string;
      let endDate: string;

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const currentDate = now.getDate();

      switch (period) {
        case "week": {
          const startOfWeek = new Date(now);
          startOfWeek.setDate(currentDate - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);

          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);

          startDate = startOfWeek.toISOString().split("T")[0];
          endDate = endOfWeek.toISOString().split("T")[0];
          break;
        }

        case "month":
          startDate = new Date(currentYear, currentMonth, 1)
            .toISOString()
            .split("T")[0];
          endDate = new Date(currentYear, currentMonth + 1, 0)
            .toISOString()
            .split("T")[0];
          break;

        case "quarter": {
          const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
          startDate = new Date(currentYear, quarterStartMonth, 1)
            .toISOString()
            .split("T")[0];
          endDate = new Date(currentYear, quarterStartMonth + 3, 0)
            .toISOString()
            .split("T")[0];
          break;
        }

        case "year":
          startDate = new Date(currentYear, 0, 1).toISOString().split("T")[0];
          endDate = new Date(currentYear, 11, 31).toISOString().split("T")[0];
          break;

        case "custom":
          if (!customStartDate || !customEndDate) {
            throw new Error("Please select both start and end dates");
          }
          startDate = customStartDate;
          endDate = customEndDate;
          break;

        default:
          throw new Error("Invalid period selected");
      }

      // Try to get cached transactions first for instant display
      const cachedData = await FinancialCacheManager.getCachedFinanceData();
      if (cachedData?.transactions?.length) {
        const analyticsData = calculateSpendingAnalysis(
          cachedData.transactions,
          startDate,
          endDate
        );
        setSpendingData(analyticsData);
        setLoading(false);
      }

      // Always refresh transactions in background to ensure data is current
      const freshData = await FinancialCacheManager.getFinanceDataWithCache();
      const analyticsData = calculateSpendingAnalysis(
        freshData.transactions,
        startDate,
        endDate
      );
      setSpendingData(analyticsData);
    } catch (err: any) {
      console.error("Error loading spending analysis:", err);
      setError(err.message || "Failed to load spending analysis");
    } finally {
      setLoading(false);
    }
  };
  const handleRefresh = () => {
    loadSpendingAnalysis();
  };

  const formatCurrency = (amount: number) => {
    return `$${Math.abs(amount).toFixed(2)}`;
  };

  const totalSpending = spendingData.reduce(
    (sum, item) => sum + Math.abs(item.amount),
    0
  );
  const topCategory = spendingData.length > 0 ? spendingData[0] : null;

  const renderCustomizedLabel = (entry: any) => {
    const percent = ((Math.abs(entry.amount) / totalSpending) * 100).toFixed(1);
    return `${percent}%`;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Spending Analytics
      </Typography>

      {/* Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Period</InputLabel>
                <Select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                >
                  <MenuItem value="week">Last Week</MenuItem>
                  <MenuItem value="month">Last Month</MenuItem>
                  <MenuItem value="quarter">Last 3 Months</MenuItem>
                  <MenuItem value="year">Last Year</MenuItem>
                  <MenuItem value="custom">Custom Range</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {period === "custom" && (
              <>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    fullWidth
                    label="Start Date"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    fullWidth
                    label="End Date"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>
              </>
            )}

            <Grid size={{ xs: 12, md: 3 }}>
              <Button
                variant="contained"
                onClick={handleRefresh}
                disabled={loading}
                fullWidth
              >
                {loading ? <CircularProgress size={24} /> : "Refresh"}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="textSecondary" gutterBottom>
                    Total Spending
                  </Typography>
                  <Typography variant="h4" color="error">
                    {formatCurrency(totalSpending)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="textSecondary" gutterBottom>
                    Categories
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {spendingData.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="textSecondary" gutterBottom>
                    Top Category
                  </Typography>
                  <Typography variant="h6" color="secondary">
                    {topCategory ? topCategory.category : "N/A"}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {topCategory ? formatCurrency(topCategory.amount) : ""}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {spendingData.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: "center" }}>
              <Typography variant="h6" color="textSecondary">
                No spending data found for the selected period
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {/* Pie Chart */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Spending by Category
                  </Typography>
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={spendingData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={150}
                        fill="#8884d8"
                        dataKey="amount"
                        nameKey="category"
                      >
                        {spendingData.map((item, index) => (
                          <Cell
                            key={`cell-${item.category}-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>

              {/* Bar Chart */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Spending Amount by Category
                  </Typography>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={spendingData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="category"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis tickFormatter={formatCurrency} />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Bar dataKey="amount" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>

              {/* Category Details Table */}
              <Grid size={{ xs: 12 }}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Category Breakdown
                  </Typography>
                  <Grid container spacing={1}>
                    {spendingData.map((item, index) => (
                      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.category}>
                        <Card variant="outlined" sx={{ p: 2 }}>
                          <Box display="flex" alignItems="center" mb={1}>
                            <Box
                              sx={{
                                width: 16,
                                height: 16,
                                bgcolor: COLORS[index % COLORS.length],
                                mr: 1,
                                borderRadius: "50%",
                              }}
                            />
                            <Typography variant="subtitle1" fontWeight="bold">
                              {item.category}
                            </Typography>
                          </Box>
                          <Typography variant="h6" color="error" gutterBottom>
                            {formatCurrency(item.amount)}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {item.count} transaction
                            {item.count !== 1 ? "s" : ""}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {(
                              (Math.abs(item.amount) / totalSpending) *
                              100
                            ).toFixed(1)}
                            % of total
                          </Typography>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Grid>
            </Grid>
          )}
        </>
      )}
    </Box>
  );
};

export default SpendingAnalytics;
