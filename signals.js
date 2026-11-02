"use strict";
/* Signal logic, copied unchanged from stochastic-alerts.html so the alerts match the page. */
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
function stoch(bars, kp, sm, dp) {
  const n = bars.length, raw = new Array(n).fill(null), K = new Array(n).fill(null), D = new Array(n).fill(null);
  for (let i = kp - 1; i < n; i++) {
    const w = bars.slice(i - kp + 1, i + 1);
    const hh = Math.max(...w.map(b => b.h)), ll = Math.min(...w.map(b => b.l));
    raw[i] = hh === ll ? 50 : (bars[i].c - ll) / (hh - ll) * 100;
  }
  for (let i = kp - 1 + sm - 1; i < n; i++) K[i] = mean(raw.slice(i - sm + 1, i + 1));
  for (let i = kp - 1 + sm - 1 + dp - 1; i < n; i++) D[i] = mean(K.slice(i - dp + 1, i + 1));
  return { K, D };
}

/* trend check: ADX for strength, 20/50 EMAs and price for direction */
function ema(vals, len) {
  const k = 2 / (len + 1); let e = mean(vals.slice(0, len));
  for (let i = len; i < vals.length; i++) e = vals[i] * k + e * (1 - k);
  return e;
}
function trendInfo(bars, minAdx) {
  const p = 14, n = bars.length;
  if (n < 60) return null;
  const tr = [], pd = [], md = [];
  for (let i = 1; i < n; i++) {
    const up = bars[i].h - bars[i - 1].h, dn = bars[i - 1].l - bars[i].l;
    pd.push(up > dn && up > 0 ? up : 0);
    md.push(dn > up && dn > 0 ? dn : 0);
    tr.push(Math.max(bars[i].h - bars[i].l, Math.abs(bars[i].h - bars[i - 1].c), Math.abs(bars[i].l - bars[i - 1].c)));
  }
  const sum = a => a.reduce((x, y) => x + y, 0);
  let sTr = sum(tr.slice(0, p)), sP = sum(pd.slice(0, p)), sM = sum(md.slice(0, p));
  const dx = [];
  const push = () => {
    if (!sTr) { dx.push(0); return; }
    const pi = 100 * sP / sTr, mi = 100 * sM / sTr;
    dx.push(pi + mi === 0 ? 0 : 100 * Math.abs(pi - mi) / (pi + mi));
  };
  push();
  for (let i = p; i < tr.length; i++) {
    sTr = sTr - sTr / p + tr[i]; sP = sP - sP / p + pd[i]; sM = sM - sM / p + md[i];
    push();
  }
  let adx = mean(dx.slice(0, p));
  for (let i = p; i < dx.length; i++) adx = (adx * (p - 1) + dx[i]) / p;
  const closes = bars.map(b => b.c), last = closes[closes.length - 1];
  const e20 = ema(closes, 20), e50 = ema(closes, 50);
  const dir = last > e50 && e20 > e50 ? "up" : last < e50 && e20 < e50 ? "down" : "none";
  const trending = adx >= minAdx && dir !== "none";
  return { adx, dir, trending, label: trending ? (dir === "up" ? "Uptrend" : "Downtrend") : "Ranging" };
}

/* supply and demand zones: a small base of quiet candles, then a strong move away from it */
function findZones(bars) {
  const n = bars.length, p = 14, found = [];
  const trs = bars.map((b, i) => i === 0 ? b.h - b.l : Math.max(b.h - b.l, Math.abs(b.h - bars[i - 1].c), Math.abs(b.l - bars[i - 1].c)));
  const atrAt = i => mean(trs.slice(Math.max(0, i - p + 1), i + 1));
  for (let j = 16; j < n - 1; j++) {                       // j is the strong candle; the newest candle never counts
    const a = atrAt(j - 1), b = bars[j], body = Math.abs(b.c - b.o), rng = b.h - b.l;
    if (!a || body < 1.5 * a || body < 0.6 * rng) continue;
    const up = b.c > b.o, base = [];
    for (let k = j - 1; k >= Math.max(1, j - 3); k--) {    // up to 3 quiet candles just before it
      const q = bars[k];
      if (q.h - q.l <= 0.9 * a && Math.abs(q.c - q.o) <= 0.6 * a) base.unshift(q); else break;
    }
    if (!base.length) continue;
    const bh = Math.max(...base.map(q => q.h)), bl = Math.min(...base.map(q => q.l));
    const top = Math.max(...base.map(q => Math.max(q.o, q.c))), bot = Math.min(...base.map(q => Math.min(q.o, q.c)));
    if (up ? b.c <= bh : b.c >= bl) continue;               // the strong candle must close clear of the base
    const z = up ? { type: "demand", low: bl, high: top } : { type: "supply", low: bot, high: bh };
    z.formed = j; z.touches = 0;
    let inside = false, broken = false;
    for (let m = j + 1; m < n; m++) {
      const x = bars[m];
      if (up ? x.c < z.low : x.c > z.high) { broken = true; break; }   // a close through the zone kills it
      if (m < n - 1) {
        const hit = up ? x.l <= z.high : x.h >= z.low;
        if (hit && !inside) z.touches++;
        inside = hit;
      }
    }
    if (!broken && z.touches <= 2) found.push(z);
  }
  found.sort((x, y) => y.formed - x.formed);
  const list = [];
  found.forEach(z => { if (!list.some(k => k.type === z.type && z.low <= k.high && z.high >= k.low)) list.push(z); });
  return { list, atr: atrAt(n - 1) };
}

/* ---------- divergence ---------- */
// A swing low (or high) is a candle whose low (high) is the lowest (highest) of the candles around it.
// It is only confirmed after `right` more candles have closed, so nothing here looks into the future.
function isPivot(bars, p, left, right, isLow) {
  const f = isLow ? "l" : "h", v = bars[p][f];
  if (p - left < 0 || p + right >= bars.length) return false;
  for (let m = p - left; m <= p + right; m++) {
    if (m === p) continue;
    const x = bars[m][f];
    if (isLow ? (m < p ? x <= v : x < v) : (m < p ? x >= v : x > v)) return false;
  }
  return true;
}
// the oscillator's most extreme reading in the three candles around a swing point
function kNear(K, p, isLow) {
  const v = [K[p - 1], K[p], K[p + 1]].filter(x => x != null);
  return v.length ? (isLow ? Math.min(...v) : Math.max(...v)) : null;
}
/*
  Looks for a divergence that is confirmed on the newest candle: the newest swing point is the one
  `pivotRight` candles back, and it is compared with an earlier swing point of the same kind.
  Regular bullish: price makes a lower low, %K makes a higher low (selling is losing strength).
  Regular bearish: price makes a higher high, %K makes a lower high.
  Hidden bullish: price makes a higher low, %K makes a lower low (a pullback in an uptrend is ending). Hidden bearish is the mirror.
*/
function findDivergence(bars, K, c, atr) {
  const d = c.div, L = d.pivotLeft, R = d.pivotRight, i = bars.length - 1, p2 = i - R;
  if (p2 - L < 0) return null;
  for (const isLow of [true, false]) {
    if (!isPivot(bars, p2, L, R, isLow)) continue;
    const f = isLow ? "l" : "h", k2 = kNear(K, p2, isLow), pr2 = bars[p2][f];
    if (k2 == null || (isLow ? k2 > 50 : k2 < 50)) continue;
    for (let p1 = p2 - d.minBars; p1 >= Math.max(L, p2 - d.maxBars); p1--) {
      if (!isPivot(bars, p1, L, R, isLow)) continue;
      const pr1 = bars[p1][f], k1 = kNear(K, p1, isLow);
      if (k1 == null || Math.abs(pr2 - pr1) < d.minPriceAtr * atr) continue;
      let type = null;
      if (isLow) { if (pr2 < pr1 && k2 >= k1 + d.minKDiff) type = "regular"; else if (pr2 > pr1 && k2 <= k1 - d.minKDiff) type = "hidden"; }
      else { if (pr2 > pr1 && k2 <= k1 - d.minKDiff) type = "regular"; else if (pr2 < pr1 && k2 >= k1 + d.minKDiff) type = "hidden"; }
      if (!type || !d.types.includes(type)) continue;
      if (isLow ? Math.min(k1, k2) > c.os : Math.max(k1, k2) < c.ob) continue;          // one of the two readings must reach the extreme zone
      let clean = true;                                                                 // price must not cut through the line joining the two swing points
      for (let m = p1 + 1; m < p2 && clean; m++) {
        const line = pr1 + (pr2 - pr1) * (m - p1) / (p2 - p1);
        if (isLow ? bars[m].l < line : bars[m].h > line) clean = false;
      }
      if (!clean) continue;
      return { kind: type, side: isLow ? "bull" : "bear", i1: p1, i2: p2, t1: bars[p1].t, t2: bars[p2].t, price1: pr1, price2: pr2, k1, k2 };
    }
  }
  return null;
}

/* the trend filter and the zone filter, shared by both signal types */
function applyFilters(out, bars, c, t, zr, recent) {
  const mode = c.trendMode || "with";
  if (out.signal && mode !== "off") {
    const side = out.signal === "bull" ? "Buy" : "Sell", what = c.mode === "divergence" ? "divergence" : "signal";
    if (!t || !t.trending) {
      out.ignored = `${side} ${what} ignored: no clear trend, the market is consolidating (ADX ${t ? t.adx.toFixed(0) : "n/a"}).`;
      out.signal = null;
    } else if (mode === "with" && ((out.signal === "bull" && t.dir !== "up") || (out.signal === "bear" && t.dir !== "down"))) {
      out.ignored = `${side} ${what} ignored: it points against the ${t.label.toLowerCase()}.`;
      out.signal = null;
    }
  }
  const tol = 0.25 * zr.atr, P = out.price, mid = z => (z.low + z.high) / 2;
  const nearest = arr => arr.sort((x, y) => Math.abs(mid(x) - P) - Math.abs(mid(y) - P))[0] || null;
  out.demand = nearest(zr.list.filter(z => z.type === "demand" && mid(z) <= P + tol));
  out.supply = nearest(zr.list.filter(z => z.type === "supply" && mid(z) >= P - tol));
  if (out.signal && c.zones) {
    const want = out.signal === "bull" ? "demand" : "supply";
    const hit = nearest(zr.list.filter(z => z.type === want && recent.some(x => x.l <= z.high + tol && x.h >= z.low - tol)));
    if (!hit) {
      out.ignored = `${out.signal === "bull" ? "Buy" : "Sell"} ${c.mode === "divergence" ? "divergence" : "signal"} ignored: price has not touched a ${want} zone ${c.mode === "divergence" ? "around the second swing point" : "in the last " + c.look + " candles"}.`;
      out.signal = null;
    } else out.hitZone = hit;
  }
}

function evaluate(bars, c) {
  const { K, D } = stoch(bars, c.k, c.s, c.d), i = bars.length - 1;
  if (c.mode === "divergence") {
    if (i < 1 || K[i] == null || D[i] == null) return null;
    const out = { k: K[i], d: D[i], price: bars[i].c, t: bars[i].t, signal: null };
    out.zone = out.k <= c.os ? "Oversold" : out.k >= c.ob ? "Overbought" : "Neutral";
    const t = trendInfo(bars, c.adx), zr = findZones(bars);
    out.trend = t ? t.label : "Ranging";
    out.adx = t ? t.adx : null;
    const dv = findDivergence(bars, K, c, zr.atr);
    if (dv) { out.div = dv; out.signal = dv.side; }
    const recent = dv ? bars.slice(Math.max(0, dv.i2 - c.look + 1), dv.i2 + 1) : [];
    applyFilters(out, bars, c, t, zr, recent);
    return out;
  }
  if (i < 1 || K[i] == null || D[i] == null || K[i - 1] == null || D[i - 1] == null) return null;
  const out = { k: K[i], d: D[i], price: bars[i].c, t: bars[i].t, signal: null };
  if (K[i - 1] <= D[i - 1] && K[i] > D[i] && Math.min(K[i - 1], K[i]) <= c.os) out.signal = "bull";
  if (K[i - 1] >= D[i - 1] && K[i] < D[i] && Math.max(K[i - 1], K[i]) >= c.ob) out.signal = "bear";
  out.zone = out.k <= c.os ? "Oversold" : out.k >= c.ob ? "Overbought" : "Neutral";
  const t = trendInfo(bars, c.adx);
  out.trend = t ? t.label : "Ranging";
  out.adx = t ? t.adx : null;
  applyFilters(out, bars, c, t, findZones(bars), bars.slice(-c.look));
  return out;
}

/* turns config.json into the settings evaluate() takes */
function evOf(config) {
  const st = config.stochastic, dv = config.divergence || {};
  return { mode: config.mode || "crossover", k: st.kPeriod, s: st.slowing, d: st.dPeriod, os: st.oversold, ob: st.overbought,
    adx: config.trend.minAdx, trendMode: config.trend.mode || "with", zones: !!config.zones.required, look: config.zones.lookbackCandles,
    div: { types: dv.types || ["regular"], pivotLeft: dv.pivotLeft || 3, pivotRight: dv.pivotRight || 2, minBars: dv.minBars || 5,
           maxBars: dv.maxBars || 40, minKDiff: dv.minKDiff == null ? 3 : dv.minKDiff, minPriceAtr: dv.minPriceAtr == null ? 0.1 : dv.minPriceAtr } };
}

module.exports = { evaluate, evOf, findDivergence, findZones, trendInfo, stoch };
