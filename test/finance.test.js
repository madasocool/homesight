// Run with: npm test   (uses Node's built-in test runner, no installs needed)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  monthlyPayment,
  amortizationByYear,
  monthlyCostBreakdown,
  maxAffordablePrice,
  rentVsBuy,
} from "../src/finance.js";

const close = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} ≈ ${b}`);

test("monthly payment matches a known bank figure", () => {
  // $300,000 at 6.5% for 30 years is $1,896.20/month
  close(monthlyPayment(300_000, 0.065, 30), 1896.2);
});

test("zero interest just splits the loan evenly", () => {
  close(monthlyPayment(120_000, 0, 10), 1000);
});

test("amortization pays the loan down to zero", () => {
  const rows = amortizationByYear(250_000, 0.07, 30);
  assert.equal(rows.length, 30);
  close(rows.at(-1).balance, 0, 0.5);
  const totalPrincipal = rows.reduce((s, r) => s + r.principal, 0);
  close(totalPrincipal, 250_000, 0.5);
});

test("early payments are mostly interest, late ones mostly principal", () => {
  const rows = amortizationByYear(400_000, 0.065, 30);
  assert.ok(rows[0].interest > rows[0].principal);
  assert.ok(rows.at(-1).principal > rows.at(-1).interest);
});

test("PMI only applies under 20% down", () => {
  const base = { price: 500_000, rate: 0.065, years: 30, propertyTaxRate: 0.012, insurancePerYear: 1800 };
  assert.ok(monthlyCostBreakdown({ ...base, downPayment: 50_000 }).pmi > 0);
  assert.equal(monthlyCostBreakdown({ ...base, downPayment: 100_000 }).pmi, 0);
});

test("affordable price fits inside the 28% budget", () => {
  const input = {
    annualIncome: 120_000,
    monthlyDebts: 0,
    downPayment: 80_000,
    rate: 0.065,
    years: 30,
    propertyTaxRate: 0.012,
    insurancePerYear: 1800,
  };
  const { price, budget } = maxAffordablePrice(input);
  close(budget, 2800);
  const cost = monthlyCostBreakdown({ ...input, price }).total;
  close(cost, budget, 1);
});

test("big car payment lowers what you can afford (36% rule kicks in)", () => {
  const input = {
    annualIncome: 120_000,
    downPayment: 80_000,
    rate: 0.065,
    years: 30,
    propertyTaxRate: 0.012,
    insurancePerYear: 1800,
  };
  const noDebt = maxAffordablePrice({ ...input, monthlyDebts: 0 }).price;
  const withDebt = maxAffordablePrice({ ...input, monthlyDebts: 1500 }).price;
  assert.ok(withDebt < noDebt);
});

test("rent vs buy: cheap rent means renting wins, expensive rent means buying wins", () => {
  const base = {
    price: 500_000,
    downPayment: 100_000,
    rate: 0.065,
    years: 30,
    propertyTaxRate: 0.012,
    insurancePerYear: 1800,
    horizonYears: 15,
  };
  const cheapRent = rentVsBuy({ ...base, monthlyRent: 1200 });
  const pricyRent = rentVsBuy({ ...base, monthlyRent: 4000 });
  assert.equal(cheapRent.rows.length, 15);
  assert.ok(cheapRent.rows.at(-1).renterNetWorth > cheapRent.rows.at(-1).buyerNetWorth);
  assert.ok(pricyRent.breakEvenYear !== null);
});
