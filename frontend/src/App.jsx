import { useEffect, useState } from "react";
import "./App.css";

const API_BASE = "https://exile-analytics-api.vercel.app/";
const league = "Keepers";
const CACHE_TTL_MS = 120 * 60 * 1000;

const cache = {};
async function cachedFetch(url) {
  const now = Date.now();
  if (cache[url] && now - cache[url].ts < CACHE_TTL_MS) return cache[url].data;
  const res = await fetch(url);
  const data = await res.json();
  cache[url] = { data, ts: now };
  return data;
}

// ----------------------------
// Sparkline — small, no axes
// ----------------------------
function Sparkline({ data, color = "#00ffcc", height = 36 }) {
  if (!data || data.length < 2)
    return <span style={{ color: "#555", fontSize: "0.7rem" }}>no data</span>;
  const vals = data.map((d) => d.daily_rate);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const W = 200;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * W;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });
  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      preserveAspectRatio="none"
      style={{ display: "block", width: "100%", height }}
    >
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ----------------------------
// App
// ----------------------------
export default function App() {
  const [latestRates, setLatestRates] = useState([]);
  const [topMovers, setTopMovers] = useState([]);
  const [topLosers, setTopLosers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assetType, setAssetType] = useState("Currency");
  const [divineRate, setDivineRate] = useState(null);
  const [divineImg, setDivineImg] = useState(null);
  const [chaosImg, setChaosImg] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const latestData = await cachedFetch(
          `${API_BASE}/api/latest-rate?league=${encodeURIComponent(league)}&limit=250&asset_type=Currency`,
        );
        const grouped = groupByEntity(latestData.rows || []);
        const div = grouped.find((i) => i.entity_id === "divine");
        const cha = grouped.find((i) => i.entity_id === "chaos");
        if (div?.chaos?.rate) setDivineRate(div.chaos.rate);
        if (div?.image) setDivineImg(div.image);
        if (cha?.image) setChaosImg(cha.image);

        const moversData = await cachedFetch(
          `${API_BASE}/api/top-movers?league=${encodeURIComponent(league)}&limit=10&order=desc&currency=chaos&asset_type=${assetType}`,
        );
        setTopMovers(moversData.rows.slice(0, 10).map(normalizeItem));

        const losersData = await cachedFetch(
          `${API_BASE}/api/top-movers?league=${encodeURIComponent(league)}&limit=10&order=asc&currency=chaos&asset_type=${assetType}`,
        );
        setTopLosers(losersData.rows.slice(0, 10).map(normalizeItem));

        const allData = await cachedFetch(
          `${API_BASE}/api/top-movers?league=${encodeURIComponent(league)}&limit=500&asset_type=${assetType}`,
        );
        const entityMap = {};
        (allData.rows || []).forEach((row) => {
          const item = normalizeItem(row);
          if (!entityMap[item.entity_id]) {
            entityMap[item.entity_id] = {
              entity_id: item.entity_id,
              name: item.name,
              image: item.image,
              byCurrency: {},
            };
          }
          entityMap[item.entity_id].byCurrency[item.currency] = item;
        });
        const allItems = Object.values(entityMap).sort((a, b) => {
          const rA = a.byCurrency?.chaos?.rate_7d_latest || 0;
          const rB = b.byCurrency?.chaos?.rate_7d_latest || 0;
          if (rB !== rA) return rB - rA;
          return a.name.localeCompare(b.name);
        });
        setLatestRates(allItems);
      } catch (err) {
        console.error("API error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [assetType]);

  if (loading)
    return (
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          textAlign: "center",
        }}
      >
        Loading... Might take some time to query from the warehouse...
      </div>
    );

  return (
    <div className="container dashboard">
      <main className="main">
        {/* Sticky header */}
        <div className="main-header">
          <h2 style={{ margin: 0 }}>
            {league} {assetType} - 7D Overview
          </h2>
          <div className="header-right">
            {/* Divine rate — always visible */}
            {divineRate && divineImg && chaosImg && (
              <div className="divine-badge">
                <img
                  src={`https://web.poecdn.com${divineImg}`}
                  alt="Divine"
                  style={{ width: 24, height: 24 }}
                />
                <span>1 = {divineRate}</span>
                <img
                  src={`https://web.poecdn.com${chaosImg}`}
                  alt="Chaos"
                  style={{ width: 24, height: 24 }}
                />
              </div>
            )}
            {/* Asset type filter */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {["Currency", "Fragment", "Scarab", "Fossil"].map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setAssetType(type);
                  }}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "6px",
                    border:
                      assetType === type
                        ? "2px solid #00ffcc"
                        : "1px solid #555",
                    backgroundColor: assetType === type ? "#222" : "#1e1e1e",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: assetType === type ? "bold" : "normal",
                    fontSize: "0.85rem",
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid">
          {latestRates.map((item) => (
            <ItemCard key={item.entity_id} item={item} />
          ))}
        </div>
      </main>

      <aside className="sidebar">
        <TopMoversPanel topMovers={topMovers} topLosers={topLosers} />
      </aside>
    </div>
  );
}

function TopMoversPanel({ topMovers, topLosers }) {
  return (
    <>
      <h2 style={{ margin: "0 0 0.75rem 0", fontSize: "1rem", color: "#ccc" }}>
        Top Winners & Losers - 7D Chaos
      </h2>
      <div className="top-lists">
        <div className="list">
          <h3 style={{ color: "#00ffcc" }}>Winners</h3>
          {topMovers.map((item) => (
            <MoverCard key={item.entity_id} item={item} negative={false} />
          ))}
        </div>
        <div className="list">
          <h3 style={{ color: "#ff4444" }}>Losers</h3>
          {topLosers.map((item) => (
            <MoverCard key={item.entity_id} item={item} negative />
          ))}
        </div>
      </div>
    </>
  );
}

function getImagePath(name, originalImage) {
  if (name && name.toLowerCase().includes("scouting report")) {
    return "/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvU2NvdXRpbmdSZXBvcnQiLCJ3IjoxLCJoIjoxLCJzY2FsZSI6MX1d/584635f3c8/ScoutingReport.png";
  }
  return originalImage || "";
}

function groupByEntity(rows) {
  const grouped = {};
  rows.forEach((item) => {
    const id = item.entity_id;
    if (!grouped[id]) {
      const name = item.entity_name || id;
      grouped[id] = {
        entity_id: id,
        name,
        image: getImagePath(name, item.image),
      };
    }
    grouped[id][item.currency] = { rate: item.rate, volume: item.volume };
  });
  return Object.values(grouped);
}

function normalizeItem(item) {
  const name = item.entity_name || item.name || item.entity_id;
  let daily_rates_7d = item.daily_rates_7d;
  if (typeof daily_rates_7d === "string") {
    try {
      daily_rates_7d = JSON.parse(daily_rates_7d);
    } catch {
      daily_rates_7d = [];
    }
  }
  return {
    ...item,
    name,
    image: getImagePath(name, item.image),
    daily_rates_7d: Array.isArray(daily_rates_7d) ? daily_rates_7d : [],
  };
}

function ItemCard({ item }) {
  return (
    <div className="card">
      <div className="card-header">
        {item.image && (
          <img
            src={`https://web.poecdn.com${item.image}`}
            className="card-image"
            alt={item.name}
          />
        )}
        <h3>{item.name}</h3>
      </div>
      {["chaos", "divine"].map((cur) => {
        const row = item.byCurrency?.[cur];
        if (!row) return null;
        const daily = (row.daily_rates_7d || [])
          .slice()
          .sort((a, b) => (a.day < b.day ? -1 : 1));
        const color = cur === "chaos" ? "#e8a838" : "#a78bfa";
        const pct =
          row.pct_change != null ? (row.pct_change * 100).toFixed(1) : null;
        const abs =
          row.abs_change != null ? Number(row.abs_change).toFixed(2) : null;
        const isPos = row.abs_change >= 0;
        const changeColor = isPos ? "#00ffcc" : "#ff4444";
        return (
          <div key={cur} className="card-currency-block">
            <div className="card-currency-row">
              <span className="card-currency-label" style={{ color }}>
                {cur}
              </span>
              <span className="card-currency-rate">
                {Number(row.rate_7d_latest).toFixed(2)}
              </span>
              {pct != null && (
                <span
                  className="card-currency-pct"
                  style={{ color: changeColor }}
                >
                  {isPos ? "+" : ""}
                  {pct}%
                </span>
              )}
            </div>
            <div className="card-spark">
              <Sparkline data={daily} color={color} height={36} />
            </div>
            <div className="card-mini-stats">
              <span>Min: {Number(row.min_rate_7d).toFixed(2)}</span>
              <span>Max: {Number(row.max_rate_7d).toFixed(2)}</span>
              <span>Avg: {Number(row.avg_rate_7d).toFixed(2)}</span>
              <span>Vol: {Math.round(row.avg_volume_7d)}</span>
              <span>Delta: {abs != null ? (isPos ? "+" : "") + abs : "-"}</span>
              <span>-7D: {Number(row.rate_7d_earliest).toFixed(2)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MoverCard({ item, negative }) {
  const color = negative ? "#ff4444" : "#00ffcc";
  const pct =
    item.pct_change != null ? (item.pct_change * 100).toFixed(1) + "%" : "-";
  const abs =
    item.abs_change != null
      ? (item.abs_change > 0 ? "+" : "") + Number(item.abs_change).toFixed(2)
      : "-";
  const daily = (item.daily_rates_7d || [])
    .slice()
    .sort((a, b) => (a.day < b.day ? -1 : 1));
  return (
    <div className="mover-card">
      <div className="mover-top">
        {item.image && (
          <img
            src={`https://web.poecdn.com${item.image}`}
            alt={item.name}
            className="mover-image"
          />
        )}
        <div className="mover-info">
          <div className="mover-name">{item.name}</div>
          <div className="mover-changes">
            <span className="mover-change" style={{ color }}>
              {pct}
            </span>
            <span className="mover-abs" style={{ color }}>
              {abs}c
            </span>
          </div>
        </div>
      </div>
      {daily.length > 1 && (
        <div className="mover-spark">
          <Sparkline data={daily} color={color} height={28} />
        </div>
      )}
    </div>
  );
}
