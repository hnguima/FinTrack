import React from "react";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import PropTypes from "prop-types";
import { ValueDisplay } from "./Displays";

const TableRowTotal = ({ total, hidden }) => {
  return (
    <TableRow>
      <TableCell colSpan={2}>Total</TableCell>
      <TableCell>
        <ValueDisplay
          value={total}
          hidden={hidden}
          prefix={"R$"}
          state={total >= 0}
        />
      </TableCell>
    </TableRow>
  );
};

TableRowTotal.propTypes = {
  total: PropTypes.number.isRequired,
  hidden: PropTypes.bool.isRequired,
};

export default TableRowTotal;
