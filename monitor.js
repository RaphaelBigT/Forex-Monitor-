#!/usr/bin/env node
"use strict";
/*
  Forex stochastic monitor.
  Runs on a schedule (GitHub Actions), checks your pairs and sends a phone alert through ntfy
  when the stochastic shows a divergence (or, if you switch the mode, a crossover) in a trending
  market, at a supply or demand zone, with no high-impact news close by.
*/
const fs = require("fs");
const path = require("path");
const { evaluate, evOf } = require("./signals");

const TF_MS = { "1h": 36e5, "4h": 144e5, "1day": 864e5 };
const TF_LABEL = { "1h": "1H", "4h": "4H", "1day": "Daily" };
const CAL_URL = "https://nfs.faireconomy.media/ff_calendar_";
const CAL_NOTE = " The news calendar was unavailable, so check Forex Factory before trading.";
const sleep = ms => new Promise(r => setTimeout(r, ms));

const DEFAULTS = {
  pairs: ["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD"],
  timeframe: "4h",
  mode: "divergence",
  divergence: { types: ["regular"], pivotLeft: 3, pivotRight: 2, minBars: 5, maxBars: 40, minKDiff: 3, minPriceAtr: 0.1 },
  stochastic: { kPeriod: 5, dPeriod: 3, slowing: 3, oversold: 20, overbought: 80 },
  trend: { minAdx: 25, mode: "trending" },
  zones: { required: true, lookbackCandles: 3 },
  news: { enabled: true, minutesBefore: 60, minutesAfter: 30 },
  notify: { priority: 4, results: true },
  skipWeekends: true
};

/* ---------- config ---------- */
function mergeConfig(user) {
  const out = {};
  for (const k of Object.keys(DEFAULTS)) {
    const d = DEFAULTS[k], u = user ? user[k] : undefined;
    out[k] = u === undefined ? d : (d && typeof d === "object" && !Array.isArray(d) ? { ...d, ...u } : u);
  }
  if (!Array.isArray(out.pairs) || !out.pairs.length || out.pairs.length > 10) throw new Error("config.json: 'pairs' needs between 1 and 10 pairs.");
  out.pairs.forEach(p => { if (!/^[A-Z]{3}\/[A-Z]{3}$/.test(p)) throw new Error(`config.json: '${p}' is not a pair written like EUR/USD.`); });
  if (!TF_MS[out.timeframe]) throw new Error("config.json: 'timeframe' must be 1h, 4h or 1day.");
  if (!["divergence", "crossover"].includes(out.mode)) throw new Error("config.json: 'mode' must be divergence or crossover.");
  if (!["off", "trending", "with"].includes(out.trend.mode)) throw new Error("config.json: trend.mode must be off, trending or with.");
  const dv = out.divergence;
  if (!Array.isArray(dv.types) || !dv.types.length || dv.types.some(t => !["regular", "hidden"].includes(t))) throw new Error("config.json: divergence.types must list regular and/or hidden.");
  ["pivotLeft", "pivotRight", "minBars", "maxBars"].forEach(k => { if (!(Number.isInteger(dv[k]) && dv[k] >= 1 && dv[k] <= 100)) throw new Error(`config.json: divergence.${k} must be a whole number from 1 to 100.`); });
  if (dv.minBars <= dv.pivotRight || dv.minBars >= dv.maxBars) throw new Error("config.json: divergence.minBars must be above pivotRight and below maxBars.");
  if (dv.maxBars + dv.pivotLeft + dv.pivotRight > 150) throw new Error("config.json: divergence.maxBars is too large for the 200 candles the monitor reads.");
  const pr = Number(out.notify.priority);
  if (!(pr >= 1 && pr <= 5)) throw new Error("config.json: notify.priority must be a number from 1 to 5.");
  out.notify.priority = pr;
  return out;
}

/* ---------- time ---------- */
const parseT = t => t.length === 10 ? Date.parse(t + "T00:00:00Z") : Date.parse(t.replace(" ", "T") + "Z");
function marketClosed(ms) {            // forex is shut from Friday night to Sunday evening (UTC)
  const d = new Date(ms), day = d.getUTCDay(), m = d.getUTCHours() * 60 + d.getUTCMinutes();
  return day === 6 || (day === 5 && m >= 23 * 60 + 30) || (day === 0 && m < 21 * 60);
}
const scrub = (msg, key) => { let s = String(msg || "Request failed"); if (key) s = s.split(key).join("[key]"); return s; };

/* ---------- prices ---------- */
async function fetchBars(pair, tf, key, fetchImpl, now, rateWaitMs) {
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(pair)}&interval=${tf}&outputsize=200&timezone=UTC&apikey=${encodeURIComponent(key)}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await fetchImpl(url);
    const d = await r.json();
    if (d.status === "error" || !d.values) {
      const msg = d.message || "No candles returned";
      if (attempt === 0 && /per minute|current minute/i.test(msg)) { await sleep(rateWaitMs); continue; }
      throw new Error(msg);
    }
    const bars = d.values.slice().reverse().map(v => ({ t: v.datetime, o: +v.open, h: +v.high, l: +v.low, c: +v.close }));
    const last = bars[bars.length - 1];
    if (now < parseT(last.t) + TF_MS[tf]) bars.pop();          // drop the candle that is still forming
    return bars;
  }
}

/* ---------- news ---------- */
const curOf = pair => pair.startsWith("XAU") ? ["USD"] : pair.split("/");
function fmtIn(ms) {
  const m = Math.max(0, Math.round(ms / 6e4));
  if (m < 60) return m + " min";
  const h = Math.floor(m / 60);
  return h < 24 ? h + "h " + (m % 60) + "m" : Math.floor(h / 24) + "d " + (h % 24) + "h";
}
async function loadCalendar(state, now, fetchImpl, log) {
  const c = state.calendar;
  if (c && now - c.fetchedAt < 6 * 36e5 && now <= c.maxT) return { ok: true, events: c.events };
  try {
    const get = u => fetchImpl(u).then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
    const [a, b] = await Promise.allSettled([get(CAL_URL + "thisweek.json"), get(CAL_URL + "nextweek.json")]);
    if (a.status !== "fulfilled" || !Array.isArray(a.value)) throw new Error(a.reason ? a.reason.message : "unexpected calendar format");
    const all = a.value.concat(b.status === "fulfilled" && Array.isArray(b.value) ? b.value : []);
    const times = all.map(e => Date.parse(e.date)).filter(x => !isNaN(x));
    const events = all.filter(e => e.impact === "High").map(e => ({ t: Date.parse(e.date), cur: e.country, title: e.title })).filter(e => !isNaN(e.t));
    state.calendar = { fetchedAt: now, maxT: Math.max(...times), events };
    return { ok: true, events };
  } catch (e) {
    log("Calendar fetch failed: " + e.message);
    if (c && now <= c.maxT + 12 * 36e5) return { ok: true, events: c.events, stale: true };
    return { ok: false, events: [] };
  }
}
function newsBlock(pair, n, events, now) {
  const cur = curOf(pair);
  const e = events.filter(x => cur.includes(x.cur) && x.t - now <= n.minutesBefore * 6e4 && now - x.t <= n.minutesAfter * 6e4).sort((x, y) => x.t - y.t)[0];
  if (!e) return null;
  return e.t >= now
    ? `high-impact news, ${e.cur} ${e.title}, in ${fmtIn(e.t - now)}.`
    : `high-impact news, ${e.cur} ${e.title}, came out ${fmtIn(now - e.t)} ago and the market may still be volatile.`;
}

/* ---------- message ---------- */
const fx = (v, price) => v.toFixed(price >= 500 ? 2 : price >= 50 ? 3 : 5);
const zoneAge = z => z.touches ? "tested " + z.touches + "x" : "fresh";
function buildText(r) {
  const z = r.hitZone;
  const zone = z ? ` Price reacted at a ${z.type} zone, ${fx(z.low, r.price)} to ${fx(z.high, r.price)} (${zoneAge(z)}).` : "";
  const dv = r.div;
  if (dv) {
    const bull = dv.side === "bull", p = v => fx(v, r.price), k = v => v.toFixed(0);
    const how = dv.kind === "regular"
      ? (bull ? `Price made a lower low (${p(dv.price1)} then ${p(dv.price2)}) but %K made a higher low (${k(dv.k1)} then ${k(dv.k2)}), so selling pressure is fading.`
              : `Price made a higher high (${p(dv.price1)} then ${p(dv.price2)}) but %K made a lower high (${k(dv.k1)} then ${k(dv.k2)}), so buying pressure is fading.`)
      : (bull ? `Price made a higher low (${p(dv.price1)} then ${p(dv.price2)}) but %K made a lower low (${k(dv.k1)} then ${k(dv.k2)}), so the pullback looks finished.`
              : `Price made a lower high (${p(dv.price1)} then ${p(dv.price2)}) but %K made a higher high (${k(dv.k1)} then ${k(dv.k2)}), so the bounce looks finished.`);
    return `${bull ? "Bullish" : "Bearish"} ${dv.kind} divergence. ${how} Market: ${r.trend} (ADX ${r.adx.toFixed(0)}). The ${bull ? "swing low" : "swing high"} is ${p(dv.price2)}, the usual place for a stop is just beyond it.${zone}`;
  }
  const base = r.signal === "bull"
    ? `${r.trend} (ADX ${r.adx.toFixed(0)}). The pullback looks over: %K crossed above %D from the oversold zone (K ${r.k.toFixed(1)}, D ${r.d.toFixed(1)}).`
    : `${r.trend} (ADX ${r.adx.toFixed(0)}). The bounce looks over: %K crossed below %D from the overbought zone (K ${r.k.toFixed(1)}, D ${r.d.toFixed(1)}).`;
  return base + zone;
}
/* ---------- results log ----------
   Every divergence alert is followed forward with the same rules as the backtest (entry at the next candle's open,
   stop just beyond the second swing point, target 2R, closed after 30 candles), so the live results can be compared
   with the backtest. Nothing here places a trade. */
const TRACK = { target: 2, maxHold: 30, bufferAtr: 0.25, maxRiskAtr: 4, costAtr: 0.05 };
function atr14(bars) {
  const trs = bars.map((b, i) => i === 0 ? b.h - b.l : Math.max(b.h - b.l, Math.abs(b.h - bars[i - 1].c), Math.abs(b.l - bars[i - 1].c))).slice(-14);
  return trs.reduce((x, y) => x + y, 0) / trs.length;
}
function resolveTrade(t, bars) {
  const k = bars.findIndex(b => b.t === t.signalT);
  if (k < 0) return { status: "lost", how: "the alert candle is no longer in the data" };
  const e = bars[k + 1];
  if (!e) return { status: "open" };
  const long = t.side === "bull", entry = e.o, stop = t.stop, risk = long ? entry - stop : stop - entry;
  if (!(risk > 0)) return { status: "skipped", how: "the stop would be on the wrong side of the entry price" };
  if (risk > TRACK.maxRiskAtr * t.atr) return { status: "skipped", how: "the stop would be wider than " + TRACK.maxRiskAtr + " average candle ranges" };
  const target = long ? entry + TRACK.target * risk : entry - TRACK.target * risk, last = k + TRACK.maxHold;
  for (let m = k + 1; m <= Math.min(last, bars.length - 1); m++) {
    const c = bars[m];
    let R = null, how;
    if (long ? c.l <= stop : c.h >= stop) { const fill = long ? Math.min(stop, c.o) : Math.max(stop, c.o); R = (long ? fill - entry : entry - fill) / risk; how = "stopped out"; }
    else if (long ? c.h >= target : c.l <= target) { R = TRACK.target; how = "target hit"; }
    else if (m === last) { R = (long ? c.c - entry : entry - c.c) / risk; how = "closed after " + TRACK.maxHold + " candles"; }
    if (R !== null) return { status: "closed", R: R - TRACK.costAtr * t.atr / risk, how, entry, closedT: c.t };
  }
  return { status: "open" };
}
const sgn = x => (x >= 0 ? "+" : "") + x.toFixed(2);
function tallyText(trades) {
  const c = trades.filter(t => t.status === "closed"), n = c.length, tot = c.reduce((a, t) => a + t.R, 0);
  return `Closed alerts so far: ${n}, won ${c.filter(t => t.R > 0).length}, average ${sgn(tot / n)}R, total ${sgn(tot)}R.`;
}
async function updateTrades(state, pair, tf, bars, config, notify, log) {
  for (const t of state.trades) {
    if (t.pair !== pair || t.tf !== tf || t.status !== "open") continue;
    const x = resolveTrade(t, bars);
    if (x.status === "open") continue;
    Object.assign(t, x);
    log(`${pair}: tracked alert from ${t.signalT} UTC is ${x.status}${x.R === undefined ? " (" + x.how + ")" : ", " + x.how + " at " + sgn(x.R) + "R"}.`);
    if (x.status === "closed" && config.notify.results) {
      try {
        await notify({ title: `Result: ${pair} ${TF_LABEL[tf]} ${t.side === "bull" ? "Buy" : "Sell"} alert`,
          message: `The alert from ${t.signalT} UTC was ${x.how} at ${sgn(x.R)}R (entry ${fx(x.entry, x.entry)}, stop ${fx(t.stop, x.entry)}, 2R target). ${tallyText(state.trades)} This is a record of what the alert would have done, not a trade.`,
          priority: 2, tags: [x.R > 0 ? "white_check_mark" : "x"] });
      } catch (e) { log("Could not send the result notice: " + e.message); }
    }
  }
}

const tvSymbol = pair => pair.startsWith("XAU") ? "OANDA:XAUUSD" : "FX:" + pair.replace("/", "");

async function sendNtfy(server, topic, n, fetchImpl) {
  const body = { topic, title: n.title, message: n.message, priority: n.priority, tags: n.tags };
  if (n.click) body.click = n.click;
  const r = await fetchImpl(server, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error("ntfy returned HTTP " + r.status);
}

/* ---------- one run ---------- */
async function run({ config, state, env, fetchImpl, now, log, test, rateWaitMs = 61000, pauseMs = 8000 }) {
  const res = { sent: 0, errors: [] };
  const server = env.NTFY_SERVER || "https://ntfy.sh";
  const notify = n => sendNtfy(server, env.NTFY_TOPIC, n, fetchImpl);
  state.seen = state.seen || []; state.pairs = state.pairs || {}; state.trades = state.trades || [];

  if (test) {
    await notify({ title: "Forex monitor test", message: "Your alerts are working. This is how a signal will arrive on your phone.", priority: config.notify.priority, tags: ["white_check_mark"] });
    res.sent++; log("Test notification sent."); return res;
  }
  if (config.skipWeekends && marketClosed(now)) { log("Market is closed. Nothing to do."); return res; }

  const tf = config.timeframe, tfMs = TF_MS[tf], tfLabel = TF_LABEL[tf];
  const freshMs = Math.min(90, (tfMs / 6e4) * 0.75) * 6e4;           // ignore signals on candles that closed long ago
  const ev = evOf(config);
  const stateOf = p => state.pairs[p] && state.pairs[p].tf === tf ? state.pairs[p] : null;

  // only fetch a pair when a new closed candle should exist, so the free data limit is barely touched
  const due = config.pairs.filter(p => { const ps = stateOf(p); return !ps || !ps.last || now >= ps.last + 2 * tfMs; });
  if (!due.length) { log("No new candle is due yet."); return res; }

  let calP; const getCal = () => calP || (calP = loadCalendar(state, now, fetchImpl, log));
  let attempted = 0, failed = 0;

  for (const pair of due) {
    if (attempted++) await sleep(pauseMs);
    try {
      const bars = await fetchBars(pair, tf, env.TWELVE_DATA_KEY, fetchImpl, now, rateWaitMs);
      if (bars.length < 60) throw new Error("Not enough candles came back (" + bars.length + ")");
      const startMs = parseT(bars[bars.length - 1].t), ps = stateOf(pair);
      if (ps && ps.last && startMs <= ps.last) { log(`${pair}: no new ${tfLabel} candle yet.`); continue; }
      await updateTrades(state, pair, tf, bars, config, notify, log);
      const r = evaluate(bars, ev);
      if (!r) throw new Error("Not enough data for the indicators");
      log(`${pair} ${tfLabel} ${r.t} UTC | ${r.trend} ADX ${r.adx == null ? "-" : r.adx.toFixed(0)} | K ${r.k.toFixed(1)} D ${r.d.toFixed(1)} | ${r.signal ? "SIGNAL " + r.signal : (r.ignored || "no signal")}`);

      if (r.signal) {
        const id = `${pair}|${tf}|${r.t}|${r.signal}${r.div ? "|" + r.div.kind : ""}`;
        const side = r.signal === "bull" ? "Buy" : "Sell";
        if (state.seen.includes(id)) log(`${pair}: already alerted for this candle.`);
        else if (now - (startMs + tfMs) > freshMs) log(`${pair}: signal is too old to act on, skipped.`);
        else {
          let note = "", blocked = null;
          if (config.news.enabled) {
            const cal = await getCal();
            if (cal.ok) blocked = newsBlock(pair, config.news, cal.events, now); else note = CAL_NOTE;
          }
          if (blocked) { state.seen.push(id); log(`${pair}: ${side} signal ignored: ${blocked}`); }
          else {
            await notify({
              title: r.div ? `${pair} ${tfLabel}: ${r.div.side === "bull" ? "Bullish" : "Bearish"} divergence` : `${pair} ${tfLabel}: ${side} signal`,
              message: `${buildText(r)} Price ${fx(r.price, r.price)}. Candle ${r.t} UTC.${note} Check the chart before trading.`,
              priority: config.notify.priority,
              tags: [r.signal === "bull" ? "chart_with_upwards_trend" : "chart_with_downwards_trend"],
              click: "https://www.tradingview.com/chart/?symbol=" + encodeURIComponent(tvSymbol(pair))
            });
            state.seen.push(id); res.sent++;
            log(`${pair}: ${side} alert sent.`);
            if (r.div) {
              const a = atr14(bars);
              state.trades.push({ id, pair, tf, side: r.signal, kind: r.div.kind, signalT: r.t, atr: a, status: "open",
                stop: r.signal === "bull" ? r.div.price2 - TRACK.bufferAtr * a : r.div.price2 + TRACK.bufferAtr * a });
            }
          }
        }
      }
      state.pairs[pair] = { tf, last: startMs };              // only after everything above worked, so a failed send is retried
    } catch (e) {
      failed++; res.errors.push(`${pair}: ${scrub(e.message, env.TWELVE_DATA_KEY)}`);
      log(`${pair}: ERROR ${scrub(e.message, env.TWELVE_DATA_KEY)}`);
    }
  }
  if (state.seen.length > 300) state.seen = state.seen.slice(-300);
  const open = state.trades.filter(t => t.status === "open"), done = state.trades.filter(t => t.status !== "open");
  state.trades = done.slice(-400).concat(open);

  if (attempted > 0 && failed === attempted) {                // everything failed: tell the user, at most twice a day
    if (!state.lastError || now - state.lastError > 12 * 36e5) {
      try {
        await notify({ title: "Forex monitor problem", message: `The monitor could not read prices. ${res.errors[0]}`, priority: 3, tags: ["warning"] });
        state.lastError = now;
      } catch (e) { log("Could not send the problem notice: " + e.message); }
    }
  } else if (failed < attempted && state.lastError) delete state.lastError;
  return res;
}

/* ---------- entry point ---------- */
async function main() {
  const test = process.argv.includes("--test");
  const dir = __dirname, log = m => console.log(m);
  const need = (name, where) => { if (!process.env[name]) { console.error(`Missing ${name}. Add it as a repository secret (${where}).`); process.exit(1); } };
  need("NTFY_TOPIC", "Settings, Secrets and variables, Actions");
  if (!test) need("TWELVE_DATA_KEY", "Settings, Secrets and variables, Actions");

  let config;
  try { config = mergeConfig(JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"))); }
  catch (e) { console.error("Problem with config.json: " + e.message); process.exit(1); }

  const stateFile = path.join(dir, "state.json");
  let oldText = "", state = {};
  try { oldText = fs.readFileSync(stateFile, "utf8"); state = JSON.parse(oldText) || {}; } catch (e) { state = {}; }

  let res, crashed = null;
  try { res = await run({ config, state, env: process.env, fetchImpl: fetch, now: Date.now(), log, test }); }
  catch (e) { crashed = e; }

  const newText = JSON.stringify(state, null, 1) + "\n";
  if (newText !== oldText && !test) fs.writeFileSync(stateFile, newText);
  if (crashed) { console.error("Run failed: " + scrub(crashed.message, process.env.TWELVE_DATA_KEY)); process.exit(1); }
  if (res.errors.length) process.exit(1);
}

if (require.main === module) main();
module.exports = { run, mergeConfig, marketClosed, newsBlock, fetchBars, parseT, resolveTrade, tallyText };
