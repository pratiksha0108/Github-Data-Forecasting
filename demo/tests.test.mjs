import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  forecast,
  backtest,
  plan,
  parseCSV,
  toCSV,
  validateRows,
  addMonth,
  summarize,
  METHODS,
} from "./engine.mjs";
const rows = Array.from({ length: 24 }, (_, i) => ({
  month: addMonth("2024-01", i),
  issues: i + 1,
  pulls: i * 2,
}));
const series = rows.map((r) => r.issues);

test("linear forecast extends an exact line", () =>
  assert.deepEqual(forecast(series, 3, "trend"), [25, 26, 27]));
test("recent average uses only the last three months", () =>
  assert.deepEqual(forecast(series, 3, "average"), [23, 23, 23]));
test("naive baseline repeats last observed value", () =>
  assert.deepEqual(forecast(series, 3, "naive"), [24, 24, 24]));
test("seasonal method maps next month to matching month last year", () =>
  assert.deepEqual(forecast(series, 3, "seasonal"), [13, 14, 15]));
test("trend clips negative projections at zero", () =>
  assert.deepEqual(forecast([6, 3, 0], 3, "trend"), [0, 0, 0]));
test("zero activity is supported by every model", () => {
  for (const m of Object.keys(METHODS))
    assert.deepEqual(forecast(Array(24).fill(0), 3, m), [0, 0, 0]);
});
test("reject invalid forecast values and horizons", () => {
  for (const args of [
    [[1, 2], 3, "trend"],
    [[1, NaN, 3], 3, "trend"],
    [[1, -1, 3], 3, "trend"],
    [series, 0, "trend"],
    [series, 13, "trend"],
    [series, 3, "unknown"],
    [[1, 2, 3], 3, "seasonal"],
  ])
    assert.throws(() => forecast(...args));
});
test("backtest creates exactly six forward-only predictions per method", () => {
  for (const result of backtest(series))
    for (let i = 0; i < 6; i++)
      assert.equal(
        result.predicted[i],
        forecast(series.slice(0, 18 + i), 1, result.method)[0],
      );
});
test("future shock does not alter earlier predictions", () => {
  const altered = [...series];
  altered[23] = 900;
  for (const original of backtest(series)) {
    const other = backtest(altered).find((x) => x.method === original.method);
    assert.deepEqual(other.predicted, original.predicted);
  }
});
test("one-step naive error and WAPE have correct denominator", () => {
  const r = backtest(series).find((x) => x.method === "naive");
  assert.equal(r.mae, 1);
  assert.equal(r.wape, (6 / (19 + 20 + 21 + 22 + 23 + 24)) * 100);
});
test("WAPE is undefined when holdout actual total is zero", () => {
  for (const r of backtest(Array(24).fill(0))) assert.equal(r.wape, null);
});
test("leaderboard sorted by MAE, stable method tie order", () =>
  assert.deepEqual(
    backtest(Array(24).fill(0)).map((x) => x.method),
    Object.keys(METHODS),
  ));
test("short backtests and invalid holdout lengths reject", () => {
  assert.throws(() => backtest([1, 2, 3]));
  assert.throws(() => backtest(series, 0));
  assert.throws(() => backtest(series, 20));
});
test("capacity carries queue forward without losing units", () => {
  const p = plan([10, 20, 5], { capacity: 12, backlog: 4, lift: 0 });
  assert.deepEqual(
    p.map((x) => x.backlog),
    [2, 10, 3],
  );
  assert.equal(4 + 35 - p.reduce((s, x) => s + x.handled, 0), 3);
});
test("capacity never handles more work than available", () =>
  assert.equal(plan([5], { capacity: 20, backlog: 0 })[0].handled, 5));
test("volume shock scales arrivals and zero capacity is valid", () =>
  assert.deepEqual(
    plan([10, 20], { capacity: 0, lift: 50 }).map((x) => x.backlog),
    [15, 45],
  ));
test("invalid assumptions reject", () => {
  assert.throws(() => plan([2], { capacity: -1 }));
  assert.throws(() => plan([2], { capacity: 1, lift: 201 }));
  assert.throws(() => plan([], { capacity: 1 }));
});
test("month arithmetic rolls through year boundary", () =>
  assert.equal(addMonth("2025-12", 1), "2026-01"));
test("CSV export roundtrips exactly", () =>
  assert.deepEqual(parseCSV(toCSV(rows)), rows));
test("CSV parser accepts BOM, CRLF, quoted values and unsorted rows", () => {
  const csv = toCSV([...rows].reverse())
    .replaceAll("\n", "\r\n")
    .replace("2024-01", '"2024-01"');
  assert.deepEqual(parseCSV("\uFEFF" + csv), rows);
});
test("CSV parser rejects missing and duplicate months", () => {
  assert.throws(
    () => parseCSV(toCSV(rows.filter((_, i) => i !== 10))),
    /consecutive/,
  );
  assert.throws(() => parseCSV(toCSV([...rows, rows[0]])), /unique/);
});
test("CSV rejects formulas, decimal counts, missing values and headers", () => {
  for (const bad of [
    "2024-01,=1+1,2",
    "2024-01,1.2,2",
    "2024-01,,2",
    "2024-01,-1,2",
    "2024-01,1,2,3",
  ])
    assert.throws(() =>
      parseCSV(
        "month,issues,pulls\n" +
          bad +
          "\n" +
          toCSV(rows.slice(1)).split("\n").slice(1).join("\n"),
      ),
    );
  assert.throws(() =>
    parseCSV(toCSV(rows).replace("month,issues,pulls", "date,a,b")),
  );
});
test("CSV rejects invalid dates, huge values, tiny or oversized files", () => {
  assert.throws(() =>
    validateRows(
      rows.map((r, i) => (i === 0 ? { ...r, month: "2024-13" } : r)),
    ),
  );
  assert.throws(() =>
    validateRows(rows.map((r, i) => (i === 0 ? { ...r, issues: 1000001 } : r))),
  );
  assert.throws(() => parseCSV(toCSV(rows.slice(0, 5))));
  assert.throws(() => parseCSV("x".repeat(100001)));
});
test("all bundled snapshots validate, aggregate totals reconcile", () => {
  const snapshot = JSON.parse(
    readFileSync(new URL("./data/snapshot.json", import.meta.url)),
  );
  assert.equal(snapshot.repositories.length, 2);
  for (const repo of snapshot.repositories) {
    assert.equal(validateRows(repo.months).length, 36);
    assert.equal(
      repo.months.reduce((s, r) => s + r.issues + r.pulls, 0),
      repo.audit.included,
    );
    assert.equal(repo.audit.boundaryReached, true);
    assert.match(repo.audit.recordsSha256, /^[a-f0-9]{64}$/);
    for (const metric of ["issues", "pulls"])
      assert.equal(backtest(repo.months.map((r) => r[metric])).length, 4);
  }
});
test("source DOM uses local scripts and no active tracking libraries", () => {
  const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
  assert.match(html, /src="\.\/app\.js"/);
  assert.match(html, /name="viewport"/);
  assert.match(
    readFileSync(new URL("./style.css", import.meta.url), "utf8"),
    /prefers-reduced-motion/,
  );
});
test("summary handles zero prior baseline without infinite growth", () =>
  assert.equal(summarize([0, 0, 0, 2, 3, 4]).change, null));
