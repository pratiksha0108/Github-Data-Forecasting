import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
test("published app is bundled with data and content-addressed assets",()=>{
  execFileSync(process.execPath,["scripts/build-demo.mjs"]);
  const html=readFileSync("site/index.html","utf8");
  const script=html.match(/src="\.\/assets\/(app\.[a-f0-9]{12}\.js)"/)?.[1];
  assert.ok(script);
  assert.match(html,/style\.[a-f0-9]{12}\.css/);
  assert.doesNotMatch(html,/type="module"/);
  assert.match(html,/radarBootFailure/);
  const bundle=readFileSync("site/assets/"+script,"utf8");
  assert.match(bundle,/pallets\/flask/);
  assert.match(bundle,/pallets\/jinja/);
  assert.doesNotMatch(bundle,/fetch\(/);
  assert.doesNotMatch(readFileSync("demo/style.css","utf8"),/@import/);
});
