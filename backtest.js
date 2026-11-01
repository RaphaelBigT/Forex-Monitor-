#!/usr/bin/env node
"use strict";
/*
  Backtest for the forex stochastic monitor.
  Replays your current rules (config.json) over past candles, one candle at a time, using only
  what was known at that moment. Then it plays each signal forward to see whether a stop or a
  target would have been hit first, and writes a report.
*/
const fs = require("fs");
const path = require("path");
const { evaluate } = require("./signals");
const { mergeConfig, parseT } = require("./monitor");

const TF_MS = { "1h": 36e5, "4h": 144e5, "1day": 864e5 };
const TF_LABEL = { "1h": "1H", "4h": "4H", "1day": "Daily" };
const WINDOW = 200;                       // the live monitor looks at 200 candles, so the backtest does too
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;

const DEFAULTS = {
  candles: 5000,          // history to download per pair (the free Twelve Data limit per request)
  maxHoldCandles: 30,     // close the trade at the market after this many candles
  stopBufferAtr: 0.25,    // stop sits this far beyond the zone, in ATR
  maxRiskAtr: 4,          // skip trades whose stop would be wider than this many ATR
  costAtr: 0.05,          // assumed spread and slippage per trade, in ATR
  targets: [1, 1.5, 2, 3],
  mainTarget: 2
};

/* ---------- data ---------- */
async function getBars(pair, tf, n, key, fetchImpl, now, rateWaitMs) {
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(pair)}&interval=${tf}&outputsize=${n}&timezone=UTC&apikey=${encodeURIComponent(key)}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await fetchImpl(url);
    const d = await r.json();
    if (d.status === "error" || !d.values) {
      const msg = String(d.message || "No candles returned").split(key).join("[key]");
      if (attempt === 0 && /per minute|current minute/i.test(msg)) { await sleep(rateWaitMs); continue; }
      throw new Error(msg);
    }
    const bars = d.values.slice().reverse().map(v => ({ t: v.datetime, o: +v.open, h: +v.high, l: +v.low, c: +v.close }));
    if (now < parseT(bars[bars.length - 1].t) + TF_MS[tf]) bars.pop();   // drop the candle still forming
    return bars;
  }
}

/* ---------- replay and trade simulation ---------- */
function atrOf(win) {
  const trs = win.map((b, i) => i === 0 ? b.h - b.l : Math.max(b.h - b.l, Math.abs(b.h - win[i - 1].c), Math.abs(b.l - win[i - 1].c)));
  return mean(trs.slice(-14));
}
function sessionOf(ms, tf) {
  if (tf === "1day") return "n/a";
  const h = new Date(ms).getUTCHours();
  return h >= 23 || h < 7 ? "Asia" : h < 15 ? "London" : "New York";
}

// Plays one signal forward. Enters at the open of the candle after the signal.
function simulate(bars, i, r, atr, o) {
  const entryBar = bars[i + 1], long = r.signal === "bull", entry = entryBar.o;
  const z = r.hitZone || (long ? r.demand : r.supply);
  const stop = z ? (long ? z.low - o.stopBufferAtr * atr : z.high + o.stopBufferAtr * atr)
                 : (long ? entry - 1.5 * atr : entry + 1.5 * atr);
  const risk = long ? entry - stop : stop - entry;
  if (!(risk > 0)) return { skip: "invalid" };
  if (risk > o.maxRiskAtr * atr) return { skip: "wide" };
  const last = i + o.maxHoldCandles;
  if (last > bars.length - 1) return { skip: "recent" };       // not enough later candles to judge
  const cost = o.costAtr * atr / risk, res = {};
  for (const rr of o.targets) {
    const target = long ? entry + rr * risk : entry - rr * risk;
    let R = null;
    for (let k = i + 1; k <= last && R === null; k++) {
      const c = bars[k], stopHit = long ? c.l <= stop : c.h >= stop, tgtHit = long ? c.h >= target : c.l <= target;
      if (stopHit) R = -1;                                    // if both are hit in one candle, assume the stop came first
      else if (tgtHit) R = rr;
      else if (k === last) R = (long ? c.c - entry : entry - c.c) / risk;
    }
    res[rr] = R - cost;
  }
  const zone = r.hitZone ? (r.hitZone.touches === 0 ? "fresh" : "tested") : "none";
  return { entry, stop, risk, riskAtr: risk / atr, res, zone };
}

function replay(bars, ev, o, tf, pair) {
  const trades = [], skipped = { invalid: 0, wide: 0, recent: 0 };
  for (let i = WINDOW - 1; i < bars.length - 1; i++) {
    const win = bars.slice(i - WINDOW + 1, i + 1);             // only candles up to and including i
    const r = evaluate(win, ev);
    if (!r || !r.signal) continue;
    const sim = simulate(bars, i, r, atrOf(win), o);
    if (sim.skip) { skipped[sim.skip]++; continue; }
    const entryMs = parseT(bars[i + 1].t);
    trades.push({ pair, dir: r.signal === "bull" ? "Buy" : "Sell", signalT: r.t, entryT: bars[i + 1].t, entryMs,
      entry: sim.entry, stop: sim.stop, riskAtr: sim.riskAtr, adx: r.adx, zone: sim.zone, session: sessionOf(entryMs, tf), res: sim.res });
  }
  return { trades, skipped };
}

/* ---------- statistics ---------- */
function stats(rs) {                                           // rs: R results in time order
  const n = rs.length;
  if (!n) return { n: 0 };
  const wins = rs.filter(x => x > 0), losses = rs.filter(x => x <= 0);
  const sw = wins.reduce((a, b) => a + b, 0), sl = Math.abs(losses.reduce((a, b) => a + b, 0));
  let cum = 0, peak = 0, dd = 0, streak = 0, worst = 0;
  rs.forEach(x => { cum += x; peak = Math.max(peak, cum); dd = Math.max(dd, peak - cum); streak = x <= 0 ? streak + 1 : 0; worst = Math.max(worst, streak); });
  return { n, winRate: wins.length / n, avgR: cum / n, totalR: cum, pf: sl ? sw / sl : null, maxDD: dd, maxLosses: worst };
}
const byTime = (a, b) => a.entryMs - b.entryMs;
const rsOf = (trades, rr) => trades.slice().sort(byTime).map(t => t.res[rr]);

/* ---------- report ---------- */
const sg = x => (x >= 0 ? "+" : "") + x.toFixed(2);
const pct = x => (x * 100).toFixed(0) + "%";
const pfS = x => x === null ? "n/a" : x.toFixed(2);
function row(label, s) {
  return s.n ? `| ${label} | ${s.n} | ${pct(s.winRate)} | ${sg(s.avgR)} | ${sg(s.totalR)} | ${pfS(s.pf)} |` : `| ${label} | 0 | - | - | - | - |`;
}
const head = first => `| ${first} | Trades | Win rate | Avg R | Total R | Profit factor |\n|---|---|---|---|---|---|`;
function group(trades, keyFn, rr, order) {
  const keys = order || [...new Set(trades.map(keyFn))].sort();
  return keys.map(k => row(k, stats(rsOf(trades.filter(t => keyFn(t) === k), rr)))).join("\n");
}
const adxBucket = t => t.adx < 25 ? "ADX under 25" : t.adx < 30 ? "ADX 25 to 30" : t.adx < 40 ? "ADX 30 to 40" : "ADX 40 and over";

const VARIANTS = [
  ["Your current rules", {}],
  ["Zones switched off", { zones: false }],
  ["ADX minimum 20", { adx: 20 }],
  ["ADX minimum 30", { adx: 30 }],
  ["ADX minimum 35", { adx: 35 }],
  ["Zone touched within 5 candles", { look: 5 }],
  ["Stochastic levels 30 and 70", { os: 30, ob: 70 }],
  ["Classic stochastic 14, 3, 3", { k: 14 }]
];

function buildReport(ctx) {
  const { tf, o, data, current, variantRows, baseEv } = ctx, main = o.mainTarget;
  const tfl = TF_LABEL[tf], all = current.all, L = [];
  L.push(`# Backtest: ${tfl} candles`, "");
  L.push("## Data", "");
  data.forEach(d => L.push(`- ${d.pair}: ${d.n} candles, ${d.from} to ${d.to}${d.error ? " (" + d.error + ")" : ""}`));
  L.push("", "## Rules tested", "",
    `- Stochastic ${baseEv.k}, ${baseEv.s}, ${baseEv.d}, levels ${baseEv.os} and ${baseEv.ob}`,
    `- Trending market only: ADX at least ${baseEv.adx}, price on one side of the 20 and 50 averages, signal in the trend direction`,
    `- Zones: ${baseEv.zones ? `price must have touched a supply or demand zone in the last ${baseEv.look} candles` : "not required"}`,
    "- Each signal uses only candles that had already closed when the signal appeared.", "",
    "## How each trade is played", "",
    "- Entry at the open of the candle after the signal.",
    `- Stop ${o.stopBufferAtr} ATR beyond the zone. Trades with a stop wider than ${o.maxRiskAtr} ATR are skipped.`,
    `- Target at ${o.targets.join(", ")} times the risk (R). Each target is tested separately on the same trades.`,
    `- Closed at the market price after ${o.maxHoldCandles} candles if neither is hit.`,
    "- If a candle touches both the stop and the target, the stop is assumed to have been hit first.",
    `- Cost of ${o.costAtr} ATR per trade is subtracted for spread and slippage.`,
    "- The news filter is not included, because there is no free history of past news. The live monitor skips some trades this test counts.", "");

  if (!all.length) {
    L.push("## Result", "", "The current rules produced no completed trades in this data. Try the \"Zones switched off\" row below, or a longer or different timeframe.", "");
  } else {
    L.push(`## Results for your current rules (${all.length} trades)`, "", head("Target"));
    o.targets.forEach(rr => L.push(row(`${rr}R target`, stats(rsOf(all, rr)))));
    L.push("", `R means one unit of risk. A result of +0.30 average R means you gained 0.3 times your risk per trade. Max drawdown at ${main}R: ${stats(rsOf(all, main)).maxDD.toFixed(1)}R. Longest losing run: ${stats(rsOf(all, main)).maxLosses} trades.`, "");
    L.push(`## Where it worked and where it did not (${main}R target)`, "");
    L.push("**By pair**", "", head("Pair"), group(all, t => t.pair, main), "");
    L.push("**By direction**", "", head("Direction"), group(all, t => t.dir, main), "");
    L.push("**By trend strength**", "", head("Trend strength"), group(all, adxBucket, main), "");
    L.push("**By zone**", "", head("Zone"), group(all, t => t.zone, main), "");
    if (tf !== "1day") L.push("**By session of entry**", "", head("Session"), group(all, t => t.session, main), "");
    const mid = (ctx.firstMs + ctx.lastMs) / 2;
    L.push("**Is it consistent over time?**", "", head("Period"),
      row("First half of the data", stats(rsOf(all.filter(t => t.entryMs < mid), main))),
      row("Second half of the data", stats(rsOf(all.filter(t => t.entryMs >= mid), main))), "");
  }
  L.push(`## What if the rules were different? (${main}R target)`, "", head("Variation"), ...variantRows, "");
  L.push("## How to read this", "");
  const n = all.length, s = stats(rsOf(all, main));
  if (n < 30) L.push(`- Only ${n} trades. That is too few to trust. A lucky or unlucky streak can look like a pattern. Use the rows with more trades, a longer history or more pairs before drawing conclusions.`);
  if (n >= 30 && s.avgR <= 0) L.push("- The current rules lost money after costs on this history. Do not trade them live until a version of them holds up.");
  if (n >= 30 && s.avgR > 0) L.push("- The current rules were profitable after costs on this history. That is encouraging, not proof. Check the two halves and the pairs above for consistency.");
  L.push("- Choosing the best row from many variations will flatter the result, because some will win by chance. If you change a rule because of this table, test the change again on a different timeframe or pair.",
    "- Past results do not promise future results. Practise on a demo account first.");
  return L.join("\n") + "\n";
}

/* ---------- run ---------- */
async function runBacktest({ config, bt, tf, key, fetchImpl, now, log, rateWaitMs = 61000, pauseMs = 1200 }) {
  const o = { ...DEFAULTS, ...bt };
  if (!o.targets.includes(o.mainTarget)) o.targets.push(o.mainTarget);
  const baseEv = { k: config.stochastic.kPeriod, s: config.stochastic.slowing, d: config.stochastic.dPeriod, os: config.stochastic.oversold,
    ob: config.stochastic.overbought, adx: config.trend.minAdx, zones: !!config.zones.required, look: config.zones.lookbackCandles };

  const data = [], series = [];
  for (let p = 0; p < config.pairs.length; p++) {
    const pair = config.pairs[p];
    if (p) await sleep(pauseMs);
    try {
      const bars = await getBars(pair, tf, o.candles, key, fetchImpl, now, rateWaitMs);
      if (bars.length < WINDOW + o.maxHoldCandles + 20) throw new Error("only " + bars.length + " candles came back, too few to test");
      series.push({ pair, bars });
      data.push({ pair, n: bars.length, from: bars[0].t.slice(0, 10), to: bars[bars.length - 1].t.slice(0, 10) });
      log(`${pair}: ${bars.length} candles loaded.`);
    } catch (e) { data.push({ pair, n: 0, from: "-", to: "-", error: e.message }); log(`${pair}: ERROR ${e.message}`); }
  }
  if (!series.length) throw new Error("No price history could be loaded. " + (data[0] && data[0].error ? data[0].error : ""));

  const firstMs = Math.min(...series.map(s => parseT(s.bars[WINDOW].t))), lastMs = Math.max(...series.map(s => parseT(s.bars[s.bars.length - 1].t)));
  const variantRows = []; let current = null;
  for (const [label, patch] of VARIANTS) {
    const ev = { ...baseEv, ...patch }, all = [];
    for (const s of series) all.push(...replay(s.bars, ev, o, tf, s.pair).trades);
    if (!current) current = { all };
    variantRows.push(row(label, stats(rsOf(all, o.mainTarget))));
    log(`${label}: ${all.length} trades.`);
  }
  const csv = ["pair,direction,signal_candle,entry_candle,entry,stop,risk_atr,adx,zone,session," + o.targets.map(r => "R_at_" + r + "x").join(",")]
    .concat(current.all.slice().sort(byTime).map(t => [t.pair, t.dir, t.signalT, t.entryT, t.entry.toFixed(5), t.stop.toFixed(5), t.riskAtr.toFixed(2), t.adx.toFixed(0), t.zone, t.session,
      ...o.targets.map(r => t.res[r].toFixed(2))].join(","))).join("\n") + "\n";
  const report = buildReport({ tf, o, data, current, variantRows, baseEv, firstMs, lastMs });
  return { report, csv };
}

async function main() {
  const dir = __dirname, log = m => console.log(m);
  if (!process.env.TWELVE_DATA_KEY) { console.error("Missing TWELVE_DATA_KEY. Add it as a repository secret."); process.exit(1); }
  let raw, config;
  try {
    raw = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));
    const own = raw.backtest && Array.isArray(raw.backtest.pairs) ? raw.backtest.pairs : null;   // optional: test more pairs than you watch live
    config = mergeConfig(own ? { ...raw, pairs: own } : raw);
  }
  catch (e) { console.error("Problem with config.json: " + e.message); process.exit(1); }
  const tf = process.env.BT_TIMEFRAME || config.timeframe;
  if (!TF_MS[tf]) { console.error("Timeframe must be 1h, 4h or 1day."); process.exit(1); }
  try {
    const { report, csv } = await runBacktest({ config, bt: (raw && raw.backtest) || {}, tf, key: process.env.TWELVE_DATA_KEY, fetchImpl: fetch, now: Date.now(), log });
    const out = path.join(dir, "backtest"); fs.mkdirSync(out, { recursive: true });
    const stem = "report-" + tf;
    fs.writeFileSync(path.join(out, stem + ".md"), report);
    fs.writeFileSync(path.join(out, "trades-" + tf + ".csv"), csv);
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
    console.log("\n" + report);
  } catch (e) { console.error("Backtest failed: " + String(e.message).split(process.env.TWELVE_DATA_KEY).join("[key]")); process.exit(1); }
}

if (require.main === module) main();
module.exports = { simulate, replay, stats, runBacktest, DEFAULTS, WINDOW };
