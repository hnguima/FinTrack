import React from "react";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import PropTypes from "prop-types";
import { SumDisplay } from "./Displays";

const TableRowTotal = ({ rows, hidden }) => {
  return (
    <TableRow sx={{ borderTop: "2px solid #919191FF" }}>
      <TableCell colSpan={2}>
        Total
      </TableCell>
      <TableCell align="right">
        <SumDisplay dataToSum={rows} hidden={hidden} prefix="R$" />
      </TableCell>
    </TableRow>
  );
};

TableRowTotal.propTypes = {
  rows: PropTypes.object.isRequired,
  hidden: PropTypes.bool.isRequired,
};

export default TableRowTotal;
