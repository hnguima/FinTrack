import React from "react";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import AddIcon from "@mui/icons-material/Add";
import PropTypes from "prop-types";

const TableRowButton = ({ onRowClick }) => {
  return (
    <TableRow>
      <TableCell colSpan={3} onClick={onRowClick}>
        <AddIcon />
      </TableCell>
    </TableRow>
  );
};

TableRowButton.propTypes = {
  onRowClick: PropTypes.func.isRequired,
};

export default TableRowButton;
