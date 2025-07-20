import React, { useState } from "react";
import IconButton from "@mui/material/IconButton";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";

import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";

import PropTypes from "prop-types";

import TableRowEntry from "./TableRowEntry";
import { SumDisplay } from "./Displays";

import Collapse from "@mui/material/Collapse";

const TableRowGroup = ({ group, rows, hidden, headers }) => {
  const [groupOpen, setGroupOpen] = useState({});

  return (
    <React.Fragment key={group}>
      <TableRow
        sx={{
          p: 1,
          cursor: "pointer",
          "&:hover": { backgroundColor: "#f5f5f5" },
        }}
        onClick={() =>
          setGroupOpen((prev) => ({
            ...prev,
            [group]: !prev[group],
          }))
        }
      >
        <TableCell colSpan={headers.length - 1} sx={{ p: 1 }}>
          <IconButton sx={{ mr: 1 }}>
            {groupOpen[group] ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
          {group}
        </TableCell>
        <TableCell align="right">
          <SumDisplay dataToSum={rows} hidden={hidden} prefix="R$" />
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={headers.length} sx={{ p: 0 }}>
          <Collapse timeout="auto" in={groupOpen[group]} unmountOnExit>
            <Table>
              <TableBody>
                {rows.map((row) => (
                  <TableRowEntry
                    key={row.description}
                    entry={row}
                    hidden={hidden}
                  />
                ))}
              </TableBody>
            </Table>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
};

TableRowGroup.propTypes = {
  group: PropTypes.object.isRequired,
  headers: PropTypes.object.isRequired,
  rows: PropTypes.bool.isRequired,
  hidden: PropTypes.bool.isRequired,
};

export default TableRowGroup;
