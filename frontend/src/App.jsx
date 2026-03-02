import { useEffect, useState } from "react";
import "./App.css";

const API_BASE = "http://localhost:8080";
const league = "Keepers";

export default function App() {
  const [latestRates, setLatestRates] = useState([]);
  const [topMovers, setTopMovers] = useState([]);
  const [topLosers, setTopLosers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assetType, setAssetType] = useState("Currency");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch latest rates
        const latestRes = await fetch(
          `${API_BASE}/api/latest-rate?league=${encodeURIComponent(league)}&limit=250&asset_type=${assetType}`,
        );
        const latestData = await latestRes.json();

        // Group latest rates by entity
        const groupedRates = groupByEntity(latestData.rows || []);

        // Sort by highest chaos rate (descending), ignoring items with 0 volume
        groupedRates.sort((a, b) => {
          const rateA = a.chaos?.rate || 0;
          const rateB = b.chaos?.rate || 0;

          const volA = a.chaos?.volume || 0;
          const volB = b.chaos?.volume || 0;

          // Items with 0 volume go to the bottom
          // if (volA === 0 && volB !== 0) return 1;
          // if (volB === 0 && volA !== 0) return -1;
          // if (volA === 0 && volB === 0) return 0;

          // Sort by chaos ask descending
          if (rateB !== rateA) return rateB - rateA;

          // Fallback: alphabetical
          return a.name.localeCompare(b.name);
        });

        setLatestRates(groupedRates);

        // Top 10 Movers
        const moversRes = await fetch(
          `${API_BASE}/api/top-movers?league=${encodeURIComponent(league)}&limit=10&order=desc&currency=divine&asset_type=${assetType}`,
        );
        const moversData = await moversRes.json();
        setTopMovers(moversData.rows.slice(0, 10).map(normalizeItem));

        // Top 10 Losers
        const losersRes = await fetch(
          `${API_BASE}/api/top-movers?league=${encodeURIComponent(league)}&limit=10&order=asc&currency=divine&asset_type=${assetType}`,
        );
        const losersData = await losersRes.json();
        setTopLosers(losersData.rows.slice(0, 10).map(normalizeItem));
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
          width: "100vw",
          textAlign: "center",
        }}
      >
        Loading...
      </div>
    );

  // Find the Divine Orb to get the current Chaos conversion rate
  const divineItem = latestRates.find(
    (item) =>
      item.entity_id === "divine" || item.name?.toLowerCase() === "divine orb",
  );
  const chaosItem = latestRates.find(
    (item) =>
      item.entity_id === "chaos" || item.name?.toLowerCase() === "chaos orb",
  );
  const divineToChaosRate = divineItem?.chaos?.rate;

  return (
    <div className="container dashboard">
      <main className="main">
        {/* Header Row with Divine Conversion */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1rem",
          }}
        >
          <h2 style={{ margin: 0 }}>
            {league} {assetType} Latest Rates
          </h2>

          {divineToChaosRate && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "1.25rem",
                fontWeight: "bold",
                backgroundColor: "#1e1e1e",
                padding: "8px 16px",
                borderRadius: "8px",
              }}
            >
              <img
                src={`https://web.poecdn.com${divineItem.image}`}
                alt="Divine Orb"
                style={{ width: "32px", height: "32px" }}
              />
              <span>1 = {divineToChaosRate}</span>
              <img
                src={`https://web.poecdn.com${chaosItem.image}`}
                alt="Chaos Orb"
                style={{ width: "32px", height: "32px" }}
              />
            </div>
          )}
        </div>

        <div className="grid">
          {latestRates.map((item) => (
            <ItemCard key={item.entity_id} item={item} />
          ))}
        </div>
      </main>

      <aside className="sidebar">
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "1rem",
          }}
        >
          {["Currency", "Fragment"].map((type) => (
            <button
              key={type}
              onClick={() => setAssetType(type)}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border:
                  assetType === type ? "2px solid #00ffcc" : "1px solid #555",
                backgroundColor: assetType === type ? "#222" : "#1e1e1e",
                color: "#fff",
                cursor: "pointer",
                fontWeight: assetType === type ? "bold" : "normal",
              }}
            >
              {type}
            </button>
          ))}
        </div>
        <h2>Top Winners & Losers (Ask Divine)</h2>
        <div className="top-lists">
          <div className="list">
            <h3>Winners</h3>
            {topMovers.map((item) => (
              <MoverCard key={item.entity_id} item={item} />
            ))}
          </div>
          <div className="list">
            <h3>Losers</h3>
            {topLosers.map((item) => (
              <MoverCard key={item.entity_id} item={item} negative />
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

// ... (Keep your existing Helpers and Components below here)

// ----------------------------
// Helpers
// ----------------------------

// Helper to override image for Scouting Reports
function getImagePath(name, originalImage) {
  if (name && name.toLowerCase().includes("scouting report")) {
    // Return relative path since components prepend the CDN domain
    return "/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvU2NvdXRpbmdSZXBvcnQiLCJ3IjoxLCJoIjoxLCJzY2FsZSI6MX1d/584635f3c8/ScoutingReport.png";
  }
  return originalImage || "";
}

// Group latest rates by entity
function groupByEntity(rows) {
  const grouped = {};
  rows.forEach((item) => {
    const id = item.entity_id;
    if (!grouped[id]) {
      const name = item.entity_name || id;
      grouped[id] = {
        entity_id: id,
        name: name,
        image: getImagePath(name, item.image),
      };
    }
    grouped[id][item.currency] = {
      rate: item.rate,
      volume: item.volume,
    };
  });
  return Object.values(grouped);
}

// Normalize movers/losers items to ensure consistent fields
function normalizeItem(item) {
  const name = item.entity_name || item.name || item.entity_id;
  return {
    ...item,
    name: name,
    image: getImagePath(name, item.image),
  };
}

// ----------------------------
// Components
// ----------------------------

// Latest Rates Card
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
      <div className="rates-table">
        <div className="rate-row header">
          <div>Asset</div>
          <div>Ask</div>
          <div>Volume</div>
        </div>
        {["divine", "chaos"].map((currency) => (
          <div key={currency} className="rate-row">
            <div>{currency.charAt(0).toUpperCase() + currency.slice(1)}</div>
            <div>{item[currency]?.rate ?? "-"}</div>
            <div>
              {item[currency]?.volume == 0 ? "-" : item[currency]?.volume}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Top Movers / Losers Card
function MoverCard({ item, negative }) {
  return (
    <div className="mover-card">
      {item.image && (
        <img
          src={`https://web.poecdn.com${item.image}`}
          alt={item.name}
          className="mover-image"
        />
      )}
      <div className="mover-name">{item.name}</div>
      <div className={`mover-change ${negative ? "negative" : ""}`}>
        {(item.pct_change * 100).toFixed(2)}%
      </div>
    </div>
  );
}
