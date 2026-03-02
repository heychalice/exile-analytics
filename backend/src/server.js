const express = require("express");
const cors = require("cors");
const { query } = require("./databricks.js");
const { latestRateSql, topMoversSql } = require("./sql.js");

const app = express();
app.use(cors());
app.use(express.json());

const { DATABRICKS_SCHEMA = "poe" } = process.env;

app.get("/health", (req, res) => {
  res.status(200).send("ok");
});

app.get("/api/latest-rate", async (req, res) => {
  try {
    const { league, currency, asset_type, limit } = req.query;
    const sql = latestRateSql({
      schema: DATABRICKS_SCHEMA,
      league,
      currency,
      asset_type,
      limit,
    });
    const out = await query(sql);
    res.json({ rows: out });
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.get("/api/top-movers", async (req, res) => {
  try {
    const { league, asset_type, currency, limit, order } = req.query;
    const sql = topMoversSql({
      schema: DATABRICKS_SCHEMA,
      league,
      asset_type,
      currency,
      limit,
      order,
    });
    const out = await query(sql);
    res.json({ rows: out });
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.listen(8080, () => {
  console.log("Backend running at http://localhost:8080");
});
