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

function evaluate(bars, c) {
  const { K, D } = stoch(bars, c.k, c.s, c.d), i = bars.length - 1;
  if (i < 1 || K[i] == null || D[i] == null || K[i - 1] == null || D[i - 1] == null) return null;
  const out = { k: K[i], d: D[i], price: bars[i].c, t: bars[i].t, signal: null };
  if (K[i - 1] <= D[i - 1] && K[i] > D[i] && Math.min(K[i - 1], K[i]) <= c.os) out.signal = "bull";
  if (K[i - 1] >= D[i - 1] && K[i] < D[i] && Math.max(K[i - 1], K[i]) >= c.ob) out.signal = "bear";
  out.zone = out.k <= c.os ? "Oversold" : out.k >= c.ob ? "Overbought" : "Neutral";
  const t = trendInfo(bars, c.adx);
  out.trend = t ? t.label : "Ranging";
  out.adx = t ? t.adx : null;
  if (out.signal) {
    const side = out.signal === "bull" ? "Buy" : "Sell";
    if (!t || !t.trending) {
      out.ignored = `${side} signal ignored: no clear trend, the market is consolidating (ADX ${t ? t.adx.toFixed(0) : "n/a"}).`;
      out.signal = null;
    } else if ((out.signal === "bull" && t.dir !== "up") || (out.signal === "bear" && t.dir !== "down")) {
      out.ignored = `${side} signal ignored: it points against the ${t.label.toLowerCase()}.`;
      out.signal = null;
    }
  }
  const zr = findZones(bars), tol = 0.25 * zr.atr, P = out.price, mid = z => (z.low + z.high) / 2;
  const nearest = arr => arr.sort((x, y) => Math.abs(mid(x) - P) - Math.abs(mid(y) - P))[0] || null;
  out.demand = nearest(zr.list.filter(z => z.type === "demand" && mid(z) <= P + tol));
  out.supply = nearest(zr.list.filter(z => z.type === "supply" && mid(z) >= P - tol));
  if (out.signal && c.zones) {
    const want = out.signal === "bull" ? "demand" : "supply", recent = bars.slice(-c.look);
    const hit = nearest(zr.list.filter(z => z.type === want && recent.some(x => x.l <= z.high + tol && x.h >= z.low - tol)));
    if (!hit) {
      out.ignored = `${out.signal === "bull" ? "Buy" : "Sell"} signal ignored: price has not touched a ${want} zone in the last ${c.look} candles.`;
      out.signal = null;
    } else out.hitZone = hit;
  }
  return out;
}


module.exports = { evaluate, findZones, trendInfo, stoch };
