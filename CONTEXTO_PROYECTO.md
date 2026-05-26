# Macro Alignment Engine v1.0 — Contexto para IAs

> Handoff para compartir, revisar y debatir **FUNDAMENTAL** (`c:\Users\User\Desktop\FUNDAMENTAL`).  
> **Verificado:** 2026-05-17 · `macro_engine.py` → Supabase `id=5` · `npm run build` OK.

---

## 0. TL;DR

| Pregunta | Respuesta |
|----------|-----------|
| ¿Qué es? | Panel macro para trading FX + futuros US, alineado con **SMC** (solo educativo). |
| ¿Flujo? | Python batch → Supabase → React (último snapshot). |
| ¿Dónde está la lógica de scoring? | **`confluence.py`** (Python). Tesis persistida en `thesis` JSONB. |
| ¿Qué hace el frontend? | **Renderiza** `data.thesis` + formatters. No recalcula scores. |
| ¿Datos? | Yahoo (precios) + FRED CSV vía `requests` (DGS10, DGS2). |
| ¿Qué falta? | Cron, git, tests, histórico gráfico, API. |

---

## 1. Arquitectura

```
macro_engine.py
  ├── fetch_yf()     → DXY, VIX, EUR/USD, GBP/USD, NQ, ES
  ├── fetch_fred()   → DGS10, DGS2 (CSV público)
  ├── fractal D/W/M, news, calendario
  └── confluence.analyze_macro() → thesis dict
           │
           ▼ INSERT (service_role)
      Supabase · macro_logs
           │
           ▼ SELECT (anon)
      frontend/ · 3 tabs · 8 componentes
```

**Regla de oro:** Python calcula y persiste; TypeScript muestra.

---

## 2. Estructura del repo

```
FUNDAMENTAL/
├── macro_engine.py          # ETL + orquestación
├── confluence.py            # ★ Régimen, vectores, fractal, tesis narrativa
├── database_schema.sql      # DROP + CREATE (destructivo)
├── requirements.txt
├── .env / .env.example
├── venv/
├── CONTEXTO_PROYECTO.md
└── frontend/src/
    ├── App.tsx                    # Shell + tabs
    ├── hooks/useMacroData.ts
    ├── types/macro.ts             # Contrato 1:1 con DB/Python
    ├── lib/confluence.ts          # Formatters + estilos + TZ New York
    └── components/
        ├── MacroBanner.tsx
        ├── FxBiasCards.tsx
        ├── FuturesCards.tsx
        ├── FractalMatrix.tsx
        ├── ConfluenceScorecard.tsx
        ├── ThesisReport.tsx
        ├── NewsAndCalendar.tsx    # Feed + calendario expandible con proyecciones
        └── SessionMeter.tsx       # Sesiones Londres/NY en vivo
```

**Git:** no inicializado en esta carpeta.

---

## 3. Fuentes de datos

### 3.1 Yahoo Finance

| Clave | Ticker | Delta fractal |
|-------|--------|---------------|
| `dxy` | `DX-Y.NYB` | % |
| `vix` | `^VIX` | **puntos** |
| `eurusd` | `EURUSD=X` | % |
| `gbpusd` | `GBPUSD=X` | % |
| `nasdaq` | `NQ=F` | % |
| `sp500` | `ES=F` | % |

`PERIOD=6mo`, `INTERVAL=1d`. Fallo en cualquier ticker → aborta.

### 3.2 FRED (sin API key)

URL: `https://fred.stlouisfed.org/graph/fredgraph.csv?id={DGS10|DGS2}`  
Implementado con `requests` + `pandas.read_csv` (el docstring de `macro_engine.py` menciona `pandas_datareader` pero **no se usa**).

| Clave | Serie | Delta |
|-------|-------|-------|
| `us10y` | DGS10 | **bps** |
| `us02y` | DGS2 | **bps** |

Fallo FRED → aborta.

### 3.3 Noticias

- Tickers: `EURUSD=X`, `GBPUSD=X`, `NQ=F`, `ES=F`, `^VIX`.
- Máx. 12, dedupe, categorías por keywords.
- Esquemas yfinance legacy y nuevo (`content` anidado).

### 3.4 Calendario

Hardcodeado en `UPCOMING_EVENTS` (`macro_engine.py`):

```json
{
  "date": "2026-05-22",
  "time_utc": "13:15",
  "event": "Decisión de Tasas BCE",
  "importance": "high",
  "currency": "EUR",
  "session": "london | ny | overlap"
}
```

---

## 4. Base de datos (`macro_logs`)

> ⚠️ `database_schema.sql` → `drop table if exists macro_logs cascade`

### Escalares

| Campo | Unidad |
|-------|--------|
| `dxy_*` | % |
| `us10y_*`, `us02y_*` | nivel % / delta **bps** |
| `spread_10y_2y` | % (10Y−2Y real) |
| `vix_*` | nivel / delta **pts** |
| `eurusd_*`, `gbpusd_*` | % |
| `nasdaq_delta`, `sp500_delta` | % |
| `macro_regime`, `fx_bias` | enum |

### JSONB

| Columna | Contenido |
|---------|-----------|
| `fractal` | 8 activos `{level, d, w, m}` |
| `news` | titulares clasificados |
| `upcoming_events` | calendario filtrado |
| `thesis` | salida completa de `analyze_macro()` |

### RLS

- `SELECT` → anon  
- `INSERT` → service_role (script Python)

---

## 5. Lógica Python (`confluence.py`)

### Umbrales

| Tipo | Umbral |
|------|--------|
| % (DXY, FX, futuros) | ±0.05% |
| bps (yields) | ±1.0 |
| pts (VIX) | ±0.25 |

### Régimen

| Valor | Condición (delta diario) |
|-------|--------------------------|
| `RISK_OFF` | DXY ↑ y US10Y ↑ (bps) |
| `RISK_ON` | DXY ↓ y US10Y ↓ |
| `MIXED` | resto |

### Sesgo FX

| Valor | Condición |
|-------|-----------|
| `USD_STRONG` | EUR/USD ↓ y GBP/USD ↓ |
| `USD_WEAK` | ambos ↑ |
| `MIXED` | resto |

### Fractal

Offsets: d=1, w=5, m=21 días de trading.  
`fractal_pct` = % activos con D/W/M alineados (8 en matriz completa).

### Vectores → `alignment_pct`

6 vectores (pesos 3+3+2+2+2+1): DXY↔10Y, DXY↔EUR, DXY↔GBP, DXY↔NQ, DXY↔ES, VIX nivel.

### Objeto `thesis` (JSONB)

```json
{
  "direction": "BEARISH_RISK | BULLISH_RISK | CONSOLIDATION",
  "headline": "...",
  "alignment_pct": 85,
  "fractal_pct": 75,
  "vectors": [...],
  "fractal_rows": [{ "key", "label", "unit": "pct|bps|pts", "d", "w", "m", "trends", "aligned", "dominant_bias" }],
  "confirming": ["..."],
  "diverging": ["..."],
  "news_commentary": ["..."],
  "expectation": "..."
}
```

- `direction` ← `macro_regime` (no del fractal).
- Convicción headline: media de ambos scores.
- Expectativa fuerte: `alignment_pct ≥ 70` y `fractal_pct ≥ 60`.

### Última ejecución (2026-05-17)

```
DGS10=4.470%  DGS2=4.000%  spread=0.47%
macro_regime=MIXED  fx_bias=USD_STRONG
thesis=CONSOLIDATION · alignment_pct=85 · fractal_pct=75
→ insert id=5
```

*Nota:* DXY +0.39% pero 10Y solo +1 bps → **MIXED** (no RISK_OFF). FX cae → USD_STRONG. Scores altos pero régimen mixto → tesis CONSOLIDATION.

---

## 6. Pipeline

```powershell
Set-Location "c:\Users\User\Desktop\FUNDAMENTAL"
.\venv\Scripts\python.exe macro_engine.py
```

Pasos: `[1/4]` Yahoo → `[2/4]` FRED → `[3/4]` payload+thesis → `[4/4]` Supabase.

`.env` raíz: `SUPABASE_URL`, `SUPABASE_KEY` (service_role).

---

## 7. Frontend

### Principio

- **No calcular tesis en TS.** Leer `data.thesis`.
- `lib/confluence.ts` = formatters (`fmtPct`, `fmtBps`, `fmtPts`), tonos, estilos, **timezone New York** (`formatDateTimeNY`, `eventTimeNY`).

### Fetch

`useMacroData` → último row por `fecha DESC`.

### Tabs (`App.tsx`)

| Tab | Contenido |
|-----|-----------|
| **FX** | Contexto DXY, `FxBiasCards`, fractal FX, expectativa operativa |
| **Futuros & Macro** | `MacroBanner`, `FuturesCards`, `ConfluenceScorecard`, `FractalMatrix`, `ThesisReport` |
| **Noticias** | `SessionMeter`, `NewsFeed`, `UpcomingCalendar` |

### Capa UI exclusiva del frontend (no en Python)

**`NewsAndCalendar.tsx` → `getEventProjection()`**  
Calendario **expandible** por evento con:
- Resumen del dato
- Escenario alcista / bajista (plantillas por tipo: FOMC, BCE, BoE, NFP, CPI/PCE, GDP…)
- Nota operativa SMC

Esto es **contenido educativo estático en TS**, no derivado de datos de mercado.

**`SessionMeter.tsx`** (~396 líneas)  
- Ventanas Londres (08–17 UTC) y NY (13:30–21 UTC)  
- Estado activo/cerrado, fin de semana  
- Proximidad a eventos high-impact en la sesión  
- Hora del evento mostrada en **ET** vía `eventTimeNY()`

### Build

```powershell
# frontend/.env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...

cd frontend
npm run dev
npm run build   # OK
```

Stack: React 19, Vite 8, Tailwind 4, TS 6, Supabase JS, lucide-react.

---

## 8. Flujo operativo

1. Ejecutar `database_schema.sql` (acepta pérdida de histórico).
2. Configurar `.env` raíz + `frontend/.env`.
3. `python macro_engine.py` manualmente.
4. `npm run dev` o servir `dist/`.

---

## 9. Estado verificado

| Componente | Estado |
|------------|--------|
| Yahoo + FRED | ✅ |
| Tesis Python → JSONB | ✅ |
| Supabase insert | ✅ (`id=5`) |
| UI 3 tabs + componentes | ✅ |
| Calendario con proyecciones | ✅ (solo UI) |
| SessionMeter NY/London | ✅ |
| Build | ✅ |
| Git / CI / tests / cron | ❌ |
| Histórico en UI | ❌ |

---

## 10. Mapa de responsabilidades

| Lógica | Archivo | Persistido |
|--------|---------|------------|
| Régimen, FX bias, scores, narrativa macro | `confluence.py` | `thesis` JSONB + escalares |
| Ingesta, fractal raw, news, calendario | `macro_engine.py` | `fractal`, `news`, `upcoming_events` |
| Proyecciones por evento (FOMC, NFP…) | `NewsAndCalendar.tsx` | No (solo UI) |
| Sesiones operativas | `SessionMeter.tsx` | No (calculado en cliente) |
| Formatters y estilos | `lib/confluence.ts` | No |

---

## 11. Deuda técnica

- Fractal W/M = offsets fijos (no calendario real).
- FRED puede ir 1–2 días retrasado.
- Calendario y proyecciones de eventos = manual/plantillas.
- Cada run = nueva fila (sin upsert diario).
- Schema destructivo.
- Sin tests ni git.
- Duplicación conceptual: narrativa macro en Python vs. proyecciones de eventos en TS.

---

## 12. Preguntas para debate entre IAs

1. ¿Mover `getEventProjection()` a Python y persistir en JSONB?
2. ¿Migración SQL no destructiva?
3. ¿Upsert por fecha?
4. ¿API de calendario real?
5. ¿Edge Function para el pipeline?
6. ¿Histórico / sparklines de régimen?
7. ¿Tests con fixtures de `thesis`?
8. ¿Generar `types/macro.ts` desde Pydantic?
9. ¿Alertas si cambia `macro_regime`?
10. ¿Unificar zona horaria (todo ET vs. UTC en backend)?

---

## 13. Instrucciones para la IA receptora

1. No reimplementar `analyze_macro` en TypeScript.
2. Si `thesis` es null → row con schema viejo o ingest no corrida.
3. Editar reglas de scoring → `confluence.py` primero.
4. Editar textos de eventos → `NewsAndCalendar.tsx` (`getEventProjection`).
5. No ejecutar `database_schema.sql` sin avisar (borra datos).
6. No exponer `service_role` en variables `VITE_*`.
7. Actualizar este doc tras cambios de arquitectura.

---

## 14. Changelog del documento

| Fecha | Cambio |
|-------|--------|
| 2026-05-16 | v1 — yfinance yields, tesis en TS |
| 2026-05-17 | v2 — fractal, news, calendario |
| 2026-05-17 | v3 — FRED, bps/pts, `confluence.py`, `thesis` JSONB, tabs |
| 2026-05-17 | **v5** — calendario expandible con proyecciones, `SessionMeter` ampliado, helpers TZ New York, snapshot `id=5` |

---

*Adjuntar este archivo completo al iniciar un chat con otra IA.*
