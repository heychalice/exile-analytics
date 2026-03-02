import { useEffect, useState } from "react";
import "./App.css";

const API_BASE = "http://localhost:8080";
const league = "Keepers";

function App() {
  const [latestRates, setLatestRates] = useState([]);
  const [topMovers, setTopMovers] = useState([]);
  const [topLosers, setTopLosers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Latest Rates
        const latestRes = await fetch(
          `${API_BASE}/api/latest-rate?league=${encodeURIComponent(league)}&limit=50`,
        );
        const latestData = await latestRes.json();
        setLatestRates(groupByEntity(latestData.rows || []));

        // Top 10 Movers (gainers)
        const moversRes = await fetch(
          `${API_BASE}/api/top-movers?league=${encodeURIComponent(
            league,
          )}&limit=10&order=desc`,
        );
        const moversData = await moversRes.json();
        setTopMovers(moversData.rows || []);

        // Top 10 Losers
        const losersRes = await fetch(
          `${API_BASE}/api/top-movers?league=${encodeURIComponent(
            league,
          )}&limit=10&order=asc`,
        );
        const losersData = await losersRes.json();
        setTopLosers(losersData.rows || []);
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
        <h1>Latest Rates - {league}</h1>
        <div className="grid">
          {latestRates.map((item) => (
            <ItemCard key={item.entity_id} item={item} />
          ))}
        </div>
      </main>

      <aside className="sidebar">
        <h2>Top 10 Movers</h2>
        {topMovers.map((item) => (
          <MoverCard key={item.entity_id} item={item} />
        ))}

        <h2>Top 10 Losers</h2>
        {topLosers.map((item) => (
          <MoverCard key={item.entity_id} item={item} negative />
        ))}
      </aside>
    </div>
  );
}

// Group latest rates by entity_id and separate chaos/divine
function groupByEntity(rows) {
  const grouped = {};
  rows.forEach((item) => {
    const id = item.entity_id;
    if (!grouped[id]) grouped[id] = { entity_id: id, name: id };
    grouped[id][item.currency] = {
      rate: item.rate,
      volume: item.volume,
      point_ts: item.point_ts,
    };
    grouped[id].image_url = item.image_url || grouped[id].image_url;
  });
  return Object.values(grouped);
}

// Card for each item in latest rates
function ItemCard({ item }) {
  return (
    <div className="card">
      {item.image_url && (
        <img src={item.image_url} alt={item.entity_id} className="card-image" />
      )}
      <h3>{item.name || item.entity_id}</h3>

      <div className="rates-table">
        <div className="rate-row header">
          <div>Currency</div>
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

// Card for each top mover/loser
function MoverCard({ item, negative }) {
  return (
    <div className="mover-card">
      {item.image_url && (
        <img
          src={item.image_url}
          alt={item.entity_id}
          className="mover-image"
        />
      )}
      <div className="mover-name">{item.entity_id}</div>
      <div className={`mover-change ${negative ? "negative" : ""}`}>
        {item.change_percent?.toFixed(2) ?? "-"}%
      </div>
    </div>
  );
}

export default App;
