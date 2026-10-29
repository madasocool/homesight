// app.js — reads the form, runs the math in finance.js, and updates the page.
import {
  monthlyCostBreakdown,
  amortizationByYear,
  maxAffordablePrice,
  rentVsBuy,
} from "./finance.js";
import { drawLineChart } from "./chart.js";

const $ = (id) => document.getElementById(id);
const num = (id) => parseFloat($(id).value) || 0;
const pct = (id) => num(id) / 100;
const money = (v) =>
  v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const color = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// Inputs shared by every tab
function homeInputs() {
  return {
    price: num("price"),
    downPayment: num("down"),
    rate: pct("rate"),
    years: num("term"),
    propertyTaxRate: pct("tax"),
    insurancePerYear: num("ins"),
    hoaPerMonth: num("hoa"),
  };
}

function renderCost() {
  const input = homeInputs();
  const cost = monthlyCostBreakdown(input);

  $("costTotal").textContent = `${money(cost.total)} / month`;
  const lines = [
    ["Principal & interest", cost.principalAndInterest],
    ["Property tax", cost.propertyTax],
    ["Home insurance", cost.insurance],
    ["HOA", cost.hoa],
    ["PMI", cost.pmi],
  ];
  $("costBreakdown").innerHTML = lines
    .filter(([, v]) => v > 0)
    .map(([name, v]) => `<li><span>${name}</span><strong>${money(v)}</strong></li>`)
    .join("");

  $("pmiNote").textContent =
    cost.pmi > 0
      ? `You're putting down less than 20%, so lenders add PMI (mortgage insurance). It goes away once you own 20% of the home.`
      : "";

  const rows = amortizationByYear(cost.loan, input.rate, input.years);
  drawLineChart(
    $("amortChart"),
    rows.map((r) => `Yr ${r.year}`),
    [
      { name: "Loan balance", values: rows.map((r) => r.balance), color: color("--accent") },
      { name: "Interest paid that year", values: rows.map((r) => r.interest), color: color("--accent-2") },
    ]
  );
}

function renderAfford() {
  const { price: _ignored, ...rest } = homeInputs();
  const { price, budget } = maxAffordablePrice({
    ...rest,
    annualIncome: num("income"),
    monthlyDebts: num("debts"),
  });

  $("affordPrice").textContent = money(price);
  $("affordDetail").textContent =
    budget > 0
      ? `That keeps your total housing cost at about ${money(budget)} / month with ${money(rest.downPayment)} down.`
      : "Your current debt payments already use up the 36% limit.";
}

function renderRentVsBuy() {
  const { rows, breakEvenYear } = rentVsBuy({
    ...homeInputs(),
    monthlyRent: num("rent"),
    rentGrowth: pct("rentGrowth"),
    appreciation: pct("appr"),
    investReturn: pct("invest"),
    horizonYears: Math.min(Math.max(num("horizon"), 1), 30),
  });

  const last = rows.at(-1);
  const gap = Math.abs(last.buyerNetWorth - last.renterNetWorth);
  const winner = last.buyerNetWorth >= last.renterNetWorth ? "Buying" : "Renting";
  $("rvbVerdict").textContent =
    `${winner} wins by ${money(gap)}` +
    (breakEvenYear ? ` · buying breaks even in year ${breakEvenYear}` : "");

  drawLineChart(
    $("rvbChart"),
    rows.map((r) => `Yr ${r.year}`),
    [
      { name: "Buyer", values: rows.map((r) => r.buyerNetWorth), color: color("--accent") },
      { name: "Renter", values: rows.map((r) => r.renterNetWorth), color: color("--accent-2") },
    ]
  );
}

const renderers = { cost: renderCost, afford: renderAfford, rvb: renderRentVsBuy };
let activeTab = "cost";

function render() {
  renderers[activeTab]();
}

// Tab switching
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    activeTab = btn.dataset.tab;
    document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b === btn));
    document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.id === `panel-${activeTab}`));
    render();
  });
});

// Recalculate live as the user types
document.querySelectorAll("input, select").forEach((el) => el.addEventListener("input", render));
window.addEventListener("resize", render);

render();
