import React from "react";

import TableCell from "@mui/material/TableCell";
import TableSortLabel from "@mui/material/TableSortLabel";
import TableRow from "@mui/material/TableRow";
import PropTypes from "prop-types";


const TableRowHeader = ({ headers, onRequestSort, sortState }) => {
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
            align= {header.align || "left"}
            sx={{
              width: header.width,
              fontWeight: "bold",
            }}
          >
            <TableSortLabel
              active={sortState.id === header.id}
              direction={sortState.id === header.id ? sortState.order : "asc"}
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
  sortState: PropTypes.shape({
    id: PropTypes.number.isRequired,
    order: PropTypes.string.isRequired,
  }).isRequired,
  onRequestSort: PropTypes.func.isRequired,
};

export default TableRowHeader;
