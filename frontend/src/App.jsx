import { useEffect, useState } from "react";
import "./App.css";

const API_BASE = "http://localhost:8080";
const league = "Keepers";

export default function App() {
  const [latestRates, setLatestRates] = useState([]);
  const [topMovers, setTopMovers] = useState([]);
  const [topLosers, setTopLosers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch latest rates
        const latestRes = await fetch(
          `${API_BASE}/api/latest-rate?league=${encodeURIComponent(
            league,
          )}&limit=113`,
        );
        const latestData = await latestRes.json();
        // Group latest rates by entity
        setLatestRates(groupByEntity(latestData.rows || []));

        // Top 10 Movers
        const moversRes = await fetch(
          `${API_BASE}/api/top-movers?league=${encodeURIComponent(
            league,
          )}&limit=10&order=desc&currency=divine`,
        );
        const moversData = await moversRes.json();
        setTopMovers(moversData.rows.slice(0, 10).map(normalizeItem));

        // Top 10 Losers
        const losersRes = await fetch(
          `${API_BASE}/api/top-movers?league=${encodeURIComponent(
            league,
          )}&limit=10&order=asc&currency=divine`,
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
  }, []);

  if (loading) return <div className="container">Loading...</div>;

  return (
    <div className="container dashboard">
      <main className="main">
        <h2>{league} Latest Rates</h2>
        <div className="grid">
          {latestRates.map((item) => (
            <ItemCard key={item.entity_id} item={item} />
          ))}
        </div>
      </main>
      <aside className="sidebar">
        <h2>Top Winners & Losers (Divine)</h2>
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

// ----------------------------
// Helpers
// ----------------------------

// Group latest rates by entity
function groupByEntity(rows) {
  const grouped = {};
  rows.forEach((item) => {
    const id = item.entity_id;
    if (!grouped[id]) {
      grouped[id] = {
        entity_id: id,
        name: item.entity_name || id,
        image: item.image || "",
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
  return {
    ...item,
    name: item.entity_name || item.name || item.entity_id,
    image: item.image || "",
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
          <div>Rate</div>
          <div>Volume</div>
        </div>
        {["chaos", "divine"].map((currency) => (
          <div key={currency} className="rate-row">
            <div>{currency}</div>
            <div>{item[currency]?.rate ?? "-"}</div>
            <div>{item[currency]?.volume ?? "-"}</div>
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
