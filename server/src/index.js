const cors = require("cors");
const express = require("express");
const mysql = require("mysql2");

let dateLimits;

const app = express();
const port = 3001;

const dbHost = "localhost";
const connection = mysql.createPool({
  host: dbHost,
  user: "hngui",
  password: "cube",
  database: "paystubs",
  port: 3306,
  connectionLimit: 10,
});

const getStartAndEndDates = async () => {
  const query = `
    SELECT 
      CONCAT(MIN(CONCAT(year, '-', LPAD(month, 2, '0')))) AS minDate, 
      CONCAT(MAX(CONCAT(year, '-', LPAD(month, 2, '0')))) AS maxDate 
    FROM entries
  `;
  const dates = await new Promise((resolve, reject) => {
    connection.query(query, (error, results) => {
      if (error) {
        reject(error);
      } else {
        const minDateParts = results[0].minDate.split("-");
        const maxDateParts = results[0].maxDate.split("-");

        const out = {};
        out.minYear = parseInt(minDateParts[0], 10);
        out.minMonth = parseInt(minDateParts[1], 10);
        out.maxYear = parseInt(maxDateParts[0], 10);
        out.maxMonth = parseInt(maxDateParts[1], 10);
        resolve(out);
      }
    });
  });

  return dates;
};

getStartAndEndDates()
  .then((results) => (dateLimits = results))
  .catch((error) => console.error(error));

app.use(cors());

app.get("/", (req, res) => {
  res.send("Welcome to my server!");
});

app.get("/entries", async (req, res) => {
  console.log(req.query);

  const { month, year } = req.query;

  try {
    const query = "SELECT * FROM entries WHERE MONTH = ? AND YEAR = ?";
    const results = await new Promise((resolve, reject) => {
      connection.query(query, [month, year], (error, results) => {
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      });
    });

    res.json(results);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get("/datelimits", (req, res) => {
  res.json(dateLimits);
});

const server = app.listen(port, () => {
  const host =
    server.address().address === "::" ? "localhost" : server.address().address;
  const port = server.address().port;
  console.log(`Server is running on http://${host}:${port}`);
});
