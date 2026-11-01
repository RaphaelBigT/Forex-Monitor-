# Backtest: 4H candles

## Data

- EUR/USD: 4999 candles, 2023-12-28 to 2026-11-01
- GBP/USD: 4999 candles, 2023-12-29 to 2026-11-01
- USD/JPY: 4999 candles, 2023-12-22 to 2026-11-01
- XAU/USD: 4999 candles, 2024-02-11 to 2026-11-01

## Rules tested

- Stochastic 5, 3, 3, levels 20 and 80
- Trending market only: ADX at least 25, price on one side of the 20 and 50 averages, signal in the trend direction
- Zones: price must have touched a supply or demand zone in the last 3 candles
- Each signal uses only candles that had already closed when the signal appeared.

## How each trade is played

- Entry at the open of the candle after the signal.
- Stop 0.25 ATR beyond the zone. Trades with a stop wider than 4 ATR are skipped.
- Target at 1, 1.5, 2, 3 times the risk (R). Each target is tested separately on the same trades.
- Closed at the market price after 30 candles if neither is hit.
- If a candle touches both the stop and the target, the stop is assumed to have been hit first.
- Cost of 0.05 ATR per trade is subtracted for spread and slippage.
- The news filter is not included, because there is no free history of past news. The live monitor skips some trades this test counts.

## Results for your current rules (12 trades)

| Target | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| 1R target | 12 | 42% | -0.28 | -3.39 | 0.55 |
| 1.5R target | 12 | 33% | -0.32 | -3.89 | 0.54 |
| 2R target | 12 | 33% | -0.36 | -4.32 | 0.49 |
| 3R target | 12 | 33% | -0.19 | -2.32 | 0.73 |

R means one unit of risk. A result of +0.30 average R means you gained 0.3 times your risk per trade. Max drawdown at 2R: 6.4R. Longest losing run: 6 trades.

## Where it worked and where it did not (2R target)

**By pair**

| Pair | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| EUR/USD | 4 | 50% | +0.01 | +0.05 | 1.02 |
| GBP/USD | 3 | 33% | -0.04 | -0.13 | 0.94 |
| USD/JPY | 2 | 0% | -1.04 | -2.08 | 0.00 |
| XAU/USD | 3 | 33% | -0.72 | -2.16 | 0.02 |

**By direction**

| Direction | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| Buy | 3 | 0% | -1.08 | -3.24 | 0.00 |
| Sell | 9 | 44% | -0.12 | -1.08 | 0.79 |

**By trend strength**

| Trend strength | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| ADX 25 to 30 | 5 | 20% | -0.47 | -2.33 | 0.45 |
| ADX 30 to 40 | 5 | 60% | +0.02 | +0.11 | 1.05 |
| ADX 40 and over | 2 | 0% | -1.05 | -2.10 | 0.00 |

**By zone**

| Zone | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| fresh | 4 | 25% | -0.77 | -3.09 | 0.01 |
| tested | 8 | 38% | -0.15 | -1.23 | 0.77 |

**By session of entry**

| Session | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| Asia | 7 | 0% | -1.06 | -7.44 | 0.00 |
| London | 2 | 100% | +1.09 | +2.18 | n/a |
| New York | 3 | 67% | +0.31 | +0.93 | 1.89 |

**Is it consistent over time?**

| Period | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| First half of the data | 6 | 50% | +0.13 | +0.81 | 1.26 |
| Second half of the data | 6 | 17% | -0.85 | -5.13 | 0.04 |

## What if the rules were different? (2R target)

| Variation | Trades | Win rate | Avg R | Total R | Profit factor |
|---|---|---|---|---|---|
| Your current rules | 12 | 33% | -0.36 | -4.32 | 0.49 |
| Zones switched off | 145 | 35% | -0.19 | -27.77 | 0.71 |
| ADX minimum 20 | 14 | 29% | -0.46 | -6.39 | 0.39 |
| ADX minimum 30 | 7 | 43% | -0.28 | -1.99 | 0.53 |
| ADX minimum 35 | 3 | 33% | -0.05 | -0.14 | 0.93 |
| Zone touched within 5 candles | 12 | 33% | -0.36 | -4.32 | 0.49 |
| Stochastic levels 30 and 70 | 19 | 37% | -0.22 | -4.22 | 0.67 |
| Classic stochastic 14, 3, 3 | 2 | 0% | -1.04 | -2.08 | 0.00 |

## Test 1: wider stops and trailing exits

The same signals, played with different exits. A stop of 2 ATR sits two average candle ranges from the entry, so ordinary movement is less likely to knock you out. A trailing exit moves the stop behind price as it moves your way and has no fixed target, so a winner can keep running. Trailing exits are allowed 60 candles.
Fixed-target rows allow 30 candles. In the zone-stop row, a signal with no zone nearby gets a 1.5 ATR stop, and a signal whose stop would be wider than 4 ATR is skipped, so that row can have fewer trades than the others. A star means fewer than 30 trades, which is too few to trust.

**Your current rules (zones required)**

| Exit | Trades | Win rate | Avg R | Total R | Profit factor | Worst dip |
|---|---|---|---|---|---|---|
| Stop beyond the zone, 2R target (as above) | 12* | 33% | -0.36 | -4.32 | 0.49 | 6.4R |
| Stop 1.5 ATR, 2R target | 13* | 31% | -0.11 | -1.43 | 0.85 | 6.2R |
| Stop 2 ATR, 2R target | 13* | 38% | -0.21 | -2.79 | 0.66 | 5.0R |
| Stop 2 ATR, 3R target | 13* | 38% | -0.20 | -2.65 | 0.68 | 5.9R |
| Stop 2 ATR, trailing 2 ATR, no target | 13* | 23% | -0.12 | -1.59 | 0.75 | 4.0R |
| Stop 3 ATR, trailing 3 ATR, no target | 13* | 38% | -0.18 | -2.31 | 0.52 | 4.2R |

**Zones switched off (bigger sample)**

| Exit | Trades | Win rate | Avg R | Total R | Profit factor | Worst dip |
|---|---|---|---|---|---|---|
| Stop beyond the zone, 2R target (as above) | 145 | 35% | -0.19 | -27.77 | 0.71 | 48.9R |
| Stop 1.5 ATR, 2R target | 243 | 35% | -0.04 | -9.63 | 0.94 | 45.8R |
| Stop 2 ATR, 2R target | 243 | 37% | -0.05 | -12.80 | 0.91 | 42.2R |
| Stop 2 ATR, 3R target | 243 | 35% | -0.07 | -17.53 | 0.88 | 45.3R |
| Stop 2 ATR, trailing 2 ATR, no target | 241 | 36% | -0.05 | -11.04 | 0.88 | 33.0R |
| Stop 3 ATR, trailing 3 ATR, no target | 241 | 36% | -0.05 | -11.41 | 0.88 | 33.6R |

## Test 2: does the daily trend help?

A signal only counts when the daily trend, as of the previous day's close, points the same way: price above the daily 50 average and the 20 above the 50 for a buy, the reverse for a sell. The stricter row also needs a daily ADX of at least 25. Only closed daily candles are used.

**Your current rules (zones required)**

| Daily filter and exit | Trades | Win rate | Avg R | Total R | Profit factor | Worst dip |
|---|---|---|---|---|---|---|
| No daily filter, Stop beyond the zone, 2R target (as above) | 12* | 33% | -0.36 | -4.32 | 0.49 | 6.4R |
| No daily filter, Stop 2 ATR, 2R target | 13* | 38% | -0.21 | -2.79 | 0.66 | 5.0R |
| No daily filter, Stop 2 ATR, trailing 2 ATR, no target | 13* | 23% | -0.12 | -1.59 | 0.75 | 4.0R |
| Daily trend agrees, Stop beyond the zone, 2R target (as above) | 7* | 29% | -0.46 | -3.19 | 0.40 | 4.3R |
| Daily trend agrees, Stop 2 ATR, 2R target | 8* | 38% | -0.22 | -1.73 | 0.66 | 4.0R |
| Daily trend agrees, Stop 2 ATR, trailing 2 ATR, no target | 8* | 25% | -0.01 | -0.07 | 0.98 | 2.5R |
| Daily trend agrees and daily ADX at least 25, Stop beyond the zone, 2R target (as above) | 3* | 33% | -0.63 | -1.90 | 0.11 | 2.1R |
| Daily trend agrees and daily ADX at least 25, Stop 2 ATR, 2R target | 4* | 75% | +0.59 | +2.37 | 3.32 | 1.0R |
| Daily trend agrees and daily ADX at least 25, Stop 2 ATR, trailing 2 ATR, no target | 4* | 25% | +0.31 | +1.23 | 1.71 | 1.1R |

**Zones switched off (bigger sample)**

| Daily filter and exit | Trades | Win rate | Avg R | Total R | Profit factor | Worst dip |
|---|---|---|---|---|---|---|
| No daily filter, Stop beyond the zone, 2R target (as above) | 145 | 35% | -0.19 | -27.77 | 0.71 | 48.9R |
| No daily filter, Stop 2 ATR, 2R target | 243 | 37% | -0.05 | -12.80 | 0.91 | 42.2R |
| No daily filter, Stop 2 ATR, trailing 2 ATR, no target | 241 | 36% | -0.05 | -11.04 | 0.88 | 33.0R |
| Daily trend agrees, Stop beyond the zone, 2R target (as above) | 69 | 41% | -0.03 | -2.33 | 0.94 | 26.5R |
| Daily trend agrees, Stop 2 ATR, 2R target | 136 | 36% | -0.07 | -9.18 | 0.89 | 31.4R |
| Daily trend agrees, Stop 2 ATR, trailing 2 ATR, no target | 135 | 36% | -0.03 | -3.48 | 0.94 | 19.9R |
| Daily trend agrees and daily ADX at least 25, Stop beyond the zone, 2R target (as above) | 38 | 47% | +0.10 | +3.95 | 1.19 | 13.5R |
| Daily trend agrees and daily ADX at least 25, Stop 2 ATR, 2R target | 82 | 39% | +0.00 | +0.26 | 1.01 | 19.1R |
| Daily trend agrees and daily ADX at least 25, Stop 2 ATR, trailing 2 ATR, no target | 81 | 36% | -0.00 | -0.32 | 0.99 | 12.8R |

## What stands out

- The best row with at least 30 trades was "Zones switched off (bigger sample): Daily trend agrees and daily ADX at least 25, Stop beyond the zone, 2R target (as above)": +0.10R per trade over 38 trades. It was picked from 30 rows, so some of that is luck. Test it again on 1h or 1day, or on more pairs, before believing it.

## How to read this

- Only 12 trades. That is too few to trust. A lucky or unlucky streak can look like a pattern. Use the rows with more trades, a longer history or more pairs before drawing conclusions.
- Choosing the best row from many variations will flatter the result, because some will win by chance. If you change a rule because of this table, test the change again on a different timeframe or pair.
- Past results do not promise future results. Practise on a demo account first.
