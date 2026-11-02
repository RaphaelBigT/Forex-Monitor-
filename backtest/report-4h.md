# Backtest: 4H candles

## Data

- EUR/USD: 4999 candles, 2023-12-28 to 2026-11-02
- GBP/USD: 4999 candles, 2024-01-01 to 2026-11-02
- USD/JPY: 4999 candles, 2023-12-22 to 2026-11-02
- XAU/USD: 4999 candles, 2024-02-12 to 2026-11-02
- AUD/USD: 4999 candles, 2023-12-29 to 2026-11-02
- USD/CAD: 4999 candles, 2023-12-29 to 2026-11-02
- USD/CHF: 4999 candles, 2023-12-26 to 2026-11-02
- NZD/USD: 4999 candles, 2024-01-02 to 2026-11-02
- EUR/JPY: 4999 candles, 2023-12-29 to 2026-11-02
- GBP/JPY: 4999 candles, 2023-12-29 to 2026-11-02

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

## Results for your current rules (26 trades)

| Target | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| 1R target | 26 | 62% | +0.20 | +5.07 | 1.53 |
| 1.5R target | 26 | 58% | +0.38 | +9.95 | 1.98 |
| 2R target | 26 | 42% | +0.15 | +3.83 | 1.27 |
| 3R target | 26 | 38% | +0.14 | +3.69 | 1.24 |

R means one unit of risk. A result of +0.30 average R means you gained 0.3 times your risk per trade. Max drawdown at 2R: 4.4R. Longest losing run: 5 trades.

## Where it worked and where it did not (2R target)

**By pair**

| Pair | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| AUD/USD | 4 | 25% | -0.57 | -2.27 | 0.28 |
| EUR/JPY | 2 | 50% | +0.47 | +0.93 | 1.89 |
| EUR/USD | 1 | 0% | -1.07 | -1.07 | 0.00 |
| GBP/JPY | 4 | 50% | +0.04 | +0.15 | 1.07 |
| GBP/USD | 2 | 50% | +0.45 | +0.91 | 1.87 |
| NZD/USD | 1 | 0% | -1.03 | -1.03 | 0.00 |
| USD/CAD | 3 | 33% | -0.04 | -0.11 | 0.95 |
| USD/CHF | 3 | 67% | +1.04 | +3.11 | 15.86 |
| USD/JPY | 3 | 33% | -0.06 | -0.17 | 0.92 |
| XAU/USD | 3 | 67% | +1.13 | +3.38 | 7.49 |

**By direction**

| Direction | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| Buy | 14 | 57% | +0.49 | +6.85 | 2.25 |
| Sell | 12 | 25% | -0.25 | -3.02 | 0.66 |

**By divergence type**

| Type | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| regular | 26 | 42% | +0.15 | +3.83 | 1.27 |

**By trend strength**

| Trend strength | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| ADX 25 to 30 | 8 | 38% | -0.14 | -1.10 | 0.79 |
| ADX 30 to 40 | 14 | 36% | +0.00 | +0.07 | 1.01 |
| ADX 40 and over | 4 | 75% | +1.22 | +4.86 | 5.70 |

**By zone**

| Zone | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| fresh | 8 | 38% | +0.12 | +0.95 | 1.25 |
| tested | 18 | 44% | +0.16 | +2.88 | 1.28 |

**By session of entry**

| Session | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| Asia | 12 | 17% | -0.50 | -6.04 | 0.39 |
| London | 2 | 100% | +1.96 | +3.91 | n/a |
| New York | 12 | 58% | +0.50 | +5.96 | 2.36 |

**Is it consistent over time?**

| Period | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| First half of the data | 11 | 36% | +0.07 | +0.80 | 1.12 |
| Second half of the data | 15 | 47% | +0.20 | +3.03 | 1.39 |

## What if the rules were different? (2R target)

| Variation | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| Your current rules | 26 | 42% | +0.15 | +3.83 | 1.27 |
| Zones switched off | 603 | 33% | -0.15 | -90.26 | 0.78 |
| Zones and trend filter both switched off | 1331 | 35% | -0.08 | -103.50 | 0.88 |
| Trend filter off, zones kept | 75 | 36% | -0.03 | -2.43 | 0.95 |
| Signal must point with the trend | 3 | 0% | -0.86 | -2.58 | 0.00 |
| Regular and hidden divergence | 52 | 40% | +0.04 | +2.25 | 1.07 |
| Hidden divergence only | 26 | 38% | -0.06 | -1.58 | 0.90 |
| Swing points need 2 candles each side | 26 | 42% | +0.15 | +3.83 | 1.27 |
| Swing points need 4 candles each side | 28 | 54% | +0.33 | +9.11 | 1.74 |
| Swing points at most 25 candles apart | 19 | 32% | -0.08 | -1.53 | 0.87 |
| Stochastic levels 30 and 70 | 32 | 41% | +0.11 | +3.65 | 1.20 |
| Classic stochastic 14, 3, 3 | 19 | 37% | +0.19 | +3.52 | 1.34 |

## Test 1: wider stops and trailing exits

The same signals, played with different exits. A stop of 2 ATR sits two average candle ranges from the entry, so ordinary movement is less likely to knock you out. A trailing exit moves the stop behind price as it moves your way and has no fixed target, so a winner can keep running. Trailing exits are allowed 60 candles.
Fixed-target rows allow 30 candles. In the first row the stop sits just beyond the second swing point of the divergence, and a signal whose stop would be wider than 4 ATR is skipped, so that row can have fewer trades than the others. A star means fewer than 30 trades, which is too few to trust.

**Your current rules**

| Exit | Trades | Win rate | Avg R | Total R | Profit factor | Worst dip |
|---|---|---|---|---|---|---|
| Stop beyond the zone or swing point, 2R target (as above) | 26* | 42% | +0.15 | +3.83 | 1.27 | 4.4R |
| Stop 1.5 ATR, 2R target | 28* | 39% | +0.06 | +1.58 | 1.09 | 5.6R |
| Stop 2 ATR, 2R target | 28* | 46% | +0.17 | +4.63 | 1.33 | 4.4R |
| Stop 2 ATR, 3R target | 28* | 43% | +0.19 | +5.33 | 1.35 | 4.4R |
| Stop 2 ATR, trailing 2 ATR, no target | 28* | 46% | +0.16 | +4.57 | 1.63 | 2.0R |
| Stop 3 ATR, trailing 3 ATR, no target | 28* | 36% | +0.22 | +6.11 | 1.64 | 2.3R |

**Zones and trend filter switched off (bigger sample)**

| Exit | Trades | Win rate | Avg R | Total R | Profit factor | Worst dip |
|---|---|---|---|---|---|---|
| Stop beyond the zone or swing point, 2R target (as above) | 1331 | 35% | -0.08 | -103.50 | 0.88 | 119.9R |
| Stop 1.5 ATR, 2R target | 1372 | 34% | -0.06 | -85.59 | 0.91 | 95.9R |
| Stop 2 ATR, 2R target | 1372 | 38% | -0.01 | -16.96 | 0.98 | 71.3R |
| Stop 2 ATR, 3R target | 1372 | 35% | -0.04 | -50.02 | 0.94 | 83.8R |
| Stop 2 ATR, trailing 2 ATR, no target | 1369 | 35% | -0.03 | -38.00 | 0.93 | 68.3R |
| Stop 3 ATR, trailing 3 ATR, no target | 1369 | 37% | +0.01 | +14.09 | 1.03 | 48.3R |

## Test 2: does the daily trend help?

A signal only counts when the daily trend, as of the previous day's close, points the same way: price above the daily 50 average and the 20 above the 50 for a buy, the reverse for a sell. The stricter row also needs a daily ADX of at least 25. Only closed daily candles are used.

**Your current rules**

| Daily filter and exit | Trades | Win rate | Avg R | Total R | Profit factor | Worst dip |
|---|---|---|---|---|---|---|
| No daily filter, Stop beyond the zone or swing point, 2R target (as above) | 26* | 42% | +0.15 | +3.83 | 1.27 | 4.4R |
| No daily filter, Stop 2 ATR, 2R target | 28* | 46% | +0.17 | +4.63 | 1.33 | 4.4R |
| No daily filter, Stop 2 ATR, trailing 2 ATR, no target | 28* | 46% | +0.16 | +4.57 | 1.63 | 2.0R |
| Daily trend agrees, Stop beyond the zone or swing point, 2R target (as above) | 12* | 42% | +0.06 | +0.72 | 1.11 | 3.1R |
| Daily trend agrees, Stop 2 ATR, 2R target | 12* | 50% | +0.17 | +2.00 | 1.35 | 3.1R |
| Daily trend agrees, Stop 2 ATR, trailing 2 ATR, no target | 12* | 42% | +0.08 | +0.99 | 1.30 | 2.2R |
| Daily trend agrees and daily ADX at least 25, Stop beyond the zone or swing point, 2R target (as above) | 9* | 33% | +0.02 | +0.16 | 1.03 | 3.1R |
| Daily trend agrees and daily ADX at least 25, Stop 2 ATR, 2R target | 9* | 44% | +0.07 | +0.65 | 1.14 | 2.7R |
| Daily trend agrees and daily ADX at least 25, Stop 2 ATR, trailing 2 ATR, no target | 9* | 56% | +0.21 | +1.88 | 1.78 | 2.2R |

**Zones and trend filter switched off (bigger sample)**

| Daily filter and exit | Trades | Win rate | Avg R | Total R | Profit factor | Worst dip |
|---|---|---|---|---|---|---|
| No daily filter, Stop beyond the zone or swing point, 2R target (as above) | 1331 | 35% | -0.08 | -103.50 | 0.88 | 119.9R |
| No daily filter, Stop 2 ATR, 2R target | 1372 | 38% | -0.01 | -16.96 | 0.98 | 71.3R |
| No daily filter, Stop 2 ATR, trailing 2 ATR, no target | 1369 | 35% | -0.03 | -38.00 | 0.93 | 68.3R |
| Daily trend agrees, Stop beyond the zone or swing point, 2R target (as above) | 412 | 36% | -0.04 | -15.31 | 0.94 | 42.2R |
| Daily trend agrees, Stop 2 ATR, 2R target | 419 | 37% | -0.00 | -0.99 | 1.00 | 35.0R |
| Daily trend agrees, Stop 2 ATR, trailing 2 ATR, no target | 419 | 36% | +0.00 | +0.13 | 1.00 | 20.4R |
| Daily trend agrees and daily ADX at least 25, Stop beyond the zone or swing point, 2R target (as above) | 212 | 33% | -0.13 | -26.91 | 0.81 | 34.6R |
| Daily trend agrees and daily ADX at least 25, Stop 2 ATR, 2R target | 214 | 33% | -0.16 | -33.85 | 0.75 | 37.2R |
| Daily trend agrees and daily ADX at least 25, Stop 2 ATR, trailing 2 ATR, no target | 214 | 35% | -0.06 | -12.70 | 0.85 | 16.2R |

## What stands out

- The best row with at least 30 trades was "Zones and trend filter switched off (bigger sample): Stop 3 ATR, trailing 3 ATR, no target": +0.01R per trade over 1369 trades. It was picked from 30 rows, so some of that is luck. Test it again on 1h or 1day, or on more pairs, before believing it.

## How to read this

- Only 26 trades. That is too few to trust. A lucky or unlucky streak can look like a pattern. Use the rows with more trades, a longer history or more pairs before drawing conclusions.
- Choosing the best row from many variations will flatter the result, because some will win by chance. If you change a rule because of this table, test the change again on a different timeframe or pair.
- Past results do not promise future results. Practise on a demo account first.
