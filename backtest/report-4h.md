# Backtest: 4H candles

## Data

- EUR/USD: 4999 candles, 2023-12-28 to 2026-11-02
- GBP/USD: 4999 candles, 2024-01-01 to 2026-11-02
- USD/JPY: 4999 candles, 2023-12-22 to 2026-11-02
- XAU/USD: 4999 candles, 2024-02-12 to 2026-11-02

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

## Results for your current rules (9 trades)

| Target | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| 1R target | 9 | 89% | +0.73 | +6.56 | 7.06 |
| 1.5R target | 9 | 78% | +0.95 | +8.55 | 6.34 |
| 2R target | 9 | 44% | +0.34 | +3.05 | 1.64 |
| 3R target | 9 | 44% | +0.65 | +5.86 | 2.23 |

R means one unit of risk. A result of +0.30 average R means you gained 0.3 times your risk per trade. Max drawdown at 2R: 4.2R. Longest losing run: 4 trades.

## Where it worked and where it did not (2R target)

**By pair**

| Pair | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| EUR/USD | 1 | 0% | -1.07 | -1.07 | 0.00 |
| GBP/USD | 2 | 50% | +0.45 | +0.91 | 1.87 |
| USD/JPY | 3 | 33% | -0.06 | -0.17 | 0.92 |
| XAU/USD | 3 | 67% | +1.13 | +3.38 | 7.49 |

**By direction**

| Direction | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| Buy | 6 | 50% | +0.45 | +2.71 | 1.85 |
| Sell | 3 | 33% | +0.12 | +0.35 | 1.22 |

**By divergence type**

| Type | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| regular | 9 | 44% | +0.34 | +3.05 | 1.64 |

**By trend strength**

| Trend strength | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| ADX 25 to 30 | 3 | 33% | -0.06 | -0.18 | 0.92 |
| ADX 30 to 40 | 5 | 40% | +0.25 | +1.27 | 1.48 |
| ADX 40 and over | 1 | 100% | +1.96 | +1.96 | n/a |

**By zone**

| Zone | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| fresh | 2 | 0% | -0.79 | -1.59 | 0.00 |
| tested | 7 | 57% | +0.66 | +4.64 | 2.46 |

**By session of entry**

| Session | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| Asia | 4 | 0% | -0.92 | -3.67 | 0.00 |
| London | 1 | 100% | +1.94 | +1.94 | n/a |
| New York | 4 | 75% | +1.20 | +4.79 | 5.43 |

**Is it consistent over time?**

| Period | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| First half of the data | 4 | 25% | -0.30 | -1.21 | 0.62 |
| Second half of the data | 5 | 60% | +0.85 | +4.26 | 3.69 |

## What if the rules were different? (2R target)

| Variation | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| Your current rules | 9 | 44% | +0.34 | +3.05 | 1.64 |
| Zones switched off | 261 | 34% | -0.11 | -29.32 | 0.83 |
| Zones and trend filter both switched off | 551 | 35% | -0.06 | -35.11 | 0.90 |
| Trend filter off, zones kept | 32 | 34% | -0.03 | -0.91 | 0.96 |
| Signal must point with the trend | 1 | 0% | -0.52 | -0.52 | 0.00 |
| Regular and hidden divergence | 18 | 39% | -0.06 | -1.05 | 0.90 |
| Hidden divergence only | 9 | 33% | -0.46 | -4.10 | 0.34 |
| Swing points need 2 candles each side | 9 | 44% | +0.34 | +3.05 | 1.64 |
| Swing points need 4 candles each side | 10 | 70% | +0.90 | +8.97 | 3.88 |
| Swing points at most 25 candles apart | 6 | 33% | +0.04 | +0.25 | 1.07 |
| Stochastic levels 30 and 70 | 12 | 42% | +0.25 | +2.97 | 1.44 |
| Classic stochastic 14, 3, 3 | 6 | 67% | +0.97 | +5.80 | 3.80 |

## Test 1: wider stops and trailing exits

The same signals, played with different exits. A stop of 2 ATR sits two average candle ranges from the entry, so ordinary movement is less likely to knock you out. A trailing exit moves the stop behind price as it moves your way and has no fixed target, so a winner can keep running. Trailing exits are allowed 60 candles.
Fixed-target rows allow 30 candles. In the first row the stop sits just beyond the second swing point of the divergence, and a signal whose stop would be wider than 4 ATR is skipped, so that row can have fewer trades than the others. A star means fewer than 30 trades, which is too few to trust.

**Your current rules**

| Exit | Trades | Win rate | Avg R | Total R | Profit factor | Worst dip |
|---|---|---|---|---|---|---|
| Stop beyond the zone or swing point, 2R target (as above) | 9* | 44% | +0.34 | +3.05 | 1.64 | 4.2R |
| Stop 1.5 ATR, 2R target | 9* | 56% | +0.60 | +5.36 | 2.28 | 4.2R |
| Stop 2 ATR, 2R target | 9* | 67% | +0.81 | +7.25 | 3.36 | 3.1R |
| Stop 2 ATR, 3R target | 9* | 56% | +0.69 | +6.20 | 2.51 | 3.1R |
| Stop 2 ATR, trailing 2 ATR, no target | 9* | 56% | +0.85 | +7.69 | 9.76 | 0.9R |
| Stop 3 ATR, trailing 3 ATR, no target | 9* | 67% | +0.92 | +8.31 | 7.10 | 1.4R |

**Zones and trend filter switched off (bigger sample)**

| Exit | Trades | Win rate | Avg R | Total R | Profit factor | Worst dip |
|---|---|---|---|---|---|---|
| Stop beyond the zone or swing point, 2R target (as above) | 551 | 35% | -0.06 | -35.11 | 0.90 | 51.6R |
| Stop 1.5 ATR, 2R target | 575 | 34% | -0.06 | -32.85 | 0.91 | 52.9R |
| Stop 2 ATR, 2R target | 575 | 38% | -0.02 | -12.21 | 0.96 | 32.7R |
| Stop 2 ATR, 3R target | 575 | 34% | -0.07 | -38.12 | 0.90 | 45.7R |
| Stop 2 ATR, trailing 2 ATR, no target | 575 | 34% | -0.06 | -37.05 | 0.84 | 51.5R |
| Stop 3 ATR, trailing 3 ATR, no target | 575 | 37% | -0.00 | -0.40 | 1.00 | 18.5R |

## Test 2: does the daily trend help?

A signal only counts when the daily trend, as of the previous day's close, points the same way: price above the daily 50 average and the 20 above the 50 for a buy, the reverse for a sell. The stricter row also needs a daily ADX of at least 25. Only closed daily candles are used.

**Your current rules**

| Daily filter and exit | Trades | Win rate | Avg R | Total R | Profit factor | Worst dip |
|---|---|---|---|---|---|---|
| No daily filter, Stop beyond the zone or swing point, 2R target (as above) | 9* | 44% | +0.34 | +3.05 | 1.64 | 4.2R |
| No daily filter, Stop 2 ATR, 2R target | 9* | 67% | +0.81 | +7.25 | 3.36 | 3.1R |
| No daily filter, Stop 2 ATR, trailing 2 ATR, no target | 9* | 56% | +0.85 | +7.69 | 9.76 | 0.9R |
| Daily trend agrees, Stop beyond the zone or swing point, 2R target (as above) | 4* | 50% | +0.58 | +2.34 | 2.49 | 1.0R |
| Daily trend agrees, Stop 2 ATR, 2R target | 4* | 75% | +0.84 | +3.38 | 4.29 | 1.0R |
| Daily trend agrees, Stop 2 ATR, trailing 2 ATR, no target | 4* | 75% | +0.96 | +3.85 | 55.92 | 0.1R |
| Daily trend agrees and daily ADX at least 25, Stop beyond the zone or swing point, 2R target (as above) | 3* | 67% | +1.13 | +3.38 | 7.49 | 0.5R |
| Daily trend agrees and daily ADX at least 25, Stop 2 ATR, 2R target | 3* | 100% | +1.47 | +4.40 | n/a | 0.0R |
| Daily trend agrees and daily ADX at least 25, Stop 2 ATR, trailing 2 ATR, no target | 3* | 100% | +1.31 | +3.92 | n/a | 0.0R |

**Zones and trend filter switched off (bigger sample)**

| Daily filter and exit | Trades | Win rate | Avg R | Total R | Profit factor | Worst dip |
|---|---|---|---|---|---|---|
| No daily filter, Stop beyond the zone or swing point, 2R target (as above) | 551 | 35% | -0.06 | -35.11 | 0.90 | 51.6R |
| No daily filter, Stop 2 ATR, 2R target | 575 | 38% | -0.02 | -12.21 | 0.96 | 32.7R |
| No daily filter, Stop 2 ATR, trailing 2 ATR, no target | 575 | 34% | -0.06 | -37.05 | 0.84 | 51.5R |
| Daily trend agrees, Stop beyond the zone or swing point, 2R target (as above) | 192 | 36% | -0.03 | -5.45 | 0.96 | 28.5R |
| Daily trend agrees, Stop 2 ATR, 2R target | 196 | 38% | -0.01 | -2.56 | 0.98 | 20.1R |
| Daily trend agrees, Stop 2 ATR, trailing 2 ATR, no target | 196 | 35% | -0.01 | -1.93 | 0.98 | 12.6R |
| Daily trend agrees and daily ADX at least 25, Stop beyond the zone or swing point, 2R target (as above) | 98 | 36% | -0.09 | -8.62 | 0.86 | 19.5R |
| Daily trend agrees and daily ADX at least 25, Stop 2 ATR, 2R target | 99 | 34% | -0.19 | -18.88 | 0.71 | 21.6R |
| Daily trend agrees and daily ADX at least 25, Stop 2 ATR, trailing 2 ATR, no target | 99 | 32% | -0.08 | -8.15 | 0.81 | 12.1R |

## What stands out

- None of the rows with at least 30 trades made money after costs. The least bad was "Zones and trend filter switched off (bigger sample): Stop 3 ATR, trailing 3 ATR, no target" at -0.00R per trade over 575 trades.

## How to read this

- Only 9 trades. That is too few to trust. A lucky or unlucky streak can look like a pattern. Use the rows with more trades, a longer history or more pairs before drawing conclusions.
- Choosing the best row from many variations will flatter the result, because some will win by chance. If you change a rule because of this table, test the change again on a different timeframe or pair.
- Past results do not promise future results. Practise on a demo account first.
