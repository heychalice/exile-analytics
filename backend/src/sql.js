const esc = (s) => String(s).replaceAll("'", "''");
const num = (x, fallback) => {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
};

function fqSchema({ catalog, schema }) {
  return catalog ? `${catalog}.${schema}` : schema;
}

function latestRateSql({
  catalog,
  schema,
  league,
  currency,
  entity_id,
  limit,
}) {
  const fq = fqSchema({ catalog, schema });
  if (!league) throw new Error("league is required");
  let where = `WHERE league = '${esc(league)}'`;
  if (currency) where += ` AND currency = '${esc(currency)}'`;
  if (entity_id) where += ` AND entity_id = '${esc(entity_id)}'`;

  return `
SELECT point_ts, league, currency, entity_id, rate, volume, image, entity_name
FROM ${fq}.gold_exchange_latest_rate
${where}
ORDER BY point_ts DESC
LIMIT ${limit}
`.trim();
}

function topMoversSql({
  catalog,
  schema,
  league,
  asset_type,
  currency,
  limit,
  order,
}) {
  const fq = fqSchema({ catalog, schema });
  let where = "WHERE 1=1";
  if (league) where += ` AND league = '${esc(league)}'`;
  if (asset_type) where += ` AND asset_type = '${esc(asset_type)}'`;
  if (currency) where += ` AND currency = '${esc(currency)}'`;

  let orderBy;

  if (order === "asc") {
    orderBy = "ORDER BY pct_change ASC NULLS LAST";
  } else {
    orderBy = "ORDER BY pct_change DESC NULLS LAST";
  }

  return `
SELECT ts, league, asset_type, entity_id, currency, latest_rate, rate_24h, latest_volume, abs_change, pct_change, image, entity_name
FROM ${fq}.gold_exchange_top_movers
${where}
${orderBy}
LIMIT ${limit}
`.trim();
}

module.exports = { latestRateSql, topMoversSql };
