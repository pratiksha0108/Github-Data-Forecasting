import { $, esc, announce } from "./common.mjs";
import {
  METHODS,
  forecast,
  backtest,
  plan,
  summarize,
  mean,
  sum,
  parseCSV,
  toCSV,
  addMonth,
  validateRows,
} from "./engine.mjs";

const state = {
  view: "overview",
  metric: "issues",
  repo: "flask",
  method: "average",
  horizon: 3,
  capacity: 10,
  lift: 0,
  backlog: 0,
  tour: -1,
};
let snapshot,
  repositories = [];
const fmt = (n) =>
  Number(n).toLocaleString("en-US", { maximumFractionDigits: 1 });
const month = (m) =>
  new Date(m + "-01T12:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
const repository = () => repositories.find((r) => r.id === state.repo);
const rows = () => repository().months;
const values = () => rows().map((r) => r[state.metric]);
const metricName = () =>
  state.metric === "issues" ? "issues" : "pull requests";
const metricLabel = () =>
  state.metric === "issues" ? "Issues opened" : "Pull requests opened";
const future = () => forecast(values(), state.horizon, state.method);
const scores = () => backtest(values());
const horizonMonths = () =>
  Array.from({ length: state.horizon }, (_, i) =>
    addMonth(rows().at(-1).month, i + 1),
  );
const button = (label, action, cls = "secondary") =>
  '<button class="' +
  cls +
  '" data-action="' +
  action +
  '">' +
  label +
  "</button>";
function save(name, content, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function chooseDefaults() {
  state.method = scores()[0].method;
  state.capacity = Math.max(1, Math.round(mean(values().slice(-3))));
  state.lift = 0;
  state.backlog = 0;
}
function info(title, html) {
  $("#dialog-title").textContent = title;
  $("#dialog-body").innerHTML = html;
  $("#info-dialog").showModal();
}
function dataMeta() {
  const r = repository();
  $("#dataset-meta").innerHTML =
    "<strong>● " +
    (r.custom ? "Your local dataset" : "Verified source snapshot") +
    "</strong><br>" +
    month(r.months[0].month) +
    " – " +
    month(r.months.at(-1).month) +
    " · " +
    r.months.length +
    " months";
}
function changeView(view, focus = false) {
  state.view = view;
  document
    .querySelectorAll("[data-view]")
    .forEach((el) =>
      el.setAttribute(
        "aria-current",
        el.dataset.view === view ? "page" : "false",
      ),
    );
  render();
  if (focus) {
    $("#view-title").focus({ preventScroll: true });
    $("#view-title").scrollIntoView({block:"start",behavior:"auto"});
  }
}
function heading(title, description, badge) {
  return (
    '<div class="section-heading"><div><h2 id="view-title" tabindex="-1">' +
    title +
    "</h2><p>" +
    description +
    '</p></div><span class="pill">' +
    badge +
    "</span></div>"
  );
}
function chart(history, projection = [], labels = [], comparison = null) {
  const all = [...history, ...projection],
    maximum = Math.max(1, ...all, ...(comparison || [])) * 1.18;
  const W = 660,
    H = 252,
    left = 34,
    right = 20,
    top = 18,
    bottom = 34;
  const x = (i) =>
      left + (i / Math.max(1, all.length - 1)) * (W - left - right),
    y = (v) => H - bottom - (v / maximum) * (H - top - bottom);
  const path = (v, start = 0) =>
    v
      .map(
        (n, i) =>
          (i ? "L" : "M") + x(start + i).toFixed(2) + "," + y(n).toFixed(2),
      )
      .join(" ");
  let svg =
    '<svg class="chart" viewBox="0 0 ' +
    W +
    " " +
    H +
    '" role="group" aria-label="Interactive monthly activity chart. Tab to points or inspect the data table.">';
  svg +=
    '<defs><linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#a18beb" stop-opacity=".22"/><stop offset="1" stop-color="#a18beb" stop-opacity="0"/></linearGradient></defs>';
  if (projection.length)
    svg +=
      '<rect x="' +
      x(history.length - 1) +
      '" y="8" width="' +
      (W - right - x(history.length - 1)) +
      '" height="' +
      (H - bottom - 8) +
      '" fill="#f5f1ff" rx="5"/><text x="' +
      (x(history.length - 1) + 9) +
      '" y="20">FORECAST</text>';
  for (let i = 0; i < 4; i++) {
    const v = (maximum * i) / 3,
      yy = y(v);
    svg +=
      '<line x1="' +
      left +
      '" x2="' +
      (W - right) +
      '" y1="' +
      yy +
      '" y2="' +
      yy +
      '" stroke="#eeeaf3" stroke-dasharray="3 4"/><text x="0" y="' +
      (yy + 3) +
      '">' +
      Math.round(v) +
      "</text>";
  }
  svg +=
    '<path d="' +
    path(history) +
    " L" +
    x(history.length - 1) +
    "," +
    (H - bottom) +
    " L" +
    left +
    "," +
    (H - bottom) +
    ' Z" fill="url(#area-fill)"/>';
  svg +=
    '<path class="line-draw" d="' +
    path(history) +
    '" fill="none" stroke="' +
    (comparison ? "#199580" : "#7961e8") +
    '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
  if (projection.length)
    svg +=
      '<path d="' +
      path([history.at(-1), ...projection], history.length - 1) +
      '" fill="none" stroke="#7961e8" stroke-width="2.5" stroke-dasharray="5 5"/>';
  if (comparison)
    svg +=
      '<path class="line-draw" d="' +
      path(comparison) +
      '" fill="none" stroke="#7961e8" stroke-width="2.5" stroke-dasharray="4 3"/>';
  all.forEach((v, i) => {
    const label =
      (labels[i] ? month(labels[i]) : String(i + 1)) +
      ": " +
      v +
      " " +
      (i < history.length ? "observed" : "projected") +
      " " +
      metricName() +
      (comparison ? ", model predicted " + comparison[i] : "");
    svg +=
      '<circle class="point" role="button" tabindex="0" aria-label="' +
      esc(label) +
      '" data-point="' +
      esc(label) +
      '" cx="' +
      x(i) +
      '" cy="' +
      y(v) +
      '" r="3.5" fill="white" stroke="' +
      (comparison ? "#199580" : "#7961e8") +
      '" stroke-width="1.5"/>';
  });
  const ticks = [
    0,
    Math.floor((all.length - 1) / 3),
    Math.floor((2 * (all.length - 1)) / 3),
    all.length - 1,
  ];
  [...new Set(ticks)].forEach(
    (i) =>
      (svg +=
        '<text x="' +
        x(i) +
        '" y="' +
        (H - 8) +
        '" text-anchor="' +
        (i === 0 ? "start" : i === all.length - 1 ? "end" : "middle") +
        '">' +
        (labels[i] ? month(labels[i]) : i + 1) +
        "</text>"),
  );
  return (
    svg +
    '</svg><p class="chart-readout" id="chart-readout">Hover, tap or tab to a point to inspect it.</p>'
  );
}
function overview() {
  const v = values(),
    s = summarize(v),
    f = future(),
    model = scores().find((x) => x.method === state.method);
  const delta =
    s.change === null
      ? "No prior baseline"
      : (s.change >= 0 ? "+" : "") + fmt(s.change) + "%";
  const direction =
    s.recent > s.previous
      ? "grew"
      : s.recent < s.previous
        ? "fell"
        : "held steady";
  return (
    heading(
      "Your signal, at a glance",
      "What changed, what might happen next, and what deserves a closer look.",
      "01 / EXPLORE",
    ) +
    '<div class="stats"><div class="stat"><div class="stat-top">Latest 3 months <span class="stat-symbol">↗</span></div><div class="stat-value">' +
    fmt(s.recent) +
    '</div><div class="stat-caption">' +
    metricName() +
    " · " +
    delta +
    ' vs prior 3</div></div><div class="stat"><div class="stat-top">Next ' +
    state.horizon +
    ' months <span class="stat-symbol">⌁</span></div><div class="stat-value">' +
    fmt(sum(f)) +
    '</div><div class="stat-caption">Projected · ' +
    METHODS[state.method].short +
    ' baseline</div></div><div class="stat"><div class="stat-top">Test before you trust <span class="stat-symbol">◎</span></div><div class="stat-value">' +
    fmt(model.mae) +
    '</div><div class="stat-caption">Avg. absolute error · ' +
    metricName() +
    "/month</div></div></div>" +
    '<div class="content-grid"><section class="panel"><div class="panel-head"><div><h3>From history to possibility</h3><p class="sub">' +
    esc(repository().name) +
    " · " +
    metricLabel() +
    '</p></div><span class="pill green">' +
    (repository().custom ? "Local import" : "Source-backed") +
    '</span></div><div class="legend"><span>Observed</span><span class="future">Projected, not guaranteed</span></div><div class="chart-controls"><label for="horizon">Look ahead</label><select id="horizon"><option value="3" ' +
    (state.horizon === 3 ? "selected" : "") +
    '>3 months</option><option value="6" ' +
    (state.horizon === 6 ? "selected" : "") +
    '>6 months</option></select><label for="model-choice">Method</label><select id="model-choice">' +
    Object.entries(METHODS)
      .map(
        ([k, m]) =>
          '<option value="' +
          k +
          '" ' +
          (state.method === k ? "selected" : "") +
          ">" +
          m.short +
          "</option>",
      )
      .join("") +
    '</select></div><div class="chart-wrap">' +
    chart(v, f, [...rows().map((r) => r.month), ...horizonMonths()]) +
    '</div><div class="chart-foot"><p>Forecasts start after the snapshot.<br>Counts measure activity, not productivity.</p>' +
    button("Inspect data ↗", "data", "text-button") +
    "</div></section>" +
    '<aside class="panel notes"><span class="note-icon" aria-hidden="true">✦</span><h3>The analyst’s<br>notebook.</h3><p>Incoming ' +
    metricName() +
    " <strong>" +
    direction +
    "</strong>: " +
    s.recent +
    " in the latest quarter versus " +
    s.previous +
    " in the previous one.</p><p>The busiest recorded month was <strong>" +
    month(rows()[s.peakIndex].month) +
    "</strong>, with " +
    s.peak +
    " " +
    metricName() +
    '.</p><hr class="note-divider"><p><strong>Before you act</strong><br>A spike could mean adoption, a release, or a reporting change. Counts alone cannot tell us why.</p>' +
    button("Test the forecast →", "models", "primary") +
    "</aside></div>" +
    '<section class="panel rhythm"><div class="panel-head"><div><h3>The activity rhythm</h3><p class="sub">Every tile is a month. Darker means more activity. Select a tile to inspect it.</p></div><span class="pill">' +
    rows().length +
    ' observations</span></div><div class="heatmap">' +
    rows()
      .map((r, i) => {
        const t = s.peak === 0 ? 0 : r[state.metric] / s.peak;
        return (
          '<button data-heat="' +
          i +
          '" style="background:rgb(' +
          Math.round(241 - t * 134) +
          "," +
          Math.round(237 - t * 158) +
          "," +
          Math.round(252 - t * 53) +
          ");color:" +
          (t > 0.6 ? "#fff" : "#544776") +
          '" aria-label="' +
          month(r.month) +
          ": " +
          r[state.metric] +
          " " +
          metricName() +
          '">' +
          r[state.metric] +
          "</button>"
        );
      })
      .join("") +
    '</div><div class="heatmap-labels"><span>' +
    month(rows()[0].month) +
    "</span><span>Read left to right, then down</span><span>" +
    month(rows().at(-1).month) +
    '</span></div><p class="sub" id="heat-readout">Look for persistence, not just a single spike.</p></section>'
  );
}
function models() {
  const results = scores(),
    winner = results[0],
    selected = results.find((x) => x.method === state.method),
    baseline = results.find((x) => x.method === "naive"),
    testMonths = rows()
      .slice(-6)
      .map((r) => r.month);
  const improvement =
    baseline.mae === 0
      ? null
      : ((baseline.mae - winner.mae) / baseline.mae) * 100;
  return (
    heading(
      "Let the models earn your trust.",
      "Four transparent baselines. The same six unseen months. Lower error wins.",
      "02 / VALIDATE",
    ) +
    '<div class="method-layout"><section><div class="panel-head"><h3>One-step model leaderboard</h3><span class="pill">MAE ↓ is better</span></div>' +
    results
      .map(
        (r, i) =>
          '<button class="method-card ' +
          (state.method === r.method ? "selected" : "") +
          '" data-method="' +
          r.method +
          '" aria-pressed="' +
          (state.method === r.method) +
          '"><span class="method-top"><span class="method-name">' +
          (i === 0 ? "✦ " : "") +
          METHODS[r.method].name +
          '</span><span class="method-score">' +
          fmt(r.mae) +
          ' <small>MAE</small></span></span><span class="method-bottom"><span>' +
          (i === 0
            ? "Lowest error in this test"
            : "Click to inspect predictions") +
          "</span><span>" +
          (r.wape === null ? "WAPE not defined" : fmt(r.wape) + "% WAPE") +
          '</span></span><div class="method-meter"><i style="width:' +
          Math.max(
            3,
            (100 * r.mae) / Math.max(1, ...results.map((r) => r.mae)),
          ) +
          '%"></i></div></button>',
      )
      .join("") +
    '<p class="wide-note">MAE = average absolute miss in ' +
    metricName() +
    " per month. WAPE = total absolute error ÷ total observed counts. These are error measures, not “accuracy scores.” Ties follow the listed method order.</p></section>" +
    '<section class="panel"><div class="panel-head"><div><h3>Prediction meets reality</h3><p class="sub">' +
    month(testMonths[0]) +
    " to " +
    month(testMonths.at(-1)) +
    " · " +
    METHODS[state.method].name +
    '</p></div></div><div class="legend"><span class="actual">Actually observed</span><span>Predicted one month earlier</span></div>' +
    chart(selected.actual, [], testMonths, selected.predicted) +
    '<div class="method-explainer"><strong>' +
    METHODS[state.method].name +
    "</strong>" +
    METHODS[state.method].description +
    '</div><details><summary>Inspect each prediction and error</summary><div class="table-scroll"><table><thead><tr><th>Month</th><th>Actual</th><th>Predicted</th><th>Absolute error</th></tr></thead><tbody>' +
    testMonths
      .map(
        (m, i) =>
          "<tr><td>" +
          month(m) +
          "</td><td>" +
          selected.actual[i] +
          "</td><td>" +
          selected.predicted[i] +
          "</td><td>" +
          selected.errors[i] +
          "</td></tr>",
      )
      .join("") +
    "</tbody></table></div></details></section></div>" +
    '<section class="panel rhythm"><div class="panel-head"><div><h3>A finding, not a victory lap.</h3><p class="sub">' +
    METHODS[winner.method].name +
    " has the lowest MAE for this series" +
    (improvement === null
      ? "."
      : ", " + fmt(improvement) + "% lower than repeating the last month.") +
    "</p></div>" +
    button("Plan with selected model →", "planning", "primary") +
    '</div><p class="wide-note">We train on earlier months, predict the next month, reveal its actual value, then expand the training window. No future observations are used. Six tests on one repository are limited evidence. Selecting the winner on these same tests introduces selection optimism; there is no separate final test set. One-month performance does not establish three- or six-month reliability.</p></section>'
  );
}
function planning() {
  return (
    heading(
      "Make the trade-off tangible.",
      "Adjust assumptions. Watch the queue change. Keep the decision honest.",
      "03 / DECIDE",
    ) +
    '<div class="plan-layout"><section class="panel"><h3>Your what-if controls 🎛️</h3><p class="sub">Hypothetical activity handling, not a staffing recommendation.</p><div class="slider-block"><label for="capacity">Monthly capacity <output id="capacity-value">' +
    state.capacity +
    '</output></label><input id="capacity" type="range" min="0" max="' +
    Math.max(50, Math.ceil(Math.max(...values(), ...future()) * 3)) +
    '" value="' +
    state.capacity +
    '"><div class="range-hints"><span>0 ' +
    metricName() +
    '</span><span>More capacity →</span></div></div><div class="slider-block"><label for="lift">Change in incoming volume <output id="lift-value">' +
    state.lift +
    '%</output></label><input id="lift" type="range" min="-50" max="100" step="5" value="' +
    state.lift +
    '"><div class="range-hints"><span>−50%</span><span>+100%</span></div></div><div class="slider-block"><label for="backlog">Starting queue <output id="backlog-value">' +
    state.backlog +
    '</output></label><input id="backlog" type="range" min="0" max="' +
    Math.max(100, Math.ceil(Math.max(...values()) * 5)) +
    '" value="' +
    state.backlog +
    '"><div class="range-hints"><span>Empty</span><span>Existing work →</span></div></div>' +
    button("Reset assumptions", "reset-plan") +
    '<div class="method-explainer"><strong>' +
    METHODS[state.method].name +
    " · " +
    state.horizon +
    " months</strong>Capacity begins at the rounded 3-month average. Starting queue is assumed zero, not observed. " +
    button("Change model ↗", "models", "text-button") +
    '</div></section><section class="panel" id="plan-output">' +
    planOutput() +
    "</section></div>" +
    '<p class="wide-note">The queue model treats each ' +
    (state.metric === "issues" ? "issue" : "pull request") +
    " as one equal unit, applies constant capacity each month, and carries unhandled units forward. It does not estimate effort, urgency, quality, staffing, or actual unresolved work in these repositories. No budget or time-savings claims are made.</p>"
  );
}
function planOutput() {
  const p = plan(future(), state),
    last = p.at(-1).backlog,
    total = sum(p.map((r) => r.arrivals));
  const max = Math.max(1, ...p.map((r) => Math.max(r.arrivals, r.capacity)));
  return (
    '<div class="plan-result ' +
    (last > 0 ? "warning" : "") +
    '"><span class="tiny">' +
    (last > 0
      ? "A QUEUE FORMS UNDER THESE ASSUMPTIONS"
      : "CAPACITY COVERS THIS SCENARIO") +
    '</span><div class="result-number">' +
    fmt(last) +
    "</div><h3>" +
    metricName() +
    " left in the simulated queue</h3><p>" +
    fmt(total) +
    " projected arrivals over " +
    state.horizon +
    " months. " +
    (last > 0
      ? "Try increasing capacity or reducing incoming volume."
      : "Try a volume shock to find the plan’s breaking point.") +
    '</p></div><div class="panel-head"><div><h3>Demand versus capacity</h3><p class="sub">The forecast is a starting point. Your assumptions drive the scenario.</p></div></div><div class="month-bars" role="img" aria-label="Monthly arrivals and capacity. Exact values in the table below.">' +
    p
      .map(
        (r, i) =>
          '<div class="bar-column"><div class="bar-pair"><i style="height:' +
          Math.max(2, (120 * r.arrivals) / max) +
          'px"></i><i style="height:' +
          Math.max(2, (120 * r.capacity) / max) +
          'px"></i></div><span>' +
          month(horizonMonths()[i]) +
          "</span></div>",
      )
      .join("") +
    '</div><div class="bar-legend"><span>Projected arrivals</span><span>Assumed capacity</span></div><div class="table-scroll"><table><thead><tr><th>Month</th><th>Arrivals</th><th>Handled</th><th>End queue</th></tr></thead><tbody>' +
    p
      .map(
        (r, i) =>
          "<tr><td>" +
          month(horizonMonths()[i]) +
          "</td><td>" +
          r.arrivals +
          "</td><td>" +
          r.handled +
          "</td><td>" +
          r.backlog +
          "</td></tr>",
      )
      .join("") +
    '</tbody></table></div><div class="planning-actions">' +
    button("↓ Download decision brief", "brief", "primary") +
    button("↓ Export scenario JSON", "scenario") +
    "</div>"
  );
}
function render() {
  dataMeta();
  $("#workspace").innerHTML =
    '<div class="view">' +
    { overview, models, planning }[state.view]() +
    "</div>";
  $("#workspace").setAttribute("aria-busy", "false");
}
function showSource() {
  const r = repository();
  info(
    "Know what you’re looking at.",
    '<span class="pill green">' +
      (r.custom ? "Locally imported data" : "Public GitHub metadata") +
      "</span><h3>Dataset: " +
      esc(r.name) +
      "</h3><p>" +
      month(rows()[0].month) +
      " through " +
      month(rows().at(-1).month) +
      ". " +
      rows().length +
      " consecutive UTC calendar months. Counts use creation timestamps; pull requests are separated from issues.</p>" +
      (r.custom
        ? "<p>This file was parsed in your browser. It was not uploaded. Its source, licensing and accuracy have not been independently verified. Refresh to remove it.</p>"
        : "<p>Retrieved " +
          esc(snapshot.retrievedAt.slice(0, 10)) +
          ". " +
          fmt(r.audit.included) +
          " records included across " +
          r.audit.pages +
          ' API pages. Pagination reached the start boundary. Only aggregate counts are published: no usernames, issue text or contact information.</p><p><a href="' +
          r.url +
          '" target="_blank" rel="noreferrer">Original repository ↗</a> · <a href="' +
          r.apiUrl +
          '?state=all&amp;sort=created&amp;direction=desc&amp;per_page=100" target="_blank" rel="noreferrer">Source API ↗</a></p>') +
      '<h3>What this can and cannot tell you</h3><p>Counts are activity signals, not productivity or quality scores. Deleted or transferred records may be absent. Opened does not mean unresolved. The snapshot is fixed, not a live feed. Both sample repositories belong to the Pallets ecosystem; they are not a representative sample of all software teams.</p><h3>Forecasting, without the black box</h3><p>Four deterministic statistical baselines run locally. Results are not LSTM, Prophet or generative AI outputs. The original repository’s separate services are not deployed here. Six expanding-window, one-step tests compare error, not causal impact. No confidence interval or production performance is claimed.</p><div class="dialog-actions">' +
      button("↓ Download monthly CSV", "csv") +
      button("Inspect every row", "data") +
      "</div>",
  );
}
function showData() {
  info(
    "The numbers behind the story.",
    "<p>" +
      esc(repository().name) +
      " · " +
      rows().length +
      ' monthly rows. Issues exclude pull requests. Each month is explicitly represented.</p><div class="info-tags"><span class="pill green">✓ Consecutive months</span><span class="pill green">✓ No duplicate months</span><span class="pill green">✓ Non-negative integers</span></div><div class="table-scroll"><table><thead><tr><th>UTC month</th><th>Issues opened</th><th>PRs opened</th></tr></thead><tbody>' +
      rows()
        .map(
          (r) =>
            "<tr><td>" +
            r.month +
            "</td><td>" +
            r.issues +
            "</td><td>" +
            r.pulls +
            "</td></tr>",
        )
        .join("") +
      '</tbody></table></div><div class="dialog-actions">' +
      button("↓ Download this CSV", "csv") +
      "</div>",
  );
}
function showImport() {
  info(
    "Your data. Your browser.",
    '<p>Bring a monthly activity export to run the same analysis. No account or API key needed. Nothing in this file is sent to a server.</p><div class="info-tags"><span class="pill">18–120 consecutive months</span><span class="pill">CSV · up to 100 KB</span></div><p>Header: <code>month,issues,pulls</code><br>Example row: <code>2025-01,24,18</code><br>Use YYYY-MM dates and non-negative whole-number counts. A zero must mean “no activity,” not “missing data.”</p>' +
      button("↓ Download example CSV", "csv") +
      '<div class="import-box"><label for="csv-file">Choose a monthly CSV file</label><input type="file" id="csv-file" accept=".csv,text/csv"></div><p id="import-message" class="import-error" role="alert"></p><p>Import replaces the current selection, not the bundled data. Switching repositories restores the original snapshot. Refresh removes your imported file.</p>',
  );
}
function showAbout() {
  info(
    "An analyst. An engineer. A product thinker.",
    '<p>Repo Radar asks a focused question: can a small team explore incoming activity, challenge a forecast, and discuss a capacity plan in one place?</p><div class="about-grid"><div><span class="eyebrow-number">01</span><strong>Data analysis</strong><p>Auditable source counts, separated measures, time-based validation, and explicit uncertainty.</p></div><div><span class="eyebrow-number">02</span><strong>Software</strong><p>A reproducible data pipeline, pure tested calculation functions, local CSV validation, accessible controls.</p></div><div><span class="eyebrow-number">03</span><strong>Product thinking</strong><p>A decision workflow, adjustable assumptions, and a portable brief with limitations attached.</p></div></div><h3>Hypothesis, not claimed traction</h3><p>A connected workflow may help technical leads explain a planning trade-off faster than switching between spreadsheets. This has not been validated with real customers. The next study would test task completion, interpretation errors and time-to-decision with engineering leads.</p><h3>Deliberate constraints</h3><p>Free static hosting. No login, tracking, external AI service, or live repository credentials. No individual performance ranking. Animated feedback respects reduced-motion settings.</p><p><a href="https://github.com/pratiksha0108/Github-Data-Forecasting/blob/main/docs/repo-radar-product-brief.md" target="_blank" rel="noreferrer">Read the product and evaluation brief ↗</a></p>',
  );
}
function scenario() {
  return {
    repository: repository().name,
    dataSource: repository().custom
      ? "User-provided local CSV"
      : "GitHub public metadata",
    snapshotEnd: rows().at(-1).month,
    measure: metricLabel(),
    method: METHODS[state.method].name,
    assumptions: {
      monthlyCapacity: state.capacity,
      volumeChangePercent: state.lift,
      startingQueue: state.backlog,
    },
    months: horizonMonths(),
    forecast: future(),
    scenario: plan(future(), state),
    validation: scores(),
    limitations: [
      "Not observed backlog. Equal-sized units and constant capacity.",
      "Six one-month backtests; longer-horizon reliability is untested.",
      "Activity is not productivity or effort. No causal or business outcome claims.",
    ],
  };
}
function brief() {
  const report = scenario(),
    selected = scores().find((s) => s.method === state.method);
  const content =
    "# Repo Radar | Decision brief\n\n" +
    "## Question\nCan assumed monthly capacity keep up with incoming " +
    metricName() +
    "?\n\n" +
    "## Evidence\n- Repository: " +
    report.repository +
    "\n- Source: " +
    report.dataSource +
    "\n- Observed through: " +
    report.snapshotEnd +
    "\n- Selected baseline: " +
    report.method +
    "\n- Six one-month test MAE: " +
    fmt(selected.mae) +
    " " +
    metricName() +
    "/month\n\n" +
    "## Scenario, not an operational forecast\n- Assumed monthly capacity: " +
    state.capacity +
    "\n- Incoming volume change: " +
    state.lift +
    "%\n- Assumed starting queue: " +
    state.backlog +
    "\n- Ending simulated queue: " +
    report.scenario.at(-1).backlog +
    "\n\n" +
    "| Month | Projected arrivals | Assumed capacity | Handled | End queue |\n|---|---:|---:|---:|---:|\n" +
    report.scenario
      .map(
        (r, i) =>
          "| " +
          report.months[i] +
          " | " +
          r.arrivals +
          " | " +
          r.capacity +
          " | " +
          r.handled +
          " | " +
          r.backlog +
          " |",
      )
      .join("\n") +
    "\n\n## Decision to investigate\n" +
    (report.scenario.at(-1).backlog > 0
      ? "This scenario accumulates work. Validate effort and actual throughput before changing capacity."
      : "This scenario covers the projected volume. Stress-test a demand shock before relying on it.") +
    "\n\n## Limitations\n" +
    report.limitations.map((x) => "- " + x).join("\n") +
    "\n- The winner is selected on the evaluation months, without a separate final test set.\n- No real users, staffing, costs, service-level or outcome data have been validated.\n\n## Next evidence to collect\nActual handling time, item complexity, urgency, and a new independent holdout period.\n";
  save("repo-radar-decision-brief.md", content, "text/markdown");
  announce("Decision brief downloaded with your assumptions and limitations.");
}
const tourSteps = [
  [
    "overview",
    "01 · Find the signal",
    "Choose Flask or Jinja, then inspect a point or activity tile. Notice the difference between observed history and the dashed forecast.",
  ],
  [
    "models",
    "02 · Challenge the forecast",
    "Select a model. Compare its predictions with the six held-out months. The lowest-error model is not automatically reliable.",
  ],
  [
    "planning",
    "03 · Make a decision worth discussing",
    "Move the incoming-volume slider. Find when a queue forms, then download a brief with your assumptions attached.",
  ],
];
function renderTour() {
  const t = tourSteps[state.tour];
  if (!t) {
    $("#tour").hidden = true;
    return;
  }
  $("#tour").hidden = false;
  $("#tour").innerHTML =
    "<p><strong>" +
    t[1] +
    "</strong>" +
    t[2] +
    "</p>" +
    button("Close", "tour-close") +
    button(
      state.tour === 2 ? "Finish tour ✓" : "Next step →",
      "tour-next",
      "primary",
    );
  changeView(t[0], true);
  $("#tour").scrollIntoView({block:"start",behavior:"auto"});
}
document.addEventListener("click", (e) => {
  const view = e.target.closest("[data-view]");
  if (view && repositories.length) {
    state.tour = -1;
    $("#tour").hidden = true;
    changeView(view.dataset.view, true);
  }
  const method = e.target.closest("[data-method]");
  if (method) {
    state.method = method.dataset.method;
    render();
    document
      .querySelector('[data-method="' + state.method + '"]')
      .focus({ preventScroll: true });
    announce(METHODS[state.method].name + " selected.");
  }
  const heat = e.target.closest("[data-heat]");
  if (heat) {
    const r = rows()[Number(heat.dataset.heat)];
    $("#heat-readout").textContent =
      month(r.month) + ": " + r[state.metric] + " " + metricName() + ".";
  }
  const point = e.target.closest("[data-point]");
  if (point) readPoint(point);
  const action = e.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  if (["overview", "models", "planning"].includes(action))
    changeView(action, true);
  if (action === "data") showData();
  if (action === "csv") {
    save("repo-radar-monthly.csv", toCSV(rows()), "text/csv");
    announce("Monthly CSV downloaded.");
  }
  if (action === "brief") brief();
  if (action === "scenario") {
    save(
      "repo-radar-scenario.json",
      JSON.stringify(scenario(), null, 2),
      "application/json",
    );
    announce("Scenario JSON downloaded.");
  }
  if (action === "reset-plan") {
    state.capacity = Math.max(1, Math.round(mean(values().slice(-3))));
    state.lift = 0;
    state.backlog = 0;
    render();
    announce("Planning assumptions reset.");
  }
  if (action === "tour-next") {
    state.tour++;
    renderTour();
    if (state.tour > 2)
      announce(
        "Tour complete. Your next step: try a scenario and export your reasoning.",
      );
  }
  if (action === "tour-close") {
    state.tour = -1;
    renderTour();
  }
});
function readPoint(point) {
  const target = $("#chart-readout");
  if (target) target.textContent = point.dataset.point;
}
document.addEventListener("pointerover", (e) => {
  const p = e.target.closest("[data-point]");
  if (p) readPoint(p);
});
document.addEventListener("focusin", (e) => {
  const p = e.target.closest("[data-point]");
  if (p) readPoint(p);
});
document.addEventListener("keydown", (e) => {
  const p = e.target.closest("[data-point]");
  if (p && ["Enter", " "].includes(e.key)) {
    e.preventDefault();
    readPoint(p);
  }
});
document.addEventListener("change", async (e) => {
  if (!repositories.length) return;
  const id = e.target.id;
  if (id === "repo" || id === "metric") {
    state[id] = e.target.value;
    chooseDefaults();
    render();
    announce(
      "Updated to " +
        repository().name +
        ", " +
        metricLabel() +
        ". Best one-step baseline selected; scenario assumptions reset.",
    );
  }
  if (id === "horizon") {
    state.horizon = Number(e.target.value);
    render();
    $("#horizon").focus({ preventScroll: true });
  }
  if (id === "model-choice") {
    state.method = e.target.value;
    render();
    $("#model-choice").focus({ preventScroll: true });
  }
  if (["capacity", "lift", "backlog"].includes(id)) {
    announce("Scenario updated: " + plan(future(), state).at(-1).backlog + " " + metricName() + " in the ending simulated queue.");
  }
  if (id === "csv-file") {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 100000)
        throw Error("Choose a CSV file smaller than 100 KB.");
      const months = parseCSV(await file.text());
      repositories = repositories.filter((r) => !r.custom);
      repositories.push({
        id: "custom",
        name: "Your imported data",
        custom: true,
        months,
      });
      updateRepoOptions();
      state.repo = "custom";
      $("#repo").value = "custom";
      chooseDefaults();
      render();
      $("#info-dialog").close();
      announce(
        months.length + " monthly rows imported locally. Nothing uploaded.",
      );
    } catch (error) {
      $("#import-message").textContent = error.message;
    }
  }
});
document.addEventListener("input", (e) => {
  if (
    !["capacity", "lift", "backlog"].includes(e.target.id) ||
    !repositories.length
  )
    return;
  state[e.target.id] = Number(e.target.value);
  $("#" + e.target.id + "-value").textContent =
    e.target.value + (e.target.id === "lift" ? "%" : "");
  updatePlanVisuals();
});
function updatePlanVisuals() {
  const projected = plan(future(), state),
    last = projected.at(-1).backlog,
    total = sum(projected.map((r) => r.arrivals));
  const result = $("#plan-output .plan-result");
  result.classList.toggle("warning", last > 0);
  result.querySelector(".tiny").textContent =
    last > 0
      ? "A QUEUE FORMS UNDER THESE ASSUMPTIONS"
      : "CAPACITY COVERS THIS SCENARIO";
  result.querySelector(".result-number").textContent = fmt(last);
  result.querySelector("p").textContent =
    fmt(total) +
    " projected arrivals over " +
    state.horizon +
    " months. " +
    (last > 0
      ? "Try increasing capacity or reducing incoming volume."
      : "Try a volume shock to find the plan’s breaking point.");
  const maximum = Math.max(
    1,
    ...projected.map((r) => Math.max(r.arrivals, r.capacity)),
  );
  const bars = document.querySelectorAll("#plan-output .bar-pair");
  const tableRows = document.querySelectorAll("#plan-output tbody tr");
  projected.forEach((r, i) => {
    bars[i].children[0].style.height =
      Math.max(2, (120 * r.arrivals) / maximum) + "px";
    bars[i].children[1].style.height =
      Math.max(2, (120 * r.capacity) / maximum) + "px";
    tableRows[i].children[1].textContent = r.arrivals;
    tableRows[i].children[2].textContent = r.handled;
    tableRows[i].children[3].textContent = r.backlog;
  });
}
$("#dialog-close").onclick = () => $("#info-dialog").close();
$("#source-open").onclick = () => repositories.length && showSource();
$("#import-open").onclick = () => repositories.length && showImport();
$("#about-open").onclick = showAbout;
$("#about-footer").onclick = showAbout;
$("#tour-start").onclick = () => {
  if (repositories.length) {
    state.tour = 0;
    renderTour();
    $("#tour").scrollIntoView({ block: "nearest", behavior: "auto" });
  }
};
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
document.documentElement.dataset.motion = reduced.matches ? "off" : "on";
$("#motion").textContent = "Motion: " + document.documentElement.dataset.motion;
$("#motion").onclick = () => {
  const m = document.documentElement.dataset.motion === "on" ? "off" : "on";
  document.documentElement.dataset.motion = m;
  $("#motion").textContent = "Motion: " + m;
};
function updateRepoOptions() {
  $("#repo").innerHTML = repositories
    .map((r) => '<option value="' + r.id + '">' + esc(r.name) + "</option>")
    .join("");
  $("#repo").disabled = false;
}
try {
  const response = await fetch("./data/snapshot.json");
  if (!response.ok) throw Error("The snapshot could not be loaded.");
  snapshot = await response.json();
  repositories = snapshot.repositories;
  for (const repo of repositories) repo.months = validateRows(repo.months);
  updateRepoOptions();
  chooseDefaults();
  render();
} catch (error) {
  $("#workspace").setAttribute("aria-busy", "false");
  $("#workspace").innerHTML =
    '<section class="panel"><h2>The data did not load.</h2><p class="sub">Please reload the page. No fallback numbers have been substituted.</p><p class="sub">' +
    esc(error.message) +
    '</p><a href="./data/snapshot.json">View snapshot file</a></section>';
}
