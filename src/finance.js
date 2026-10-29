// finance.js — all the math behind HomeSight.
// Pure functions only (no DOM), so they can be tested in Node and reused in the browser.

/**
 * Monthly principal + interest payment on a fixed-rate loan.
 * Standard amortization formula: P * r / (1 - (1 + r)^-n)
 * @param {number} principal  amount borrowed
 * @param {number} annualRate interest rate as a decimal (0.065 = 6.5%)
 * @param {number} years      loan term
 */
export function monthlyPayment(principal, annualRate, years) {
  const n = years * 12;
  const r = annualRate / 12;
  if (principal <= 0) return 0;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

/**
 * Month-by-month amortization schedule, rolled up into one row per year.
 * Each row: { year, interest, principal, balance }
 */
export function amortizationByYear(principal, annualRate, years) {
  const payment = monthlyPayment(principal, annualRate, years);
  const r = annualRate / 12;
  const rows = [];
  let balance = principal;

  for (let year = 1; year <= years; year++) {
    let interest = 0;
    let paid = 0;
    for (let m = 0; m < 12; m++) {
      const i = balance * r;
      const p = Math.min(payment - i, balance);
      interest += i;
      paid += p;
      balance -= p;
    }
    rows.push({ year, interest, principal: paid, balance: Math.max(balance, 0) });
  }
  return rows;
}

/**
 * Full monthly cost of owning a home, broken down by category.
 * PMI is charged only when the down payment is under 20%.
 */
export function monthlyCostBreakdown({
  price,
  downPayment,
  rate,
  years,
  propertyTaxRate, // yearly, as a decimal of home price
  insurancePerYear,
  hoaPerMonth = 0,
  pmiRate = 0.005, // yearly, as a decimal of the loan
}) {
  const loan = Math.max(price - downPayment, 0);
  const needsPmi = downPayment / price < 0.2;
  const parts = {
    principalAndInterest: monthlyPayment(loan, rate, years),
    propertyTax: (price * propertyTaxRate) / 12,
    insurance: insurancePerYear / 12,
    hoa: hoaPerMonth,
    pmi: needsPmi ? (loan * pmiRate) / 12 : 0,
  };
  const total = Object.values(parts).reduce((a, b) => a + b, 0);
  return { ...parts, total, loan };
}

/**
 * Most expensive home someone can afford under the common lender "28/36 rule":
 *   - housing costs ≤ 28% of gross monthly income
 *   - housing + other debt payments ≤ 36% of gross monthly income
 * Solved with binary search, because taxes/PMI make the cost non-linear in price.
 */
export function maxAffordablePrice({
  annualIncome,
  monthlyDebts,
  downPayment,
  rate,
  years,
  propertyTaxRate,
  insurancePerYear,
  hoaPerMonth = 0,
}) {
  const monthlyIncome = annualIncome / 12;
  const budget = Math.min(0.28 * monthlyIncome, 0.36 * monthlyIncome - monthlyDebts);
  if (budget <= 0) return { price: 0, budget: 0 };

  const costAt = (price) =>
    monthlyCostBreakdown({
      price,
      downPayment: Math.min(downPayment, price),
      rate,
      years,
      propertyTaxRate,
      insurancePerYear,
      hoaPerMonth,
    }).total;

  let lo = 0;
  let hi = 20_000_000;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (costAt(mid) <= budget) lo = mid;
    else hi = mid;
  }
  return { price: lo, budget };
}

/**
 * Rent vs. buy, simulated month by month.
 *
 * The fair comparison: both people start with the same cash.
 *   - The buyer spends it on the down payment + closing costs.
 *   - The renter invests it instead.
 * Each month, whoever has the cheaper housing cost invests the difference.
 * Net worth for the buyer counts home equity after paying selling costs.
 *
 * Returns one row per year plus the first year buying comes out ahead (or null).
 */
export function rentVsBuy({
  price,
  downPayment,
  rate,
  years: loanYears,
  propertyTaxRate,
  insurancePerYear,
  hoaPerMonth = 0,
  pmiRate = 0.005,
  monthlyRent,
  rentGrowth = 0.03,
  appreciation = 0.035,
  investReturn = 0.06,
  maintenanceRate = 0.01,
  closingCostRate = 0.03,
  sellingCostRate = 0.06,
  horizonYears = 15,
}) {
  const loan = price - downPayment;
  const r = rate / 12;
  const payment = monthlyPayment(loan, rate, loanYears);
  const monthlyGrowth = Math.pow(1 + investReturn, 1 / 12) - 1;
  const monthlyAppreciation = Math.pow(1 + appreciation, 1 / 12) - 1;

  let balance = loan;
  let homeValue = price;
  let rent = monthlyRent;
  let renterPortfolio = downPayment + price * closingCostRate;
  let buyerPortfolio = 0;

  const rows = [];
  let breakEvenYear = null;

  for (let month = 1; month <= horizonYears * 12; month++) {
    // Buyer's month
    const interest = balance * r;
    const principalPaid = balance > 0 ? Math.min(payment - interest, balance) : 0;
    balance -= principalPaid;
    const pmi = balance / price > 0.8 ? (loan * pmiRate) / 12 : 0;
    const ownCost =
      (balance > 0 || principalPaid > 0 ? payment : 0) +
      (homeValue * propertyTaxRate) / 12 +
      insurancePerYear / 12 +
      hoaPerMonth +
      (homeValue * maintenanceRate) / 12 +
      pmi;

    // Both portfolios grow, then the cheaper side invests the savings
    renterPortfolio *= 1 + monthlyGrowth;
    buyerPortfolio *= 1 + monthlyGrowth;
    if (ownCost > rent) renterPortfolio += ownCost - rent;
    else buyerPortfolio += rent - ownCost;

    homeValue *= 1 + monthlyAppreciation;

    if (month % 12 === 0) {
      const year = month / 12;
      const buyerNetWorth = homeValue * (1 - sellingCostRate) - balance + buyerPortfolio;
      rows.push({ year, buyerNetWorth, renterNetWorth: renterPortfolio, homeValue, balance, rent });
      if (breakEvenYear === null && buyerNetWorth >= renterPortfolio) breakEvenYear = year;
      rent *= 1 + rentGrowth;
    }
  }

  return { rows, breakEvenYear };
}
