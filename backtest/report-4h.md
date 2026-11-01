# Backtest: 4H candles

## Data

- EUR/USD: 4999 candles, 2023-12-28 to 2026-11-01
- GBP/USD: 4999 candles, 2023-12-29 to 2026-11-01
- USD/JPY: 4999 candles, 2023-12-22 to 2026-11-01
- XAU/USD: 4999 candles, 2024-02-09 to 2026-11-01

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
| Zones switched off | 145 | 35% | -0.18 | -25.74 | 0.72 |
| ADX minimum 20 | 14 | 29% | -0.46 | -6.39 | 0.39 |
| ADX minimum 30 | 7 | 43% | -0.28 | -1.99 | 0.53 |
| ADX minimum 35 | 3 | 33% | -0.05 | -0.14 | 0.93 |
| Zone touched within 5 candles | 12 | 33% | -0.36 | -4.32 | 0.49 |
| Stochastic levels 30 and 70 | 19 | 37% | -0.22 | -4.22 | 0.67 |
| Classic stochastic 14, 3, 3 | 2 | 0% | -1.04 | -2.08 | 0.00 |

## How to read this

- Only 12 trades. That is too few to trust. A lucky or unlucky streak can look like a pattern. Use the rows with more trades, a longer history or more pairs before drawing conclusions.
- Choosing the best row from many variations will flatter the result, because some will win by chance. If you change a rule because of this table, test the change again on a different timeframe or pair.
- Past results do not promise future results. Practise on a demo account first.
