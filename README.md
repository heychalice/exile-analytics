# Exile Analytics
A real-time exchange rate and market analytics dashboard for **Path of Exile** — tracking prices, volume, and 7-day trends across currencies, fragments, scarabs, and fossils. Using Databricks, Node.js, and React.
<img width="1882" height="702" alt="image" src="https://github.com/user-attachments/assets/e4603d39-07e5-4cc6-8f78-b67d8d592d5e" />
## Overview
Exile Analytics pulls daily and historical pricing data from the Path of Exile economy and displays it in a clean, filterable dashboard. Users can monitor the latest exchange rates, spot market movers, and visualize 7-day price, using a Databricks data pipeline running on a daily schedule.
## Features
- **Live Exchange Rates** — latest prices for all major item categories against Chaos Orb and Divine Orb
- **Top Movers** — biggest winners and losers over the past 7 days
- **Sparkline Charts** — 7-day price trend visualization per item
- **Filtering** — filter by item type (Currency, Fragment, Scarab, Fossil) and league (to be added)
- **Client-side Caching** — smart fetch caching to minimize redundant API calls

## Data Pipeline
Exchange rate data is sourced via a **Databricks ETL pipeline** that runs on a **daily scheduled job**. Each run fetches the latest pricing data from the Path of Exile trade API, transforms it, and writes to two gold-layer tables in Databricks SQL:
- **`gold_exchange_latest_rate`** — most recent exchange rate snapshot per item and league
- **`gold_exchange_top_movers`** — 7-day aggregated stats including min/max/avg rates, absolute and percentage change, and daily rate arrays for sparklines.
This medallion-style architecture ensures the API always serves clean, pre-aggregated data with minimal query latency.

## Database Schema
### `gold_exchange_latest_rate`
| Column | Description |
| --- | --- |
| `point_ts` | Timestamp of the rate snapshot |
| `league` | Game league |
| `currency` | Quote currency |
| `entity_id` | Item identifier |
| `entity_name` | Item display name |
| `rate` | Exchange rate |
| `volume` | Trade volume |
| `image` | Item icon URL |
### `gold_exchange_top_movers`
| Column | Description |
| --- | --- |
| `ts` | Snapshot timestamp |
| `league` | Game league |
| `asset_type` | Item category |
| `entity_id` / `entity_name` | Item identifier and name |
| `currency` | Quote currency |
| `min_rate_7d` / `max_rate_7d` / `avg_rate_7d` | 7-day rate stats |
| `abs_change` / `pct_change` | Absolute and percentage price change |
| `rate_7d_earliest` / `rate_7d_latest` | First and last rate in the window |
| `daily_rates_7d` | Array of daily rates (used for sparklines) |
| `avg_volume_7d` | Average trade volume over 7 days |
| `image` | Item icon URL |
