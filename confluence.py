"""
Confluence Engine (Python)
─────────────────────────────────────────────────────────────────────────────
Single source of truth for macro thesis.
Computes cross-asset alignment, fractal alignment, evidence, news commentary
and expectation. Returns a dict serialized as the `thesis` JSONB column.
"""

from typing import Optional


# ─────────────────────────────────────────────────────────────────────────────
# Direction helpers
# ─────────────────────────────────────────────────────────────────────────────

PCT_THRESHOLD = 0.05   # %  — for FX / equity / DXY percentage changes
BPS_THRESHOLD = 1.0    # bps — for yield absolute changes
VIX_THRESHOLD = 0.25   # points — for VIX absolute changes


def dir_pct(v: float) -> str:
    if v >  PCT_THRESHOLD: return "UP"
    if v < -PCT_THRESHOLD: return "DOWN"
    return "FLAT"


def dir_bps(v: float) -> str:
    if v >  BPS_THRESHOLD: return "UP"
    if v < -BPS_THRESHOLD: return "DOWN"
    return "FLAT"


def dir_vix(v: float) -> str:
    if v >  VIX_THRESHOLD: return "UP"
    if v < -VIX_THRESHOLD: return "DOWN"
    return "FLAT"


def fmt_pct(v: float) -> str:
    return f"{'+' if v > 0 else ''}{v:.2f}%"


def fmt_bps(v: float) -> str:
    return f"{'+' if v > 0 else ''}{v:.1f} bps"


# ─────────────────────────────────────────────────────────────────────────────
# Macro Regime / FX Bias
# ─────────────────────────────────────────────────────────────────────────────

def compute_regime(dxy_delta_pct: float, us10y_bps_delta: float) -> str:
    """RISK_OFF when DXY ↑ and yields ↑. RISK_ON when both ↓. Else MIXED."""
    dxy_d = dir_pct(dxy_delta_pct)
    yld_d = dir_bps(us10y_bps_delta)
    if dxy_d == "UP" and yld_d == "UP":     return "RISK_OFF"
    if dxy_d == "DOWN" and yld_d == "DOWN": return "RISK_ON"
    return "MIXED"


def compute_fx_bias(eurusd_delta: float, gbpusd_delta: float) -> str:
    if eurusd_delta < 0 and gbpusd_delta < 0: return "USD_STRONG"
    if eurusd_delta > 0 and gbpusd_delta > 0: return "USD_WEAK"
    return "MIXED"


# ─────────────────────────────────────────────────────────────────────────────
# Cross-asset vectors (daily)
# ─────────────────────────────────────────────────────────────────────────────

def _vec(id_, label, detail, status, weight):
    return {"id": id_, "label": label, "detail": detail, "status": status, "weight": weight}


def build_vectors(snap: dict) -> list[dict]:
    """Returns a list of vector dicts, one per macro relationship."""
    dxy_d = dir_pct(snap["dxy_delta"])
    yld_d = dir_bps(snap["us10y_bps_delta"])
    eur_d = dir_pct(snap["eurusd_delta"])
    gbp_d = dir_pct(snap["gbpusd_delta"])
    nq_d  = dir_pct(snap["nasdaq_delta"])
    es_d  = dir_pct(snap["sp500_delta"])
    vix   = snap["vix_level"]

    # DXY ↔ Yields (same direction = aligned = tightening or easing coordinated)
    if (dxy_d == "UP" and yld_d == "UP") or (dxy_d == "DOWN" and yld_d == "DOWN"):
        dxy_yields_status = "CONFIRMS"
    elif dxy_d == "FLAT" or yld_d == "FLAT":
        dxy_yields_status = "NEUTRAL"
    else:
        dxy_yields_status = "DIVERGES"

    def inverse(other_dir: str) -> str:
        """For assets that should move INVERSELY to DXY."""
        if dxy_d == "FLAT" or other_dir == "FLAT": return "NEUTRAL"
        return "CONFIRMS" if dxy_d != other_dir else "DIVERGES"

    vix_status = "CONFIRMS" if vix > 25 or vix < 15 else "NEUTRAL"

    return [
        _vec("dxy-yields",
             "DXY ↔ US10Y",
             f"DXY {fmt_pct(snap['dxy_delta'])} · 10Y {fmt_bps(snap['us10y_bps_delta'])}",
             dxy_yields_status, 3),
        _vec("dxy-eurusd",
             "DXY ↔ EUR/USD",
             f"Inversa esperada · EUR/USD {fmt_pct(snap['eurusd_delta'])}",
             inverse(eur_d), 3),
        _vec("dxy-gbpusd",
             "DXY ↔ GBP/USD",
             f"Inversa esperada · GBP/USD {fmt_pct(snap['gbpusd_delta'])}",
             inverse(gbp_d), 2),
        _vec("dxy-nq",
             "DXY ↔ Nasdaq",
             f"Inversa esperada · NQ {fmt_pct(snap['nasdaq_delta'])}",
             inverse(nq_d), 2),
        _vec("dxy-es",
             "DXY ↔ S&P 500",
             f"Inversa esperada · ES {fmt_pct(snap['sp500_delta'])}",
             inverse(es_d), 2),
        _vec("vix-regime",
             "VIX (volatilidad)",
             f"Nivel actual: {vix:.2f}",
             vix_status, 1),
    ]


def compute_alignment_pct(vectors: list[dict]) -> int:
    total  = sum(v["weight"] for v in vectors)
    earned = 0.0
    for v in vectors:
        if v["status"] == "CONFIRMS": earned += v["weight"]
        elif v["status"] == "NEUTRAL": earned += v["weight"] * 0.5
    return round((earned / total) * 100) if total else 0


# ─────────────────────────────────────────────────────────────────────────────
# Fractal alignment (per-asset D / W / M)
# ─────────────────────────────────────────────────────────────────────────────

FRACTAL_LABELS = {
    "dxy":     "DXY",
    "us10y":   "US 10Y",
    "us02y":   "US 2Y",
    "eurusd":  "EUR/USD",
    "gbpusd":  "GBP/USD",
    "nasdaq":  "Nasdaq",
    "sp500":   "S&P 500",
    "vix":     "VIX",
}

# Assets where the delta is bps (yields) vs % (price) — affects threshold
BPS_ASSETS = {"us10y", "us02y"}
VIX_ASSETS = {"vix"}


def _trend_for(asset: str, value: float) -> str:
    if asset in BPS_ASSETS: return dir_bps(value)
    if asset in VIX_ASSETS: return dir_vix(value)
    return dir_pct(value)


def build_fractal_rows(fractal: dict) -> list[dict]:
    rows = []
    for key, label in FRACTAL_LABELS.items():
        f = fractal.get(key)
        if not f:
            continue
        td = _trend_for(key, f["d"])
        tw = _trend_for(key, f["w"])
        tm = _trend_for(key, f["m"])

        non_flat = [t for t in (td, tw, tm) if t != "FLAT"]
        aligned = len(non_flat) >= 2 and all(t == non_flat[0] for t in non_flat)

        ups   = sum(1 for t in (td, tw, tm) if t == "UP")
        downs = sum(1 for t in (td, tw, tm) if t == "DOWN")
        dominant = "UP" if ups > downs else "DOWN" if downs > ups else "FLAT"

        rows.append({
            "key": key,
            "label": label,
            "unit": "bps" if key in BPS_ASSETS else "pts" if key in VIX_ASSETS else "pct",
            "level": f.get("level"),
            "d": f["d"],
            "w": f["w"],
            "m": f["m"],
            "trends": {"d": td, "w": tw, "m": tm},
            "aligned": aligned,
            "dominant_bias": dominant,
        })
    return rows


def compute_fractal_pct(rows: list[dict]) -> int:
    if not rows: return 0
    aligned = sum(1 for r in rows if r["aligned"])
    return round((aligned / len(rows)) * 100)


# ─────────────────────────────────────────────────────────────────────────────
# Headline + expectation
# ─────────────────────────────────────────────────────────────────────────────

def regime_to_direction(regime: str) -> str:
    if regime == "RISK_OFF": return "BEARISH_RISK"
    if regime == "RISK_ON":  return "BULLISH_RISK"
    return "CONSOLIDATION"


def build_headline(direction: str, daily: int, fractal: int) -> str:
    combined = round((daily + fractal) / 2)
    strength = ("Alta convicción" if combined >= 80
                else "Convicción media" if combined >= 60
                else "Baja convicción")
    if direction == "BEARISH_RISK":
        return f"{strength}: sesgo BAJISTA en activos de riesgo · USD fuerte"
    if direction == "BULLISH_RISK":
        return f"{strength}: sesgo ALCISTA en activos de riesgo · USD débil"
    return f"{strength}: CONSOLIDACIÓN — sin dirección macro clara"


def build_expectation(snap: dict, direction: str, daily: int, fractal: int) -> str:
    strong = daily >= 70 and fractal >= 60

    if direction == "BEARISH_RISK":
        if strong:
            return ("continuación de la fortaleza del dólar en múltiples marcos temporales. "
                    "Buscar SHORTS en EUR/USD y GBP/USD en pullbacks alcistas hacia zonas de oferta "
                    "SMC (FVG bearish, OB no mitigados) usando el TF semanal como guía direccional. "
                    "Evitar longs en NQ/ES hasta que DXY pierda estructura semanal.")
        return ("sesgo bajista intacto pero con menor convicción. Operar con tamaños "
                "reducidos y esperar segundo pullback en EUR/USD o cierre semanal alcista en DXY "
                "para confirmar antes de añadir.")

    if direction == "BULLISH_RISK":
        if strong:
            return ("continuación del flujo hacia activos de riesgo. Buscar LONGS en EUR/USD "
                    "y GBP/USD en retrocesos hacia demanda SMC. Priorizar longs en NQ/ES mientras "
                    "DXY mantenga estructura bajista semanal.")
        return ("sesgo alcista con cautela. Esperar confirmación en VIX < 18 y yields "
                "estables antes de añadir tamaño.")

    return ("consolidación lateral · evitar setups direccionales fuertes. Operar "
            "mean-reversion en rangos definidos por estructura SMC reciente. Reducir tamaño y "
            f"esperar alineación macro: actualmente DXY {fmt_pct(snap['dxy_delta'])} y "
            f"US10Y {fmt_bps(snap['us10y_bps_delta'])} envían señales mixtas.")


# ─────────────────────────────────────────────────────────────────────────────
# Evidence builders
# ─────────────────────────────────────────────────────────────────────────────

def _fractal_adjective(aligned: bool) -> str:
    return ("fuertemente alineado en marcos D + W + M" if aligned
            else "sin alineación entre marcos temporales (transición/rango)")


def build_evidence(vectors: list[dict], snap: dict, fractal_rows: list[dict]) -> dict:
    confirming, diverging = [], []

    for v in vectors:
        if v["status"] == "CONFIRMS":
            if v["id"] == "dxy-yields":
                confirming.append(
                    f"DXY ({fmt_pct(snap['dxy_delta'])}) y US10Y ({fmt_bps(snap['us10y_bps_delta'])}) "
                    "coordinados → confirma dirección unificada de liquidez.")
            elif v["id"] == "dxy-eurusd":
                confirming.append(f"EUR/USD ({fmt_pct(snap['eurusd_delta'])}) respeta su correlación inversa con DXY.")
            elif v["id"] == "dxy-gbpusd":
                confirming.append(f"GBP/USD ({fmt_pct(snap['gbpusd_delta'])}) respeta su correlación inversa con DXY.")
            elif v["id"] == "dxy-nq":
                confirming.append(f"Nasdaq ({fmt_pct(snap['nasdaq_delta'])}) reacciona como esperado a la presión del dólar.")
            elif v["id"] == "dxy-es":
                confirming.append(f"S&P 500 ({fmt_pct(snap['sp500_delta'])}) confirma la lectura de equity.")
            elif v["id"] == "vix-regime":
                if snap["vix_level"] > 25:
                    confirming.append(f"VIX en {snap['vix_level']:.1f} confirma estrés en el mercado.")
                else:
                    confirming.append(f"VIX en {snap['vix_level']:.1f} confirma complacencia.")
        elif v["status"] == "DIVERGES":
            if v["id"] == "dxy-yields":
                diverging.append("DXY y US10Y van en direcciones opuestas → señal mixta sin convicción de régimen.")
            elif v["id"] == "dxy-eurusd":
                diverging.append("EUR/USD NO respeta su correlación inversa con DXY → posible debilidad estructural en EUR.")
            elif v["id"] == "dxy-gbpusd":
                diverging.append("GBP/USD NO respeta su correlación inversa con DXY → factor idiosincrático en GBP.")
            elif v["id"] == "dxy-nq":
                diverging.append("Nasdaq diverge del dólar → equity ignora la presión macro, vigilar reversión.")
            elif v["id"] == "dxy-es":
                diverging.append("S&P 500 diverge del dólar → confirmación incompleta del régimen.")

    # Fractal commentary
    by_key = {r["key"]: r for r in fractal_rows}
    dxy_row = by_key.get("dxy")
    eur_row = by_key.get("eurusd")
    gbp_row = by_key.get("gbpusd")
    nq_row  = by_key.get("nasdaq")

    if dxy_row:
        line = (f"DXY {_fractal_adjective(dxy_row['aligned'])} "
                f"(D {fmt_pct(dxy_row['d'])} · W {fmt_pct(dxy_row['w'])} · M {fmt_pct(dxy_row['m'])})")
        (confirming if dxy_row["aligned"] else diverging).append(line + ".")

    if eur_row and gbp_row and eur_row["aligned"] and gbp_row["aligned"] \
            and eur_row["dominant_bias"] == gbp_row["dominant_bias"]:
        confirming.append("EUR/USD y GBP/USD alineados en los tres marcos temporales → tendencia FX limpia (D + W + M).")

    if nq_row and not nq_row["aligned"]:
        diverging.append(
            f"Nasdaq sin alineación fractal "
            f"(D {fmt_pct(nq_row['d'])} · W {fmt_pct(nq_row['w'])} · M {fmt_pct(nq_row['m'])}) "
            "→ posible cambio de fase en equity.")

    # Yield curve
    spread = snap.get("spread_10y_2y")
    if spread is not None and spread < 0:
        diverging.append(f"Curva invertida (spread {spread:.2f}%) → señal recesiva latente.")

    return {"confirming": confirming, "diverging": diverging}


# ─────────────────────────────────────────────────────────────────────────────
# News commentary
# ─────────────────────────────────────────────────────────────────────────────

def build_news_commentary(news: list[dict], direction: str, snap: dict) -> list[str]:
    if not news: return []

    buckets: dict[str, list[dict]] = {
        "monetary": [], "inflation": [], "labor": [], "growth": [], "geopolitics": [], "general": [],
    }
    for n in news:
        cat = n.get("category", "general")
        buckets.setdefault(cat, []).append(n)

    lines: list[str] = []

    def head(n): return (n.get("title") or "")[:90]

    if buckets["monetary"]:
        verb = ("refuerza el sesgo restrictivo (DXY ↑, yields ↑)"
                if direction == "BEARISH_RISK"
                else "apunta a relajación monetaria (DXY ↓)"
                if direction == "BULLISH_RISK"
                else "introduce incertidumbre sobre el próximo movimiento de la Fed")
        lines.append(f'Política monetaria: "{head(buckets["monetary"][0])}" → {verb}.')

    if buckets["inflation"]:
        lines.append(
            f'Inflación: "{head(buckets["inflation"][0])}" → contexto directo para yields '
            f'(US10Y actual {snap["us10y_level"]:.2f}%, {fmt_bps(snap["us10y_bps_delta"])} hoy).')

    if buckets["labor"]:
        lines.append(f'Mercado laboral: "{head(buckets["labor"][0])}" → dato sensible para expectativas Fed.')

    if buckets["geopolitics"]:
        lines.append(
            f'Geopolítica: "{head(buckets["geopolitics"][0])}" → puede explicar el nivel del VIX '
            f'({snap["vix_level"]:.1f}) y la demanda de USD como refugio.')

    if buckets["growth"]:
        lines.append(
            f'Crecimiento: "{head(buckets["growth"][0])}" → impacta directamente a equity '
            f'(NQ {fmt_pct(snap["nasdaq_delta"])}).')

    return lines[:5]


# ─────────────────────────────────────────────────────────────────────────────
# Public API — single entry point
# ─────────────────────────────────────────────────────────────────────────────

def analyze_macro(snap: dict, fractal: dict, news: Optional[list[dict]] = None) -> dict:
    """
    Build the full thesis dict.

    Args:
        snap: daily snapshot. Required keys:
              dxy_delta, us10y_bps_delta, us02y_bps_delta, spread_10y_2y,
              vix_level, vix_pts_delta, eurusd_delta, gbpusd_delta,
              nasdaq_delta, sp500_delta, us10y_level, macro_regime.
        fractal: per-asset {level,d,w,m} dict.
        news: list of news items with at least {title, category}.

    Returns:
        Dict mirroring the legacy TS MacroThesis shape, ready for JSONB storage.
    """
    vectors        = build_vectors(snap)
    alignment_pct  = compute_alignment_pct(vectors)
    fractal_rows   = build_fractal_rows(fractal)
    fractal_pct    = compute_fractal_pct(fractal_rows)
    direction      = regime_to_direction(snap["macro_regime"])
    headline       = build_headline(direction, alignment_pct, fractal_pct)
    evidence       = build_evidence(vectors, snap, fractal_rows)
    news_commentary = build_news_commentary(news or [], direction, snap)
    expectation    = build_expectation(snap, direction, alignment_pct, fractal_pct)

    return {
        "direction":        direction,
        "headline":         headline,
        "alignment_pct":    alignment_pct,
        "fractal_pct":      fractal_pct,
        "vectors":          vectors,
        "fractal_rows":     fractal_rows,
        "confirming":       evidence["confirming"],
        "diverging":        evidence["diverging"],
        "news_commentary":  news_commentary,
        "expectation":      expectation,
    }
