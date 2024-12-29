import React from "react";
import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import PropTypes from "prop-types";

const DialogNewEntry = ({ open, onDialogClose }) => {
  const [newRowData, setNewRowData] = useState({ description: "", value: 0 });

  return (
    <div>
      <Dialog open={open}>
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
              onDialogClose(undefined);
            }}
            color="primary"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onDialogClose(newRowData);
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

DialogNewEntry.propTypes = {
  open: PropTypes.bool.isRequired,
  onDialogClose: PropTypes.func.isRequired,
};

export default DialogNewEntry;
