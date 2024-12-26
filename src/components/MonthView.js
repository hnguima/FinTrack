import React from "react";
import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import { IconButton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFnsV3";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";

const MonthView = ({ selectedMonth, selectedYear }) => {
  const [data, setData] = useState([]);
  const [newRowData, setNewRowData] = useState({ description: "", value: 0 });
  const [dateLimits, setDateLimits] = useState({});
  const [currMonth, setCurrMonth] = useState(selectedMonth);
  const [currYear, setCurrYear] = useState(selectedYear);

  const fetchData = async (month, year) => {
    try {
      const response = await fetch(
        `http://localhost:3001/entries?month=${month}&year=${year}`
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      setData(data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const fetchDateLimits = async () => {
    try {
      const response = await fetch(`http://localhost:3001/datelimits`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const dateLimits = await response.json();
      setDateLimits(dateLimits);

      console.log(dateLimits);
    } catch (error) {
      console.error("Error fetching date limits:", error);
      return null;
    }
  };

  useEffect(() => {
    fetchData(currMonth, currYear);
  }, [currMonth, currYear]);

  useEffect(() => {
    fetchDateLimits();
  }, []);

  const total = data
    .reduce((acc, row) => {
      if (row.is_wage) {
        return acc + row.value;
      } else {
        return acc - row.value;
      }
    }, 0)
    .toFixed(2);

  const getNextMonthYear = () => {
    if (currMonth === 12) {
      return [1, currYear + 1];
    } else {
      return [currMonth + 1, currYear];
    }
  };
  const getPreviousMonthYear = () => {
    if (currMonth === 1) {
      return [12, currYear - 1];
    } else {
      return [currMonth - 1, currYear];
    }
  };
  const checkDateLimits = (month, year) => {
    return !(
      year < dateLimits.minYear ||
      (year === dateLimits.minYear && month < dateLimits.minMonth) ||
      year > dateLimits.maxYear ||
      (year === dateLimits.maxYear && month > dateLimits.maxMonth)
    );
  };

  const handleMonthChange = (isNext) => {
    let [newMonth, newYear] = isNext
      ? getNextMonthYear()
      : getPreviousMonthYear();

    if (!checkDateLimits(newMonth, newYear)) {
      return;
    }

    if (
      (currMonth === newMonth && currYear === newYear) ||
      newMonth === undefined ||
      newYear === undefined
    ) {
      return;
    }

    setCurrMonth(newMonth);
    setCurrYear(newYear);
    setData([]);
  };

  const [showValues, setShowValues] = useState(true);

  const toggleShowValues = () => {
    setShowValues(!showValues);
  };

  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const sortedData = React.useMemo(() => {
    let sortableData = [...data];
    if (sortConfig.key !== null) {
      sortableData.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableData;
  }, [data, sortConfig]);

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const [open, setOpen] = useState(false);

  const handleNewItemDialogOpen = () => {
    setOpen(true);
  };

  const handleNewItemDialogClose = (add) => {
    if (add) {
      const newRow = { ...newRowData };
      newRow.is_wage = newRow.value >= 0;
      newRow.value = Math.abs(newRow.value);
      setData([...data, newRow]);
    } 

    setOpen(false);
  };

  return (
    <div>
      <IconButton onClick={toggleShowValues}>
        {showValues ? <VisibilityOffIcon /> : <VisibilityIcon />}
      </IconButton>

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
        }}
      >
        <IconButton
          onClick={() => handleMonthChange(false)}
          disabled={
            currMonth === dateLimits.minMonth && currYear === dateLimits.minYear
          }
          style={{ margin: "8px" }}
        >
          <ArrowBackIcon />
        </IconButton>

        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            views={["year", "month"]}
            label="Year and Month"
            minDate={new Date(dateLimits.minYear, dateLimits.minMonth - 1)}
            maxDate={new Date(dateLimits.maxYear, dateLimits.maxMonth - 1)}
            value={new Date(currYear, currMonth - 1)}
            onChange={(newValue) => {
              const newYear = newValue.getFullYear();
              const newMonth = newValue.getMonth() + 1;
              setCurrMonth(newMonth);
              setCurrYear(newYear);
              setData([]);
            }}
          />
        </LocalizationProvider>

        <IconButton
          onClick={() => handleMonthChange(true)}
          disabled={
            currMonth === dateLimits.maxMonth && currYear === dateLimits.maxYear
          }
          style={{ margin: "8px" }}
        >
          <ArrowForwardIcon />
        </IconButton>
      </div>
      <TableContainer
        component={Paper}
        style={{ width: "80vw", margin: "0 auto" }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell
                style={{
                  width: "50px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
                onClick={() => requestSort("code")}
              >
                Code
                {sortConfig.key === "code" &&
                  (sortConfig.direction === "asc" ? " ▲" : " ▼")}
              </TableCell>
              <TableCell
                style={{
                  width: "200px",
                  fontWeight: "bold",
                }}
                onClick={() => requestSort("description")}
              >
                Description
                {sortConfig.key === "description" &&
                  (sortConfig.direction === "asc" ? " ▲" : " ▼")}
              </TableCell>
              <TableCell
                style={{
                  width: "100px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
                onClick={() => requestSort("value")}
              >
                Value
                {sortConfig.key === "value" &&
                  (sortConfig.direction === "asc" ? " ▲" : " ▼")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedData.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.code}</TableCell>
                <TableCell>{row.description}</TableCell>
                <TableCell>
                  <span
                    style={{
                      color: row.is_wage ? "green" : "red",
                      fontWeight: "bold",
                    }}
                  >
                    {showValues ? "R$ " + row.value?.toFixed(2) : "R$ ****"}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={3} style={{ textAlign: "center" }}>
                <IconButton onClick={handleNewItemDialogOpen}>
                  <AddIcon />
                </IconButton>
              </TableCell>
            </TableRow>
            <TableRow style={{ borderTop: "2px solid black" }}>
              <TableCell colSpan={2}>Total</TableCell>
              <TableCell>
                <span
                  style={{
                    color: total >= 0 ? "green" : "red",
                    fontWeight: "bold",
                  }}
                >
                  {showValues ? "R$ " + total : "R$ ****"}
                </span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleNewItemDialogClose}>
        <DialogTitle>Add New Entry</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Description"
            type="text"
            fullWidth
            onChange={(e) => {
              newRowData.description = e.target.value;
              setNewRowData({ ...newRowData });
            }}
          />
          <TextField
            margin="dense"
            label="Value"
            type="number"
            fullWidth
            onChange={(e) => {
              newRowData.value = parseFloat(e.target.value);
              setNewRowData({ ...newRowData });
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              handleNewItemDialogClose(false);
            }}
            color="primary"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              handleNewItemDialogClose(true);
            }}
            color="primary"
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
MonthView.propTypes = {
  selectedMonth: PropTypes.number.isRequired,
  selectedYear: PropTypes.number.isRequired,
};

export default MonthView;
