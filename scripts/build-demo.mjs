import { build } from "esbuild";
import { mkdir, readFile, writeFile, cp } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const output = root + "site/";
await mkdir(output + "assets", { recursive:true });
const result = await build({
  entryPoints:[root + "demo/app.js"], bundle:true, write:false,
  format:"iife", platform:"browser", target:["es2020"], minify:true,
});
const code = result.outputFiles[0].text;
const hash = text => createHash("sha256").update(text).digest("hex").slice(0,12);
const appName = "app." + hash(code) + ".js";
const css = await readFile(root + "demo/style.css", "utf8");
const cssName = "style." + hash(css) + ".css";
await writeFile(output + "assets/" + appName, code);
await writeFile(output + "assets/" + cssName, css);
let html = await readFile(root + "demo/index.html", "utf8");
html = html.replace('href="./style.css"', 'href="./assets/' + cssName + '"');
html = html.replace('<script type="module" src="./app.js"></script>', '<script defer src="./assets/' + appName + '" onerror="window.radarBootFailure()"></script>');
await writeFile(output + "index.html", html);
await cp(root + "demo/data", output + "data", {recursive:true});
await writeFile(output + ".nojekyll", "");
console.log("Built a versioned, self-contained app: " + appName);
