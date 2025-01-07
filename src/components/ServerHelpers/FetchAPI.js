const fetchEntries = async (month, year) => {
  try {
    const response = await fetch(
      `http://localhost:3001/entries?month=${month}&year=${year}`
    );
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const entries = await response.json();
    return entries;
  } catch (error) {
    console.error("Error fetching entries:", error);
    return [];
  }
};

const fetchDateLimits = async () => {
  try {
    const response = await fetch(`http://localhost:3001/datelimits`);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const dateLimits = await response.json();

    console.log("Date limits:", dateLimits);

    return dateLimits;
  } catch (error) {
    console.error("Error fetching date limits:", error);
    return null;
  }
};

export { fetchEntries, fetchDateLimits };
