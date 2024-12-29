import React from "react";

import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";

const ValueDisplay = ({ value, hidden, state, prefix, unit, postfix }) => {
  const theme = useTheme();

  return (
    <span
      style={{
        fontWeight: "bold",
        color: state ? theme.palette.success.main : theme.palette.error.main,
      }}
    >
      {`${prefix || ""} ${
        !hidden ? value : "*".repeat(value.toString().length)
      } ${unit || ""} ${postfix || ""}`}
    </span>
  );
};

ValueDisplay.propTypes = {
  value: PropTypes.number.isRequired,
  hidden: PropTypes.bool.isRequired,
  state: PropTypes.bool.isRequired,
  prefix: PropTypes.string,
  unit: PropTypes.string,
  postfix: PropTypes.string,
};

export default ValueDisplay;
