import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";

import { Box, IconButton } from "@mui/material";

import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

import DialogNewEntry from "./DialogNewEntry";
import MonthYearSelector from "./MonthYearSelector";

import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableContainer from "@mui/material/TableContainer";
import TableBody from "@mui/material/TableBody";
import TableHead from "@mui/material/TableHead";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Skeleton from "@mui/material/Skeleton";

import TableRowHeader from "./TableRowHeader";
import TableRowTotal from "./TableRowTotal";
import TableRowButton from "./TableRowButton";

import TableRowGroup from "./TableRowGroup";

import { fetchEntries, fetchDateLimits } from "./ServerHelpers/FetchAPI";

const headers = [
  {
    id: "code",
    numeric: true,
    width: "10%",
    label: "Code",
  },
  {
    id: "description",
    numeric: false,
    width: "60%",
    label: "Description",
  },
  {
    id: "value",
    numeric: true,
    width: "30%",
    align: "right",
    label: "Value",
  },
];

const MonthView = ({ selectedMonth, selectedYear }) => {
  const [entries, setEntries] = useState([]);
  const [dateLimits, setDateLimits] = useState({});
  const [currMonth, setCurrMonth] = useState(selectedMonth);
  const [currYear, setCurrYear] = useState(selectedYear);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.time("loading time");
    setLoading(true);

    fetchEntries(currMonth, currYear).then((data) => {
      setEntries(data);
      console.timeEnd("loading time");
      setLoading(false);
    });
  }, [currMonth, currYear]);

  useEffect(() => {
    fetchDateLimits().then((data) => setDateLimits(data));
  }, []);

  const onMonthChange = (newMonth, newYear) => {
    setCurrMonth(newMonth);
    setCurrYear(newYear);
    setEntries([]);
  };

  const [hidden, setHidden] = useState(false);

  const [sortState, setSortState] = useState({ id: null, order: "asc" });

  const sortedData = React.useMemo(
    () =>
      [...entries].sort((a, b) => {
        if (a[sortState.id] < b[sortState.id]) {
          return sortState.order === "asc" ? -1 : 1;
        }
        if (a[sortState.id] > b[sortState.id]) {
          return sortState.order === "asc" ? 1 : -1;
        }
        return 0;
      }),
    [entries, sortState]
  );

  const requestSort = (event, id) => {
    let order = "asc";
    if (sortState.id === id && sortState.order === "asc") {
      order = "desc";
    }
    setSortState({ id, order });
  };

  const [dialogOpen, setDialogOpen] = useState(false);

  const handleNewItemDialogClose = (newRowData) => {
    if (newRowData !== undefined) {
      const newRow = { ...newRowData };
      newRow.is_wage = newRow.value >= 0;
      newRow.value = Math.abs(newRow.value);
      setEntries([...entries, newRow]);
    }

    setDialogOpen(false);
  };

  const groupedData = React.useMemo(() => {
    return sortedData.reduce((acc, row) => {
      const group = row.entryGroup || "Ungrouped";
      if (!acc[group]) acc[group] = [];
      acc[group].push(row);
      return acc;
    }, {});
  }, [sortedData]);

  return (
    <Paper elevation={5} sx={{ maxWidth: "500px", margin: "auto" }}>
      <Box sx={{ pt: 1, px: 1 }}>
        <MonthYearSelector
          onMonthChange={onMonthChange}
          currMonth={currMonth}
          currYear={currYear}
          dateLimits={dateLimits}
        />
      </Box>

      <TableContainer component={Box} sx={{ position: "relative" }}>
        <IconButton
          onClick={() => {
            setHidden(!hidden);
          }}
          sx={{
            position: "absolute",
            top: 0,
            right: 64,
            m: 2,
            p: 0,
          }}
        >
          {hidden ? <VisibilityOffIcon /> : <VisibilityIcon />}
        </IconButton>

        <Table>
          <TableHead>
            <TableRowHeader
              headers={headers}
              onRequestSort={requestSort}
              sortState={sortState}
            />
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                {headers.map((item) => {
                  return (
                    <TableCell key={item.id}>
                      <Skeleton height={24} />
                    </TableCell>
                  );
                })}
              </TableRow>
            ) : (
              Object.entries(groupedData).map(([group, rows]) => {
                console.log(group, rows);
                return (
                  <TableRowGroup
                    key={group}
                    group={group}
                    rows={rows}
                    headers={headers}
                    hidden={hidden}
                    loading={loading}
                  />
                );
              })
            )}

            <TableRowButton
              onRowClick={() => {
                setDialogOpen(true);
              }}
            />

            <TableRowTotal rows={entries} hidden={hidden} />
          </TableBody>
        </Table>
      </TableContainer>

      <DialogNewEntry
        open={dialogOpen}
        onDialogClose={handleNewItemDialogClose}
      />
    </Paper>
  );
};
MonthView.propTypes = {
  selectedMonth: PropTypes.number.isRequired,
  selectedYear: PropTypes.number.isRequired,
};

export default MonthView;
