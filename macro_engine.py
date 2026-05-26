"""
Macro Alignment Engine v1.0
─────────────────────────────────────────────────────────────────────────────
Single source of truth for the macro thesis.
- Pulls FX/equity/DXY/VIX from Yahoo Finance
- Pulls REAL yields (DGS2, DGS10) from FRED via pandas_datareader
- Computes daily snapshot, fractal (D/W/M), news, upcoming events, AND the
  full thesis via confluence.py
- Inserts a single JSONB-rich record into Supabase.
"""

import os
import json
from datetime import datetime, timezone, timedelta
from typing import Optional

import requests
import yfinance as yf
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client, Client

from confluence import analyze_macro, compute_regime, compute_fx_bias

load_dotenv()


# ─────────────────────────────────────────────────────────────────────────────
# Sources
# ─────────────────────────────────────────────────────────────────────────────

# Yahoo Finance: price-based instruments (DXY, FX, equity, VIX)
YF_TICKERS = {
    "dxy":     "DX-Y.NYB",
    "vix":     "^VIX",
    "eurusd":  "EURUSD=X",
    "gbpusd":  "GBPUSD=X",
    "nasdaq":  "NQ=F",
    "sp500":   "ES=F",
}

# FRED: REAL yields (replace yfinance's broken ^IRX / ^TNX)
FRED_SERIES = {
    "us10y": "DGS10",   # 10-Year Treasury Constant Maturity Yield
    "us02y": "DGS2",    # 2-Year  Treasury Constant Maturity Yield
}

NEWS_TICKERS = ["EURUSD=X", "GBPUSD=X", "NQ=F", "ES=F", "^VIX"]

PERIOD   = "6mo"
INTERVAL = "1d"

# Upcoming macro events — hardcoded for v1 (editable)
# time_utc: hora de publicación en UTC (HH:MM)
# session:  "london" 08-17h UTC | "ny" 13:30-21h UTC | "overlap" 13:30-17h UTC
UPCOMING_EVENTS = [
    {"date": "2026-05-22", "time_utc": "13:15", "event": "Decisión de Tasas BCE",    "importance": "high",   "currency": "EUR", "session": "overlap"},
    {"date": "2026-05-29", "time_utc": "12:30", "event": "PCE Core (Inflación Fed)", "importance": "high",   "currency": "USD", "session": "ny"},
    {"date": "2026-06-06", "time_utc": "12:30", "event": "Nonfarm Payrolls",         "importance": "high",   "currency": "USD", "session": "ny"},
    {"date": "2026-06-11", "time_utc": "18:00", "event": "Reunión FOMC + Powell",    "importance": "high",   "currency": "USD", "session": "ny"},
    {"date": "2026-06-12", "time_utc": "12:30", "event": "CPI EE.UU. (YoY / MoM)",  "importance": "high",   "currency": "USD", "session": "ny"},
    {"date": "2026-06-19", "time_utc": "11:00", "event": "Decisión de Tasas BoE",    "importance": "medium", "currency": "GBP", "session": "london"},
    {"date": "2026-06-27", "time_utc": "12:30", "event": "GDP EE.UU. (Q1 final)",    "importance": "medium", "currency": "USD", "session": "ny"},
]


# ─────────────────────────────────────────────────────────────────────────────
# Data fetch
# ─────────────────────────────────────────────────────────────────────────────

def fetch_yf() -> dict[str, pd.DataFrame]:
    """Yahoo Finance price-based assets."""
    out: dict[str, pd.DataFrame] = {}
    for name, ticker in YF_TICKERS.items():
        try:
            df = yf.download(ticker, period=PERIOD, interval=INTERVAL,
                             progress=False, auto_adjust=True)
            if df.empty:
                raise ValueError(f"No data for {ticker}")
            out[name] = df
        except Exception as e:
            print(f"[WARN] yfinance failed for {ticker}: {e}")
    return out


def fetch_fred() -> dict[str, pd.Series]:
    """FRED yields via direct CSV endpoint (no API key required)."""
    out: dict[str, pd.Series] = {}
    for name, series_id in FRED_SERIES.items():
        try:
            url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"
            r = requests.get(url, timeout=20)
            r.raise_for_status()
            from io import StringIO
            df = pd.read_csv(StringIO(r.text), parse_dates=["observation_date"], index_col="observation_date")
            df.columns = [series_id]
            s = df[series_id].replace(".", float("nan")).astype(float).dropna()
            s = s.iloc[-240:]  # keep ~240 most recent trading days
            if s.empty:
                raise ValueError(f"FRED returned empty series for {series_id}")
            out[name] = s
            print(f"  · {series_id}: {float(s.iloc[-1]):.3f}% (last={s.index[-1].date()})")
        except Exception as e:
            print(f"[ERROR] FRED failed for {series_id}: {e}")
    return out


# ─────────────────────────────────────────────────────────────────────────────
# Series extraction
# ─────────────────────────────────────────────────────────────────────────────

def _close_series(df: pd.DataFrame) -> pd.Series:
    col = df["Close"]
    if isinstance(col, pd.DataFrame):
        col = col.iloc[:, 0]
    return col.dropna()


def _pct_at(series: pd.Series, periods_ago: int) -> float:
    """Percentage change between latest and N periods ago."""
    if len(series) <= periods_ago:
        return 0.0
    current = float(series.iloc[-1])
    base    = float(series.iloc[-periods_ago - 1])
    if base == 0:
        return 0.0
    return round(((current - base) / base) * 100, 4)


def _abs_at(series: pd.Series, periods_ago: int, scale: float = 1.0) -> float:
    """Absolute change between latest and N periods ago, scaled (e.g. 100 for bps)."""
    if len(series) <= periods_ago:
        return 0.0
    current = float(series.iloc[-1])
    base    = float(series.iloc[-periods_ago - 1])
    return round((current - base) * scale, 4)


# ─────────────────────────────────────────────────────────────────────────────
# Fractal payload
# ─────────────────────────────────────────────────────────────────────────────

def build_fractal_pct(series: pd.Series) -> dict:
    """Fractal payload for price-based assets (DXY, FX, equity, VIX as level)."""
    if series.empty:
        return {"level": 0.0, "d": 0.0, "w": 0.0, "m": 0.0}
    return {
        "level": round(float(series.iloc[-1]), 5),
        "d":     _pct_at(series, 1),
        "w":     _pct_at(series, 5),
        "m":     _pct_at(series, 21),
    }


def build_fractal_bps(series: pd.Series) -> dict:
    """Fractal payload for yields — deltas in basis points (1% = 100bps)."""
    if series.empty:
        return {"level": 0.0, "d": 0.0, "w": 0.0, "m": 0.0}
    return {
        "level": round(float(series.iloc[-1]), 4),     # yield in % (e.g. 4.595)
        "d":     _abs_at(series, 1,  scale=100),       # bps
        "w":     _abs_at(series, 5,  scale=100),
        "m":     _abs_at(series, 21, scale=100),
    }


def build_fractal_points(series: pd.Series) -> dict:
    """Fractal payload for VIX — deltas in absolute points (not %)."""
    if series.empty:
        return {"level": 0.0, "d": 0.0, "w": 0.0, "m": 0.0}
    return {
        "level": round(float(series.iloc[-1]), 4),
        "d":     _abs_at(series, 1),
        "w":     _abs_at(series, 5),
        "m":     _abs_at(series, 21),
    }


# ─────────────────────────────────────────────────────────────────────────────
# News
# ─────────────────────────────────────────────────────────────────────────────

CATEGORY_KEYWORDS = {
    "monetary":   ["fed", "fomc", "powell", "rate", "rates", "ecb", "lagarde", "boe",
                   "bailey", "hike", "cut", "tasa", "tipo", "monetary", "qt", "qe"],
    "inflation":  ["cpi", "ppi", "pce", "inflation", "inflación", "deflation"],
    "labor":      ["payroll", "unemployment", "jobs", "nfp", "jobless", "empleo"],
    "growth":     ["gdp", "pmi", "ism", "retail", "production", "growth", "recession"],
    "geopolitics":["war", "ukraine", "china", "tariff", "sanction", "iran", "israel", "trade"],
}


def categorize(title: str) -> str:
    if not title: return "general"
    t = title.lower()
    for cat, kws in CATEGORY_KEYWORDS.items():
        if any(k in t for k in kws):
            return cat
    return "general"


def _to_iso(ts) -> Optional[str]:
    if ts is None: return None
    if isinstance(ts, str): return ts
    try:
        return datetime.fromtimestamp(float(ts), tz=timezone.utc).isoformat()
    except (ValueError, TypeError, OSError):
        return None


def _normalize_news(item: dict, ticker: str) -> Optional[dict]:
    if isinstance(item.get("content"), dict):
        c = item["content"]
        title = c.get("title")
        publisher = (c.get("provider") or {}).get("displayName")
        link = (c.get("canonicalUrl") or {}).get("url") or (c.get("clickThroughUrl") or {}).get("url")
        published = c.get("pubDate") or c.get("displayTime")
    else:
        title = item.get("title")
        publisher = item.get("publisher")
        link = item.get("link")
        published = item.get("providerPublishTime")

    if not title: return None
    return {
        "title":        title.strip(),
        "publisher":    publisher or "Unknown",
        "link":         link,
        "published_at": _to_iso(published),
        "ticker":       ticker,
        "category":     categorize(title),
    }


def fetch_news(max_total: int = 12) -> list[dict]:
    news: list[dict] = []
    for ticker in NEWS_TICKERS:
        try:
            raw = yf.Ticker(ticker).news or []
            for item in raw[:4]:
                norm = _normalize_news(item, ticker)
                if norm:
                    news.append(norm)
        except Exception as e:
            print(f"[WARN] No news for {ticker}: {e}")

    seen, unique = set(), []
    for n in news:
        key = n["title"].lower()[:120]
        if key not in seen:
            seen.add(key)
            unique.append(n)

    unique.sort(key=lambda x: x.get("published_at") or "", reverse=True)
    return unique[:max_total]


def filter_upcoming(events: list[dict]) -> list[dict]:
    today = datetime.now(timezone.utc).date()
    future = []
    for e in events:
        try:
            d = datetime.fromisoformat(e["date"]).date()
            if d >= today:
                future.append(e)
        except (ValueError, KeyError):
            continue
    future.sort(key=lambda x: x["date"])
    return future[:8]


# ─────────────────────────────────────────────────────────────────────────────
# Payload assembly
# ─────────────────────────────────────────────────────────────────────────────

def build_payload(yf_data: dict[str, pd.DataFrame], fred_data: dict[str, pd.Series]) -> dict:
    # ── Fractal payload ──
    fractal = {}
    for k, df in yf_data.items():
        s = _close_series(df)
        if k == "vix":
            fractal[k] = build_fractal_points(s)
        else:
            fractal[k] = build_fractal_pct(s)

    for k, s in fred_data.items():
        fractal[k] = build_fractal_bps(s)

    # ── Daily snapshot (flat fields for legacy/easy queries) ──
    dxy_delta       = fractal["dxy"]["d"]
    us10y_bps_delta = fractal.get("us10y", {}).get("d", 0.0)
    us02y_bps_delta = fractal.get("us02y", {}).get("d", 0.0)
    us10y_level     = fractal.get("us10y", {}).get("level", 0.0)
    us02y_level     = fractal.get("us02y", {}).get("level", 0.0)
    spread_10y_2y   = round(us10y_level - us02y_level, 4)
    vix_level       = fractal["vix"]["level"]
    vix_pts_delta   = fractal["vix"]["d"]
    eurusd_delta    = fractal["eurusd"]["d"]
    gbpusd_delta    = fractal["gbpusd"]["d"]
    nasdaq_delta    = fractal["nasdaq"]["d"]
    sp500_delta     = fractal["sp500"]["d"]

    macro_regime = compute_regime(dxy_delta, us10y_bps_delta)
    fx_bias      = compute_fx_bias(eurusd_delta, gbpusd_delta)

    print("[*] Fetching news...")
    news = fetch_news()
    upcoming = filter_upcoming(UPCOMING_EVENTS)

    # ── Snapshot dict consumed by confluence engine ──
    snap = {
        "dxy_delta":       dxy_delta,
        "us10y_bps_delta": us10y_bps_delta,
        "us02y_bps_delta": us02y_bps_delta,
        "us10y_level":     us10y_level,
        "us02y_level":     us02y_level,
        "spread_10y_2y":   spread_10y_2y,
        "vix_level":       vix_level,
        "vix_pts_delta":   vix_pts_delta,
        "eurusd_delta":    eurusd_delta,
        "gbpusd_delta":    gbpusd_delta,
        "nasdaq_delta":    nasdaq_delta,
        "sp500_delta":     sp500_delta,
        "macro_regime":    macro_regime,
    }

    print("[*] Computing thesis...")
    thesis = analyze_macro(snap, fractal, news)

    return {
        "fecha":         datetime.now(timezone.utc).isoformat(),

        # Flat columns
        "dxy_level":       fractal["dxy"]["level"],
        "dxy_delta":       dxy_delta,
        "us10y_level":     us10y_level,
        "us10y_bps_delta": us10y_bps_delta,
        "us02y_level":     us02y_level,
        "us02y_bps_delta": us02y_bps_delta,
        "spread_10y_2y":   spread_10y_2y,
        "vix_level":       vix_level,
        "vix_pts_delta":   vix_pts_delta,
        "eurusd_level":    fractal["eurusd"]["level"],
        "eurusd_delta":    eurusd_delta,
        "gbpusd_level":    fractal["gbpusd"]["level"],
        "gbpusd_delta":    gbpusd_delta,
        "nasdaq_delta":    nasdaq_delta,
        "sp500_delta":     sp500_delta,
        "macro_regime":    macro_regime,
        "fx_bias":         fx_bias,

        # JSONB
        "fractal":          fractal,
        "news":             news,
        "upcoming_events":  upcoming,
        "thesis":           thesis,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Supabase
# ─────────────────────────────────────────────────────────────────────────────

def insert_to_supabase(payload: dict) -> None:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        raise EnvironmentError("SUPABASE_URL and SUPABASE_KEY must be set in .env")

    client: Client = create_client(url, key)
    response = client.table("macro_logs").insert(payload).execute()

    if hasattr(response, "error") and response.error:
        raise RuntimeError(f"Supabase insert error: {response.error}")
    print(f"[OK] Inserted record id={response.data[0].get('id')}")


def main() -> None:
    print("=== Macro Alignment Engine v1.0 ===")

    print("[1/4] Fetching Yahoo Finance (DXY, FX, equity, VIX)...")
    yf_data = fetch_yf()
    if len(yf_data) < len(YF_TICKERS):
        missing = set(YF_TICKERS) - set(yf_data)
        print(f"[ERROR] Missing yfinance tickers: {missing}. Aborting.")
        return

    print("[2/4] Fetching FRED (DGS10, DGS2)...")
    fred_data = fetch_fred()
    if len(fred_data) < len(FRED_SERIES):
        missing = set(FRED_SERIES) - set(fred_data)
        print(f"[ERROR] Missing FRED series: {missing}. Aborting.")
        return

    print("[3/4] Building payload + thesis...")
    payload = build_payload(yf_data, fred_data)
    summary = {k: v for k, v in payload.items()
               if k not in ("fractal", "news", "upcoming_events", "thesis")}
    print(json.dumps(summary, indent=2, default=str))
    print(f"  · fractal:         {len(payload['fractal'])} assets")
    print(f"  · news:            {len(payload['news'])} items")
    print(f"  · upcoming_events: {len(payload['upcoming_events'])} events")
    print(f"  · thesis:          {payload['thesis']['direction']} · "
          f"daily={payload['thesis']['alignment_pct']}% · "
          f"fractal={payload['thesis']['fractal_pct']}%")

    print("[4/4] Inserting into Supabase...")
    try:
        insert_to_supabase(payload)
    except EnvironmentError as e:
        print(f"[ERROR] {e}")
        print("[INFO] Skipping DB insert — set SUPABASE_URL and SUPABASE_KEY in .env to enable.")

    print("=== Done ===")


if __name__ == "__main__":
    main()
