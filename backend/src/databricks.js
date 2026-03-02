require("dotenv").config();
const { DBSQLClient } = require("@databricks/sql");

const { DATABRICKS_TOKEN, DATABRICKS_SERVER_HOSTNAME, DATABRICKS_HTTP_PATH } =
  process.env;

const client = new DBSQLClient();
let connected = false;

async function ensureConnected() {
  if (connected) return;

  await client.connect({
    token: DATABRICKS_TOKEN,
    host: DATABRICKS_SERVER_HOSTNAME,
    path: DATABRICKS_HTTP_PATH,
  });
  connected = true;
}

async function query(sql) {
  await ensureConnected();

  const session = await client.openSession();
  try {
    const op = await session.executeStatement(sql, { runAsync: true });
    try {
      const rows = await op.fetchAll();
      return rows;
    } finally {
      await op.close();
    }
  } finally {
    await session.close();
  }
}

async function close() {
  if (connected) await client.close();
  connected = false;
}

module.exports = { query, close };
