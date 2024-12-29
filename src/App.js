import "./App.css";
import MonthView from "./components/MonthView";

import React, { useState } from "react";
import { Fab, Menu, MenuItem } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { createTheme, ThemeProvider } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    income: {
      main: "#00FF00",
    },
    expense: {
      main: "#f44336",
    },
  },
});

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
      <ThemeProvider theme={theme}>
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
      </ThemeProvider>
    </div>
  );
}

export default App;
