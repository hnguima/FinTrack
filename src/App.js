import "./App.css";
import MonthView from "./components/MonthView";

import React, { useState } from "react";
import { Fab, Menu, MenuItem } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

function App() {
  const [anchorEl, setAnchorEl] = useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <div className="App">
      <MonthView selectedMonth={7} selectedYear={2023} />
      <Fab
        color="primary"
        aria-label="add"
        style={{ position: "fixed", bottom: 16, right: 16 }}
        onClick={handleClick}
      >
        <AddIcon />
      </Fab>
      <Menu
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={handleClose}>Add Income</MenuItem>
        <MenuItem onClick={handleClose}>Add Expense</MenuItem>
      </Menu>
    </div>
  );
}

export default App;
