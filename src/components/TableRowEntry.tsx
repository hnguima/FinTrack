import React from "react";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import PropTypes from "prop-types";
import { ValueDisplay } from "./Displays";

const TableRowEntry = ({ entry, hidden }) => {
  return (
    <TableRow key={entry.id}>
      <TableCell>{entry.code}</TableCell>
      <TableCell>{entry.description}</TableCell>
      <TableCell align="right">
        <ValueDisplay
          value={Math.abs(entry.value).toFixed(2)}
          hidden={hidden}
          prefix={"R$"}
          state={entry.value > 0}
        />
      </TableCell>
    </TableRow>
  );
};

TableRowEntry.propTypes = {
  entry: PropTypes.object.isRequired,
  hidden: PropTypes.bool.isRequired,
};

export default TableRowEntry;
