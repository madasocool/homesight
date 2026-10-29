# 🏠 HomeSight

[![Tests](https://github.com/madasocool/homesight/actions/workflows/test.yml/badge.svg)](https://github.com/madasocool/homesight/actions/workflows/test.yml)

**A free web calculator that shows the real cost of buying a home — and whether renting or buying actually builds more wealth.**

🔗 **Live site:** https://madasocool.github.io/homesight/

Most online mortgage calculators only show principal and interest. That number hides hundreds of dollars a month in property tax, insurance, PMI and HOA fees, and it says nothing about what the down payment *could* have earned if it had been invested. HomeSight puts all of that in one place.

## Features

| Tab | What it answers |
|---|---|
| **Monthly cost** | What will this home really cost each month? Breaks the payment into principal & interest, property tax, insurance, HOA and PMI, and charts the loan balance vs. interest paid over the life of the loan. |
| **What can I afford?** | What's the most expensive home I qualify for? Uses the lender **28/36 rule** (housing ≤ 28% of gross income, housing + debts ≤ 36%) and solves for the price with a binary search. |
| **Rent vs. buy** | After *N* years, who is richer — the buyer or the renter? Simulates both month by month and finds the **break-even year**. |

## How the rent-vs-buy model works

A fair comparison has to give both people the same starting cash:

1. The **buyer** spends it on the down payment + 3% closing costs.
2. The **renter** invests that same amount instead (default 6% / yr).
3. Every month, whoever has the **cheaper housing cost invests the difference**.
4. Rent rises each year; the home appreciates; the buyer pays maintenance (1% of value / yr).
5. The buyer's net worth = home value − 6% selling costs − remaining loan + their investments.

This is why buying often loses in the first few years (closing and selling costs) but wins over a longer stay.

## Tech

- Plain **HTML, CSS and JavaScript** (ES modules) — no frameworks, no build step
- Charts drawn by hand on `<canvas>` (`src/chart.js`) — no chart library
- All financial math lives in pure functions in `src/finance.js`, separate from the UI
- **Unit tests** for all the math (Node's built-in test runner), run automatically on every push with **GitHub Actions**
- Light and dark mode, works on phones

```
homesight/
├── index.html          page layout and inputs
├── styles.css          styling (light + dark mode)
├── src/
│   ├── finance.js      the math: amortization, PMI, 28/36 rule, rent-vs-buy simulation
│   ├── chart.js        small canvas line-chart helper
│   └── app.js          reads inputs, runs the math, updates the page
└── test/
    └── finance.test.js unit tests for the math
```

## Run it yourself

```bash
git clone https://github.com/madasocool/homesight.git
cd homesight
python3 -m http.server 8000   # then open http://localhost:8000
npm test                      # runs the unit tests (Node 18+)
```

## Ideas for what's next

- Pull real local rent and property-tax data by ZIP code
- Compare two homes side by side
- Account for the mortgage interest tax deduction
- Export results as a PDF

## Disclaimer

HomeSight gives estimates for learning and planning. It is not financial advice.

## License

MIT
