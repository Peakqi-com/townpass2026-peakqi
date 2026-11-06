import { test } from "node:test";
import assert from "node:assert/strict";
import { applyQuery, DEFAULT_LIMIT, MAX_LIMIT, parseQuery, type QueryOptions } from "./query.ts";

const parse = (qs: string) => parseQuery(new URLSearchParams(qs));

test("parseQuery：預設值", () => {
  assert.deepEqual(parse(""), { radius: 1000, limit: DEFAULT_LIMIT });
});

test("parseQuery：near、radius、limit 夾在合法範圍", () => {
  assert.deepEqual(parse("near=25.0375,121.5637&radius=999999&limit=99999&q=%20大安%20"), {
    near: { lat: 25.0375, lng: 121.5637 },
    radius: 10_000,
    limit: MAX_LIMIT,
    q: "大安",
  });
});

test("parseQuery：拒絕不合理的座標與參數", () => {
  assert.ok("error" in parse("near=121.56,25.03"));
  assert.ok("error" in parse("near=abc"));
  assert.ok("error" in parse("radius=abc"));
  assert.ok("error" in parse("limit=1.5"));
});

const records = [
  { name: "市府", lat: 25.0375, lng: 121.5637 },
  { name: "101", lat: 25.0339, lng: 121.5645 },
  { name: "台北車站", lat: 25.0478, lng: 121.517 },
  { name: "沒有座標" },
];

test("applyQuery：near 會排除沒有座標的資料、依距離排序並附上 distance", () => {
  const opts = parseQuery(new URLSearchParams("near=25.0375,121.5637&radius=1000")) as QueryOptions;
  const { total, records: out } = applyQuery(records, opts);
  assert.equal(total, 2);
  assert.deepEqual(out.map((r) => r.name), ["市府", "101"]);
  assert.equal(out[0].distance, 0);
  assert.ok(out[1].distance! > 300 && out[1].distance! < 500);
});

test("applyQuery：q 比對文字欄位（不分大小寫），limit 只影響回傳筆數不影響 total", () => {
  const { total, records: out } = applyQuery(records, { radius: 1000, limit: 1, q: "台北" });
  assert.equal(total, 1);
  assert.equal(out[0].name, "台北車站");
  const all = applyQuery(records, { radius: 1000, limit: 2 });
  assert.equal(all.total, 4);
  assert.equal(all.records.length, 2);
});
