import React, { useState, useEffect } from "react";

import PropTypes from "prop-types";

import ValueDisplay from "./ValueDisplay";

const SumDisplay = ({ dataToSum, hidden, prefix, unit, postfix }) => {
  const [total, setTotal] = useState(0);
  useEffect(() => {
    setTotal(dataToSum.reduce((acc, row) => acc + row.value, 0).toFixed(2));
  }, [dataToSum]);

  return (
    <ValueDisplay
      value={total}
      hidden={hidden}
      prefix={prefix}
      state={total >= 0}
      unit={unit}
      postfix={postfix}
    />
  );
};

SumDisplay.propTypes = {
  dataToSum: PropTypes.object.isRequired,
  hidden: PropTypes.bool.isRequired,
  prefix: PropTypes.string,
  unit: PropTypes.string,
  postfix: PropTypes.string,
};

export default SumDisplay;
