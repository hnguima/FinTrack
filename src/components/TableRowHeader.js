import React from "react";

import TableCell from "@mui/material/TableCell";
import TableSortLabel from "@mui/material/TableSortLabel";
import TableRow from "@mui/material/TableRow";
import PropTypes from "prop-types";

const TableRowHeader = ({ headers, onRequestSort, sortConfig }) => {
  const createSortHandler = (property) => (event) => {
    onRequestSort(event, property);
  };

  return (
    <TableRow>
      {headers.map((header) => {
        return (
          <TableCell
            key={header.id}
            onClick={() => createSortHandler(header.id)}
          >
            <TableSortLabel
              active={sortConfig.id === header.id}
              direction={sortConfig.id === header.id ? sortConfig.order : "asc"}
              onClick={createSortHandler(header.id)}
            >
              {header.label}
            </TableSortLabel>
          </TableCell>
        );
      })}
    </TableRow>
  );
};

TableRowHeader.propTypes = {
  headers: PropTypes.object.isRequired,
  sortConfig: PropTypes.object.isRequired,
  onRequestSort: PropTypes.func.isRequired,
};

export default TableRowHeader;
