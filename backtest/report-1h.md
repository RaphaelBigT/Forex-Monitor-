# Backtest: 1H candles

## Data

- EUR/USD: 4999 candles, 2026-04-07 to 2026-11-02
- GBP/USD: 4999 candles, 2026-04-07 to 2026-11-02
- USD/JPY: 4999 candles, 2026-04-07 to 2026-11-02
- XAU/USD: 4999 candles, 2026-04-07 to 2026-11-02
- AUD/USD: 4999 candles, 2026-04-07 to 2026-11-02
- USD/CAD: 4999 candles, 2026-04-07 to 2026-11-02
- USD/CHF: 4999 candles, 2026-04-07 to 2026-11-02
- NZD/USD: 4999 candles, 2026-04-07 to 2026-11-02
- EUR/JPY: 4999 candles, 2026-04-07 to 2026-11-02
- GBP/JPY: 4999 candles, 2026-04-07 to 2026-11-02

## Rules tested

- Stochastic 5, 3, 3, levels 20 and 80
- Signal: regular divergence between price swing points and %K. A swing point needs 3 lower (or higher) candles before it and 2 after it, so each signal appears 2 candles after the second swing point, never earlier. The two swing points are 5 to 40 candles apart, %K must differ by at least 3 points, one of the two %K readings must reach the 20/80 zone, and price must not cut through the line joining the two swing points.
- Trending market only: ADX at least 25 and price clearly on one side of the 20 and 50 averages (the signal may point either way)
- Zones: price must have touched a supply or demand zone within 3 candles up to the second swing point
- Each signal uses only candles that had already closed when the signal appeared.

## How each trade is played

- Entry at the open of the candle after the signal.
- Stop 0.25 ATR beyond the second swing point. Trades with a stop wider than 4 ATR are skipped.
- Target at 1, 1.5, 2, 3 times the risk (R). Each target is tested separately on the same trades.
- Closed at the market price after 30 candles if neither is hit.
- If a candle touches both the stop and the target, the stop is assumed to have been hit first.
- Cost of 0.05 ATR per trade is subtracted for spread and slippage.
- The news filter is not included, because there is no free history of past news. The live monitor skips some trades this test counts.

## Results for your current rules (24 trades)

| Target | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| 1R target | 24 | 46% | -0.01 | -0.32 | 0.97 |
| 1.5R target | 24 | 42% | +0.10 | +2.47 | 1.23 |
| 2R target | 24 | 42% | +0.26 | +6.32 | 1.59 |
| 3R target | 24 | 29% | -0.02 | -0.49 | 0.96 |

R means one unit of risk. A result of +0.30 average R means you gained 0.3 times your risk per trade. Max drawdown at 2R: 3.4R. Longest losing run: 4 trades.

## Where it worked and where it did not (2R target)

**By pair**

| Pair | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| AUD/USD | 1 | 0% | -0.74 | -0.74 | 0.00 |
| EUR/JPY | 2 | 50% | -0.49 | -0.98 | 0.04 |
| EUR/USD | 4 | 25% | -0.12 | -0.46 | 0.81 |
| GBP/JPY | 1 | 100% | +1.90 | +1.90 | n/a |
| GBP/USD | 2 | 50% | +0.14 | +0.28 | 1.27 |
| NZD/USD | 3 | 33% | +0.12 | +0.36 | 1.22 |
| USD/CAD | 3 | 33% | -0.02 | -0.07 | 0.96 |
| USD/CHF | 3 | 67% | +1.18 | +3.55 | 11.30 |
| USD/JPY | 2 | 50% | +0.93 | +1.86 | 22.10 |
| XAU/USD | 3 | 33% | +0.21 | +0.62 | 1.47 |

**By direction**

| Direction | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| Buy | 16 | 44% | +0.33 | +5.25 | 1.67 |
| Sell | 8 | 38% | +0.13 | +1.08 | 1.38 |

**By divergence type**

| Type | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| regular | 24 | 42% | +0.26 | +6.32 | 1.59 |

**By trend strength**

| Trend strength | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| ADX 25 to 30 | 9 | 56% | +0.52 | +4.65 | 2.46 |
| ADX 30 to 40 | 13 | 31% | -0.01 | -0.17 | 0.98 |
| ADX 40 and over | 2 | 50% | +0.92 | +1.85 | 21.97 |

**By zone**

| Zone | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| fresh | 5 | 40% | +0.41 | +2.07 | 2.12 |
| tested | 19 | 42% | +0.22 | +4.26 | 1.48 |

**By session of entry**

| Session | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| Asia | 7 | 43% | +0.48 | +3.37 | 2.32 |
| London | 4 | 50% | +0.45 | +1.81 | 1.89 |
| New York | 13 | 38% | +0.09 | +1.15 | 1.19 |

**Is it consistent over time?**

| Period | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| First half of the data | 10 | 40% | +0.27 | +2.74 | 1.61 |
| Second half of the data | 14 | 43% | +0.26 | +3.58 | 1.58 |

## What if the rules were different? (2R target)

| Variation | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| Your current rules | 24 | 42% | +0.26 | +6.32 | 1.59 |
| Zones switched off | 547 | 44% | +0.09 | +51.04 | 1.18 |
| Zones and trend filter both switched off | 1149 | 42% | +0.05 | +58.30 | 1.09 |
| Trend filter off, zones kept | 52 | 48% | +0.21 | +10.89 | 1.45 |
| Signal must point with the trend | 7 | 14% | -0.21 | -1.44 | 0.58 |
| Regular and hidden divergence | 46 | 46% | +0.29 | +13.53 | 1.64 |
| Hidden divergence only | 24 | 50% | +0.36 | +8.58 | 1.76 |
| Swing points need 2 candles each side | 24 | 42% | +0.26 | +6.32 | 1.59 |
| Swing points need 4 candles each side | 24 | 29% | -0.15 | -3.70 | 0.73 |
| Swing points at most 25 candles apart | 21 | 38% | +0.13 | +2.79 | 1.27 |
| Stochastic levels 30 and 70 | 28 | 39% | +0.18 | +5.16 | 1.38 |
| Classic stochastic 14, 3, 3 | 15 | 33% | -0.10 | -1.48 | 0.83 |

## Test 1: wider stops and trailing exits

The same signals, played with different exits. A stop of 2 ATR sits two average candle ranges from the entry, so ordinary movement is less likely to knock you out. A trailing exit moves the stop behind price as it moves your way and has no fixed target, so a winner can keep running. Trailing exits are allowed 60 candles.
Fixed-target rows allow 30 candles. In the first row the stop sits just beyond the second swing point of the divergence, and a signal whose stop would be wider than 4 ATR is skipped, so that row can have fewer trades than the others. A star means fewer than 30 trades, which is too few to trust.

**Your current rules**

| Exit | Trades | Win rate | Avg R | Total R | Profit factor | Worst dip |
|---|---|---|---|---|---|---|
| Stop beyond the zone or swing point, 2R target (as above) | 24* | 42% | +0.26 | +6.32 | 1.59 | 3.4R |
| Stop 1.5 ATR, 2R target | 25* | 28% | -0.20 | -4.88 | 0.70 | 9.3R |
| Stop 2 ATR, 2R target | 25* | 24% | -0.26 | -6.62 | 0.56 | 10.6R |
| Stop 2 ATR, 3R target | 25* | 24% | -0.28 | -6.95 | 0.54 | 10.1R |
| Stop 2 ATR, trailing 2 ATR, no target | 25* | 28% | -0.18 | -4.62 | 0.54 | 7.4R |
| Stop 3 ATR, trailing 3 ATR, no target | 25* | 24% | -0.05 | -1.15 | 0.88 | 6.2R |

**Zones and trend filter switched off (bigger sample)**

| Exit | Trades | Win rate | Avg R | Total R | Profit factor | Worst dip |
|---|---|---|---|---|---|---|
| Stop beyond the zone or swing point, 2R target (as above) | 1149 | 42% | +0.05 | +58.30 | 1.09 | 49.2R |
| Stop 1.5 ATR, 2R target | 1195 | 38% | -0.01 | -15.21 | 0.98 | 75.7R |
| Stop 2 ATR, 2R target | 1195 | 41% | -0.01 | -8.15 | 0.99 | 69.2R |
| Stop 2 ATR, 3R target | 1195 | 38% | -0.01 | -6.39 | 0.99 | 68.9R |
| Stop 2 ATR, trailing 2 ATR, no target | 1187 | 34% | -0.04 | -41.68 | 0.91 | 75.8R |
| Stop 3 ATR, trailing 3 ATR, no target | 1187 | 38% | -0.04 | -44.73 | 0.90 | 71.4R |

## Test 2: does the daily trend help?

A signal only counts when the daily trend, as of the previous day's close, points the same way: price above the daily 50 average and the 20 above the 50 for a buy, the reverse for a sell. The stricter row also needs a daily ADX of at least 25. Only closed daily candles are used.

**Your current rules**

| Daily filter and exit | Trades | Win rate | Avg R | Total R | Profit factor | Worst dip |
|---|---|---|---|---|---|---|
| No daily filter, Stop beyond the zone or swing point, 2R target (as above) | 24* | 42% | +0.26 | +6.32 | 1.59 | 3.4R |
| No daily filter, Stop 2 ATR, 2R target | 25* | 24% | -0.26 | -6.62 | 0.56 | 10.6R |
| No daily filter, Stop 2 ATR, trailing 2 ATR, no target | 25* | 28% | -0.18 | -4.62 | 0.54 | 7.4R |
| Daily trend agrees, Stop beyond the zone or swing point, 2R target (as above) | 13* | 46% | +0.31 | +4.07 | 1.79 | 2.1R |
| Daily trend agrees, Stop 2 ATR, 2R target | 14* | 36% | -0.06 | -0.91 | 0.88 | 4.9R |
| Daily trend agrees, Stop 2 ATR, trailing 2 ATR, no target | 14* | 29% | -0.13 | -1.87 | 0.61 | 4.4R |
| Daily trend agrees and daily ADX at least 25, Stop beyond the zone or swing point, 2R target (as above) | 6* | 33% | -0.25 | -1.49 | 0.57 | 2.0R |
| Daily trend agrees and daily ADX at least 25, Stop 2 ATR, 2R target | 6* | 33% | -0.32 | -1.93 | 0.44 | 2.0R |
| Daily trend agrees and daily ADX at least 25, Stop 2 ATR, trailing 2 ATR, no target | 6* | 17% | -0.35 | -2.08 | 0.15 | 2.1R |

**Zones and trend filter switched off (bigger sample)**

| Daily filter and exit | Trades | Win rate | Avg R | Total R | Profit factor | Worst dip |
|---|---|---|---|---|---|---|
| No daily filter, Stop beyond the zone or swing point, 2R target (as above) | 1149 | 42% | +0.05 | +58.30 | 1.09 | 49.2R |
| No daily filter, Stop 2 ATR, 2R target | 1195 | 41% | -0.01 | -8.15 | 0.99 | 69.2R |
| No daily filter, Stop 2 ATR, trailing 2 ATR, no target | 1187 | 34% | -0.04 | -41.68 | 0.91 | 75.8R |
| Daily trend agrees, Stop beyond the zone or swing point, 2R target (as above) | 421 | 39% | -0.00 | -1.23 | 0.99 | 36.3R |
| Daily trend agrees, Stop 2 ATR, 2R target | 435 | 40% | -0.02 | -10.87 | 0.95 | 32.6R |
| Daily trend agrees, Stop 2 ATR, trailing 2 ATR, no target | 434 | 34% | -0.06 | -24.75 | 0.86 | 29.4R |
| Daily trend agrees and daily ADX at least 25, Stop beyond the zone or swing point, 2R target (as above) | 227 | 39% | -0.04 | -10.17 | 0.92 | 22.9R |
| Daily trend agrees and daily ADX at least 25, Stop 2 ATR, 2R target | 235 | 41% | -0.02 | -4.07 | 0.97 | 19.6R |
| Daily trend agrees and daily ADX at least 25, Stop 2 ATR, trailing 2 ATR, no target | 234 | 33% | -0.05 | -10.63 | 0.88 | 17.3R |

## What stands out

- The best row with at least 30 trades was "Zones and trend filter switched off (bigger sample): Stop beyond the zone or swing point, 2R target (as above)": +0.05R per trade over 1149 trades. It was picked from 30 rows, so some of that is luck. Test it again on 1h or 1day, or on more pairs, before believing it.

## How to read this

- Only 24 trades. That is too few to trust. A lucky or unlucky streak can look like a pattern. Use the rows with more trades, a longer history or more pairs before drawing conclusions.
- Choosing the best row from many variations will flatter the result, because some will win by chance. If you change a rule because of this table, test the change again on a different timeframe or pair.
- Past results do not promise future results. Practise on a demo account first.
