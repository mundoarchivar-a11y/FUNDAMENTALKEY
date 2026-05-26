-- Macro Alignment Engine v1.0 — Supabase Schema (clean refactor)
-- ─────────────────────────────────────────────────────────────────────────────
-- Run this in the Supabase SQL Editor. It drops and recreates macro_logs
-- with the new bps/pts deltas and the thesis JSONB column.
-- ⚠️  This is destructive — all existing rows are removed.
-- ─────────────────────────────────────────────────────────────────────────────

drop table if exists macro_logs cascade;

create table macro_logs (
  id              bigserial primary key,
  fecha           timestamptz not null default now(),

  -- Dollar Index (percentage)
  dxy_level       numeric(10, 4),
  dxy_delta       numeric(10, 4),

  -- US Yields — REAL values from FRED (DGS10, DGS2), deltas in BASIS POINTS
  us10y_level     numeric(10, 4),
  us10y_bps_delta numeric(10, 4),
  us02y_level     numeric(10, 4),
  us02y_bps_delta numeric(10, 4),
  spread_10y_2y   numeric(10, 4),

  -- Volatility — VIX in absolute points, delta also in points (not %)
  vix_level       numeric(10, 4),
  vix_pts_delta   numeric(10, 4),

  -- FX core (percentage)
  eurusd_level    numeric(10, 5),
  eurusd_delta    numeric(10, 4),
  gbpusd_level    numeric(10, 5),
  gbpusd_delta    numeric(10, 4),

  -- US Futures (percentage)
  nasdaq_delta    numeric(10, 4),
  sp500_delta     numeric(10, 4),

  -- Regime + bias (computed in Python)
  macro_regime    text check (macro_regime in ('RISK_OFF', 'RISK_ON', 'MIXED')),
  fx_bias         text check (fx_bias in ('USD_STRONG', 'USD_WEAK', 'MIXED')),

  -- JSONB payloads
  fractal         jsonb,  -- per-asset {level, d, w, m}
  news            jsonb,  -- recent headlines (classified)
  upcoming_events jsonb,  -- macro calendar
  thesis          jsonb,  -- full confluence-engine output (direction, headline, vectors, fractal_rows, evidence, expectation)

  created_at      timestamptz not null default now()
);

-- Time-series index
create index macro_logs_fecha_idx on macro_logs (fecha desc);

-- Row Level Security: anon reads, service_role inserts
alter table macro_logs enable row level security;

create policy "Allow anon read" on macro_logs
  for select using (true);

create policy "Allow service_role insert" on macro_logs
  for insert with check (true);
