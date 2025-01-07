import React from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFnsV3";

const MonthYearSelector = ({
  currMonth,
  currYear,
  dateLimits,
  onMonthChange,
}) => {
  const getNextMonthYear = () => {
    if (currMonth === 12) {
      return [1, currYear + 1];
    } else {
      return [currMonth + 1, currYear];
    }
  };
  const getPreviousMonthYear = () => {
    if (currMonth === 1) {
      return [12, currYear - 1];
    } else {
      return [currMonth - 1, currYear];
    }
  };
  const checkDateLimits = (month, year) => {
    return !(
      year < dateLimits.minYear ||
      (year === dateLimits.minYear && month < dateLimits.minMonth) ||
      year > dateLimits.maxYear ||
      (year === dateLimits.maxYear && month > dateLimits.maxMonth)
    );
  };

  const handleMonthChange = (isNext) => {
    let [newMonth, newYear] = isNext
      ? getNextMonthYear()
      : getPreviousMonthYear();

    if (!checkDateLimits(newMonth, newYear)) {
      return;
    }

    if (
      (currMonth === newMonth && currYear === newYear) ||
      newMonth === undefined ||
      newYear === undefined
    ) {
      return;
    }

    onMonthChange(newMonth, newYear);
  };

  return (
    <Box
      sx={{
        py: 1,
        mt: 1,
        width: "fit-content",
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignContent: "center",
      }}
    >
      <IconButton
        onClick={() => handleMonthChange(false)}
        disabled={
          currMonth === dateLimits.minMonth && currYear === dateLimits.minYear
        }
        sx={{
          m: 1,
        }}
      >
        <ArrowBackIcon />
      </IconButton>

      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <DatePicker
          views={["year", "month"]}
          // label="Year and Month"
          minDate={new Date(dateLimits.minYear, dateLimits.minMonth - 1)}
          maxDate={new Date(dateLimits.maxYear, dateLimits.maxMonth - 1)}
          value={new Date(currYear, currMonth - 1)}
          onChange={(newValue) => {
            const newYear = newValue.getFullYear();
            const newMonth = newValue.getMonth() + 1;
            onMonthChange(newMonth, newYear);
          }}
        />
      </LocalizationProvider>

      <IconButton
        onClick={() => handleMonthChange(true)}
        disabled={
          currMonth === dateLimits.maxMonth && currYear === dateLimits.maxYear
        }
        sx={{
          m: 1,
        }}
      >
        <ArrowForwardIcon />
      </IconButton>
    </Box>
  );
};

MonthYearSelector.propTypes = {
  currMonth: PropTypes.number.isRequired,
  currYear: PropTypes.number.isRequired,
  dateLimits: PropTypes.shape({
    minMonth: PropTypes.number.isRequired,
    minYear: PropTypes.number.isRequired,
    maxMonth: PropTypes.number.isRequired,
    maxYear: PropTypes.number.isRequired,
  }).isRequired,
  onMonthChange: PropTypes.func.isRequired,
};

export default MonthYearSelector;
