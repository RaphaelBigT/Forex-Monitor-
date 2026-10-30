#!/usr/bin/env node
"use strict";
/*
  Forex stochastic monitor.
  Runs on a schedule (GitHub Actions), checks your pairs and sends a phone alert through ntfy
  when the stochastic gives a signal in a trending market, from a supply or demand zone,
  with no high-impact news close by.
*/
const fs = require("fs");
const path = require("path");
const { evaluate } = require("./signals");

const TF_MS = { "1h": 36e5, "4h": 144e5, "1day": 864e5 };
const TF_LABEL = { "1h": "1H", "4h": "4H", "1day": "Daily" };
const CAL_URL = "https://nfs.faireconomy.media/ff_calendar_";
const CAL_NOTE = " The news calendar was unavailable, so check Forex Factory before trading.";
const sleep = ms => new Promise(r => setTimeout(r, ms));

const DEFAULTS = {
  pairs: ["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD"],
  timeframe: "4h",
  stochastic: { kPeriod: 5, dPeriod: 3, slowing: 3, oversold: 20, overbought: 80 },
  trend: { minAdx: 25 },
  zones: { required: true, lookbackCandles: 3 },
  news: { enabled: true, minutesBefore: 60, minutesAfter: 30 },
  notify: { priority: 4 },
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
  const base = r.signal === "bull"
    ? `${r.trend} (ADX ${r.adx.toFixed(0)}). The pullback looks over: %K crossed above %D from the oversold zone (K ${r.k.toFixed(1)}, D ${r.d.toFixed(1)}).`
    : `${r.trend} (ADX ${r.adx.toFixed(0)}). The bounce looks over: %K crossed below %D from the overbought zone (K ${r.k.toFixed(1)}, D ${r.d.toFixed(1)}).`;
  const z = r.hitZone;
  const zone = z ? ` Price reacted at a ${z.type} zone, ${fx(z.low, r.price)} to ${fx(z.high, r.price)} (${zoneAge(z)}).` : "";
  return base + zone;
}
const tvSymbol = pair => pair.startsWith("XAU") ? "OANDA:XAUUSD" : "FX:" + pair.replace("/", "");

async function sendNtfy(server, topic, n, fetchImpl) {
  const body = { topic, title: n.title, message: n.message, priority: n.priority, tags: n.tags };
  if (n.click) body.click = n.click;
  const r = await fetchImpl(server, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error("ntfy returned HTTP " + r.status);
}

/* ---------- one run ---------- */
async function run({ config, state, env, fetchImpl, now, log, test, rateWaitMs = 61000, pauseMs = 1000 }) {
  const res = { sent: 0, errors: [] };
  const server = env.NTFY_SERVER || "https://ntfy.sh";
  const notify = n => sendNtfy(server, env.NTFY_TOPIC, n, fetchImpl);
  state.seen = state.seen || []; state.pairs = state.pairs || {};

  if (test) {
    await notify({ title: "Forex monitor test", message: "Your alerts are working. This is how a signal will arrive on your phone.", priority: config.notify.priority, tags: ["white_check_mark"] });
    res.sent++; log("Test notification sent."); return res;
  }
  if (config.skipWeekends && marketClosed(now)) { log("Market is closed. Nothing to do."); return res; }

  const tf = config.timeframe, tfMs = TF_MS[tf], tfLabel = TF_LABEL[tf];
  const freshMs = Math.min(90, (tfMs / 6e4) * 0.75) * 6e4;           // ignore signals on candles that closed long ago
  const ev = { k: config.stochastic.kPeriod, s: config.stochastic.slowing, d: config.stochastic.dPeriod, os: config.stochastic.oversold, ob: config.stochastic.overbought,
               adx: config.trend.minAdx, zones: !!config.zones.required, look: config.zones.lookbackCandles };
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
      const r = evaluate(bars, ev);
      if (!r) throw new Error("Not enough data for the indicators");
      log(`${pair} ${tfLabel} ${r.t} UTC | ${r.trend} ADX ${r.adx == null ? "-" : r.adx.toFixed(0)} | K ${r.k.toFixed(1)} D ${r.d.toFixed(1)} | ${r.signal ? "SIGNAL " + r.signal : (r.ignored || "no signal")}`);

      if (r.signal) {
        const id = `${pair}|${tf}|${r.t}|${r.signal}`;
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
              title: `${pair} ${tfLabel}: ${side} signal`,
              message: `${buildText(r)} Price ${fx(r.price, r.price)}. Candle ${r.t} UTC.${note} Check the chart before trading.`,
              priority: config.notify.priority,
              tags: [r.signal === "bull" ? "chart_with_upwards_trend" : "chart_with_downwards_trend"],
              click: "https://www.tradingview.com/chart/?symbol=" + encodeURIComponent(tvSymbol(pair))
            });
            state.seen.push(id); res.sent++;
            log(`${pair}: ${side} alert sent.`);
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
module.exports = { run, mergeConfig, marketClosed, newsBlock, fetchBars, parseT };
