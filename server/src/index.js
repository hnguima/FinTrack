const cors = require("cors");
const express = require("express");
const mysql = require("mysql2");
const fs = require("node:fs");

let dateLimits;

const app = express();
const port = 3001;

let rawdata = fs.readFileSync("./src/dbopts.json");
let dbOpts = JSON.parse(rawdata);

const connection = mysql.createPool({
  host: dbOpts.host,
  user: dbOpts.user,
  password: dbOpts.password,
  database: dbOpts.database,
  port: dbOpts.port,
  connectionLimit: 10,
});

const getStartAndEndDates = async () => {
  const query = `
    SELECT 
      MIN(timestamp) AS minTimestamp, 
      MAX(timestamp) AS maxTimestamp 
    FROM entries
  `;
  const dates = await new Promise((resolve, reject) => {
    connection.query(query, (error, results) => {
      if (error) {
        reject(error);
      } else {
        const minDate = new Date(results[0].minTimestamp * 1000);
        const maxDate = new Date(results[0].maxTimestamp * 1000);

        const out = {};
        out.minYear = minDate.getFullYear();
        out.minMonth = minDate.getMonth() + 1;
        out.maxYear = maxDate.getFullYear();
        out.maxMonth = maxDate.getMonth() + 1;
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

  if (
    !month ||
    !year ||
    isNaN(month) ||
    isNaN(year) ||
    month < 1 ||
    month > 12 ||
    year < 2000 ||
    year > new Date().getFullYear()
  ) {
    return res.status(400).send("Invalid month or year");
  }

  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    const query = "SELECT * FROM entries WHERE timestamp BETWEEN ? AND ?";
    const results = await new Promise((resolve, reject) => {
      connection.query(
        query,
        [startDate.getTime() / 1000, endDate.getTime() / 1000],
        (error, results) => {
          if (error) {
            reject(error);
          } else {
            resolve(results);
          }
        }
      );
    });
    res.json(results);
  } catch (error) {
    res.status(500).send(error);
  }
});

// app.post("/entries", async (req, res) => {
//   console.log(req.query);

//   const { month, year, code, description, value, group } = req.query;

//   try {
//     const query = `
//         INSERT INTO entries (month, year, code, description, value, group)
//         VALUES (?, ?, ?, ?, ?, ?)
//         ON DUPLICATE KEY UPDATE
//           description=VALUES(description),
//           value=VALUES(value)
//           group=VALUES(group)
//       `;

//     // const query = "SELECT * FROM entries WHERE MONTH = ? AND YEAR = ?";
//     const results = await new Promise((resolve, reject) => {
//       connection.query(
//         query,
//         [month, year, code, description, value, group],
//         (error, results) => {
//           if (error) {
//             reject(error);
//           } else {
//             resolve(results);
//           }
//         }
//       );
//     });

//     res.json(results);
//   } catch (error) {
//     res.status(500).send(error);
//   }
// });

app.get("/datelimits", (req, res) => {
  res.json(dateLimits);
});

const server = app.listen(port, () => {
  const host =
    server.address().address === "::" ? "localhost" : server.address().address;
  const port = server.address().port;
  console.log(`Server is running on http://${host}:${port}`);
});
