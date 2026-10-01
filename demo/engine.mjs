export const METHODS = {
  average: {
    name: "Recent average",
    short: "Average",
    description:
      "The mean of the last 3 months, held constant. A simple, steady baseline.",
  },
  naive: {
    name: "Last month repeats",
    short: "Last month",
    description:
      "Repeats the most recent observation. The simplest benchmark to beat.",
  },
  trend: {
    name: "Linear trend",
    short: "Trend",
    description:
      "Fits a least-squares line to the last 12 months. Extends that line, clipping negative counts to zero.",
  },
  seasonal: {
    name: "Same month last year",
    short: "Seasonal",
    description:
      "Repeats the corresponding month from the previous year. Useful only when a seasonal pattern persists.",
  },
};
export const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
export const sum = (a) => a.reduce((s, v) => s + v, 0);
export function addMonth(month, n) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}
export function forecast(values, horizon, method = "average") {
  if (
    !Array.isArray(values) ||
    values.length < 3 ||
    values.some((v) => !Number.isFinite(v) || v < 0) ||
    !Number.isInteger(horizon) ||
    horizon < 1 ||
    horizon > 12 ||
    !Object.hasOwn(METHODS, method)
  )
    throw Error("Invalid forecast inputs.");
  if (method === "seasonal" && values.length < 12)
    throw Error("Seasonal forecasts need 12 months.");
  const recent = values.slice(-12),
    center = (recent.length - 1) / 2,
    avg = mean(recent);
  const slope =
    recent.reduce((s, v, i) => s + (i - center) * (v - avg), 0) /
    recent.reduce((s, _, i) => s + (i - center) ** 2, 0);
  return Array.from({ length: horizon }, (_, i) =>
    Math.max(
      0,
      Math.round(
        method === "average"
          ? mean(values.slice(-3))
          : method === "naive"
            ? values.at(-1)
            : method === "seasonal"
              ? values[values.length - 12 + i]
              : avg + slope * (recent.length + i - center),
      ),
    ),
  );
}
/** Expanding-window one-step validation. No future value enters its training set. */
export function backtest(values, holdout = 6) {
  if (
    !Array.isArray(values) ||
    values.length < 18 ||
    !Number.isInteger(holdout) ||
    holdout < 1 ||
    values.length - holdout < 12
  )
    throw Error("At least 18 months are needed for model comparison.");
  const actual = values.slice(-holdout);
  return Object.keys(METHODS)
    .map((method) => {
      const predicted = actual.map(
        (_, i) =>
          forecast(values.slice(0, values.length - holdout + i), 1, method)[0],
      );
      const errors = actual.map((v, i) => Math.abs(v - predicted[i]));
      return {
        method,
        actual,
        predicted,
        errors,
        mae: mean(errors),
        wape: sum(actual) === 0 ? null : (sum(errors) / sum(actual)) * 100,
      };
    })
    .sort((a, b) => a.mae - b.mae);
}
export function plan(future, { capacity, lift = 0, backlog = 0 }) {
  if (
    !Array.isArray(future) ||
    !future.length ||
    future.some((v) => !Number.isFinite(v) || v < 0) ||
    ![capacity, lift, backlog].every(Number.isFinite) ||
    capacity < 0 ||
    backlog < 0 ||
    lift < -100 ||
    lift > 200
  )
    throw Error("Invalid planning assumptions.");
  let queue = backlog;
  return future.map((v, i) => {
    const arrivals = Math.round(v * (1 + lift / 100)),
      start = queue;
    const handled = Math.min(start + arrivals, capacity);
    queue = Math.max(0, start + arrivals - capacity);
    return { month: i + 1, arrivals, capacity, handled, backlog: queue };
  });
}
export function summarize(values) {
  const recent = sum(values.slice(-3)),
    previous = sum(values.slice(-6, -3));
  return {
    total: sum(values),
    recent,
    previous,
    change: previous === 0 ? null : ((recent - previous) / previous) * 100,
    peak: Math.max(...values),
    peakIndex: values.indexOf(Math.max(...values)),
  };
}
export function validateRows(rows) {
  if (!Array.isArray(rows) || rows.length < 18 || rows.length > 120)
    throw Error("Use 18 to 120 complete monthly rows.");
  const sorted = rows
    .map((r, i) => {
      if (
        !/^\d{4}-(0[1-9]|1[0-2])$/.test(r.month) ||
        Number(r.month.slice(0, 4)) < 2000 ||
        Number(r.month.slice(0, 4)) > 2099
      )
        throw Error(
          `Row ${i + 2}: month must be YYYY-MM between 2000 and 2099.`,
        );
      for (const key of ["issues", "pulls"])
        if (!Number.isSafeInteger(r[key]) || r[key] < 0 || r[key] > 1000000)
          throw Error(
            `Row ${i + 2}: ${key} must be a whole number from 0 to 1,000,000.`,
          );
      return { month: r.month, issues: r.issues, pulls: r.pulls };
    })
    .sort((a, b) => a.month.localeCompare(b.month));
  for (let i = 1; i < sorted.length; i++)
    if (addMonth(sorted[i - 1].month, 1) !== sorted[i].month)
      throw Error(
        "Months must be unique and consecutive. Add missing months explicitly; do not guess zeros.",
      );
  return sorted;
}
export function parseCSV(text) {
  if (typeof text !== "string" || text.length > 100000)
    throw Error("CSV must be smaller than 100 KB.");
  const lines = text
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/);
  const cells = (line) =>
    line.split(",").map((s) => s.trim().replace(/^"([^"\r\n]*)"$/, "$1"));
  if (cells(lines[0]).join(",") !== "month,issues,pulls")
    throw Error(
      "The header must be month,issues,pulls. Download the example CSV to get started.",
    );
  return validateRows(
    lines.slice(1).map((line, i) => {
      const c = cells(line);
      if (c.length !== 3 || !/^\d+$/.test(c[1]) || !/^\d+$/.test(c[2]))
        throw Error(
          `Row ${i + 2}: use month and two non-negative whole numbers.`,
        );
      return { month: c[0], issues: Number(c[1]), pulls: Number(c[2]) };
    }),
  );
}
export function toCSV(rows) {
  return (
    "month,issues,pulls\n" +
    rows.map((r) => `${r.month},${r.issues},${r.pulls}`).join("\n") +
    "\n"
  );
}
