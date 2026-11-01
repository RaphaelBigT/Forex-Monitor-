# Backtest: how to add and run it

This replays your current rules over about three years of past candles and shows what would have happened.
It uses the same rules as your live monitor (config.json), so what you test is what you get alerts for.

## Add it (once)

1. Open your `Forex-Monitor` repository on GitHub.
2. **Add file**, then **Upload files**. Drag in `backtest.js` and tap **Commit changes**.
3. **Add file**, then **Create new file**. In the name box type exactly: `.github/workflows/backtest.yml`
4. Open `backtest.yml` from this folder in a text editor, copy everything and paste it into the big box.
   Tap **Commit changes**.

You do not need to change anything else. Your key is already saved as a secret.

## Run it

1. Open the **Actions** tab.
2. Choose **Backtest** on the left, then **Run workflow**.
3. Pick the candle size (4h is the one your live monitor uses) and run it.
4. After a minute or two, open the finished run. The report is on its **Summary** page.
5. The same report is saved in your repository, in the `backtest` folder, as `report-4h.md`,
   with every trade in `trades-4h.csv`.

Run it again with `1h` and `1day` to see whether the rules hold up on other candle sizes.

## What the report tells you

- Results for targets of 1, 1.5, 2 and 3 times the risk (R), after an assumed cost per trade.
- Where the rules worked and where they did not: by pair, buy or sell, trend strength, zone type and session.
- Whether the first half of the history agrees with the second half.
- A "what if" table showing how the results change if one rule is changed.

## Testing more pairs

A small number of trades is the main weakness of any test. To test more pairs without changing what the live
monitor watches, edit `config.json` and add a `backtest` section:

    "backtest": { "pairs": ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "XAU/USD"] }

Other settings you can put in that section: `candles`, `maxHoldCandles`, `stopBufferAtr`, `maxRiskAtr`,
`costAtr`, `targets` and `mainTarget`.

## Read the results carefully

- Under about 30 trades, a result is mostly luck. The report says so when that happens.
- The news filter is not part of the test, because free past news data does not exist.
- Picking the best row from many tries flatters the result. If you change a rule because of the table,
  test the change again on a different candle size or pair.
- Past results do not promise future results. Practise on a demo account first.
