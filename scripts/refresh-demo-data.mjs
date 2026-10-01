/** Public metadata only. Never persist issue text, authors, or credentials. */
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const start = "2023-10",
  end = "2026-09";
const cutoff = `${start}-01T00:00:00Z`,
  exclusiveEnd = "2026-10-01T00:00:00Z";
const output = fileURLToPath(new URL("../demo/data/", import.meta.url));
const snapshot = {
  schemaVersion: 1,
  source: "GitHub REST API",
  start,
  end,
  retrievedAt: new Date().toISOString(),
  repositories: [],
};
for (const name of ["pallets/flask", "pallets/jinja"]) {
  const months = Array.from({ length: 36 }, (_, i) => {
    const d = new Date(Date.UTC(2023, 9 + i, 1));
    return { month: d.toISOString().slice(0, 7), issues: 0, pulls: 0 };
  });
  const records = new Map();
  let boundaryReached = false,
    pages = 0,
    inspected = 0;
  while (!boundaryReached) {
    pages++;
    if (pages > 150)
      throw new Error("Safety limit reached. No partial snapshot written.");
    const url = `https://api.github.com/repos/${name}/issues?state=all&sort=created&direction=desc&per_page=100&page=${pages}`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "Pratiksha-Forecast-Lab",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!response.ok)
      throw new Error(
        `${name}: HTTP ${response.status}. Check the API response and pagination/rate limits. No partial snapshot written.`,
      );
    const items = await response.json();
    if (!Array.isArray(items)) throw new Error("Invalid GitHub response");
    inspected += items.length;
    for (const item of items) {
      if (item.created_at < cutoff) {
        boundaryReached = true;
        continue;
      }
      if (item.created_at >= exclusiveEnd) continue;
      records.set(item.number, {
        number: item.number,
        createdAt: item.created_at,
        kind: item.pull_request ? "pulls" : "issues",
      });
    }
    if (items.length < 100) boundaryReached = true;
    console.log(`${name}: page ${pages}, ${records.size} in-window records`);
  }
  const minimalRecords = [...records.values()].sort(
    (a, b) => a.number - b.number,
  );
  for (const record of minimalRecords)
    months.find((m) => m.month === record.createdAt.slice(0, 7))[record.kind]++;
  snapshot.repositories.push({
    id: name.split("/")[1],
    name,
    url: `https://github.com/${name}`,
    apiUrl: `https://api.github.com/repos/${name}/issues`,
    months,
    audit: {
      pages,
      inspected,
      included: records.size,
      boundaryReached,
      recordsSha256: createHash("sha256")
        .update(JSON.stringify(minimalRecords))
        .digest("hex"),
    },
  });
}
await mkdir(output, { recursive: true });
await writeFile(
  `${output}snapshot.json`,
  JSON.stringify(snapshot, null, 2) + "\n",
);
console.log(
  "Complete snapshot saved. Two public repositories, 36 UTC calendar months each.",
);
