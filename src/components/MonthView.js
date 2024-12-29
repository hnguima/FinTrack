import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";

import { IconButton } from "@mui/material";

import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

import DialogNewEntry from "./DialogNewEntry";
import MonthYearSelector from "./MonthYearSelector";

import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableContainer from "@mui/material/TableContainer";
import TableBody from "@mui/material/TableBody";
import TableHead from "@mui/material/TableHead";
import TableRowHeader from "./TableRowHeader";
import TableRowEntry from "./TableRowEntry";
import TableRowTotal from "./TableRowTotal";
import TableRowButton from "./TableRowButton";

import "./MonthView.css";

const headers = [
  {
    id: "code",
    numeric: true,
    disablePadding: true,
    label: "Code",
  },
  {
    id: "desc",
    numeric: false,
    disablePadding: false,
    label: "Description",
  },
  {
    id: "value",
    numeric: true,
    disablePadding: false,
    label: "Value",
  },
];

const MonthView = ({ selectedMonth, selectedYear }) => {
  const [data, setData] = useState([]);
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
      return data;
    } catch (error) {
      console.error("Error fetching data:", error);
      return [];
    }
  };

  const fetchDateLimits = async () => {
    try {
      const response = await fetch(`http://localhost:3001/datelimits`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const dateLimits = await response.json();
      return dateLimits;
    } catch (error) {
      console.error("Error fetching date limits:", error);
      return null;
    }
  };

  useEffect(() => {
    fetchData(currMonth, currYear).then((data) => setData(data));
  }, [currMonth, currYear]);

  useEffect(() => {
    fetchDateLimits().then((data) => setDateLimits(data));
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

  const onMonthChange = (newMonth, newYear) => {
    setCurrMonth(newMonth);
    setCurrYear(newYear);
    setData([]);
  };

  const [hidden, setHidden] = useState(false);
  
  const [sortConfig, setSortConfig] = useState({ id: null, order: "asc" });

  const sortedData = React.useMemo(() => {
    let sortableData = [...data];
    if (sortConfig.id !== null) {
      sortableData.sort((a, b) => {
        if (a[sortConfig.id] < b[sortConfig.id]) {
          return sortConfig.order === "asc" ? -1 : 1;
        }
        if (a[sortConfig.id] > b[sortConfig.id]) {
          return sortConfig.order === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableData;
  }, [data, sortConfig]);

  const requestSort = (event, id) => {
    let order = "asc";
    if (sortConfig.id === id && sortConfig.order === "asc") {
      order = "desc";
    }
    setSortConfig({ id, order });
  };

  const [dialogOpen, setDialogOpen] = useState(false);

  const handleNewItemDialogClose = (newRowData) => {
    if (newRowData !== undefined) {
      const newRow = { ...newRowData };
      newRow.is_wage = newRow.value >= 0;
      newRow.value = Math.abs(newRow.value);
      setData([...data, newRow]);
    }

    setDialogOpen(false);
  };

  return (
    <div>
      <IconButton
        onClick={() => {
          setHidden(!hidden);
        }}
      >
        {hidden ? <VisibilityOffIcon /> : <VisibilityIcon />}
      </IconButton>

      <MonthYearSelector
        onMonthChange={onMonthChange}
        currMonth={currMonth}
        currYear={currYear}
        dateLimits={dateLimits}
      />

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRowHeader
              headers={headers}
              onRequestSort={requestSort}
              sortConfig={sortConfig}
            />
          </TableHead>

          <TableBody>
            {sortedData.map((row) => (
              <TableRowEntry
                key={row.description}
                entry={row}
                hidden={hidden}
              />
            ))}

            <TableRowButton
              onRoeClick={() => {
                setDialogOpen(true);
              }}
            />

            <TableRowTotal total={total} hidden={hidden} />
          </TableBody>
        </Table>
      </TableContainer>

      <DialogNewEntry
        open={dialogOpen}
        onDialogClose={handleNewItemDialogClose}
      />
    </div>
  );
};
MonthView.propTypes = {
  selectedMonth: PropTypes.number.isRequired,
  selectedYear: PropTypes.number.isRequired,
};

export default MonthView;
