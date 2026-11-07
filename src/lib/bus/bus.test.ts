import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import {
  busLabel,
  directionsOf,
  etaText,
  findEstimate,
  normalizeRouteQuery,
  parseEstimates,
  parseRoutes,
  parseStops,
  searchRoutes,
} from "./bus.ts";

// fixtures/ 是 2026-11-07 17:09 從臺北市公運處 blob（data.taipei〈臺北市路線〉〈臺北市站牌〉〈臺北市預估到站時間(公車)〉）
// 下載後，只留 307、紅25、226 等幾條路線與 307 的幾個站牌，重新壓成 gzip。
const load = (name: string) => JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/${name}`, import.meta.url))).toString("utf8"));

const routes = parseRoutes(load("GetRoute.gz"), "tpe");
const stops = parseStops(load("GetStop.gz"), "tpe");
const estimates = parseEstimates(load("GetEstimateTime.gz"), "tpe");

test("parseRoutes：同一個 Id 有多筆（聯營、附屬路線）時只留一筆", () => {
  const r307 = routes.filter((r) => r.name === "307");
  assert.equal(r307.length, 1);
  assert.deepEqual(r307[0], { city: "tpe", id: 16111, name: "307", departure: "板橋", destination: "撫遠街" });
});

test("parseStops：goBack 是字串，轉成 0／1", () => {
  const nanjing = stops.filter((s) => s.name === "南京三民路口");
  assert.deepEqual(
    nanjing.map((s) => [s.id, s.goBack, s.seq]),
    [
      [15276, 0, 57],
      [15304, 1, 74],
    ],
  );
});

test("parseStops：站牌位置用 showLat／showLon（WGS84）", () => {
  const stop = stops.find((s) => s.id === 15276);
  assert.equal(stop?.lat, 25.05148353485096);
  assert.equal(stop?.lng, 121.5602663380149);
});

test("normalizeRouteQuery：全形數字、空白、「號公車」「路」都整理掉", () => {
  assert.equal(normalizeRouteQuery(" ３０７ "), "307");
  assert.equal(normalizeRouteQuery("307號公車"), "307");
  assert.equal(normalizeRouteQuery("307路"), "307");
  assert.equal(normalizeRouteQuery("紅 25"), "紅25");
});

test("searchRoutes：完全相同的排第一，其次是開頭相同的；空字串不找", () => {
  assert.equal(searchRoutes(routes, "307")[0].name, "307");
  assert.ok(searchRoutes(routes, "30").every((r) => r.name.startsWith("30")));
  assert.equal(searchRoutes(routes, "紅25")[0].name, "紅25");
  assert.deepEqual(searchRoutes(routes, "  "), []);
});

test("directionsOf：去程「往訖站」、返程「往起站」，站牌照站序", () => {
  const route = routes.find((r) => r.name === "307")!;
  const dirs = directionsOf(route, stops);
  assert.deepEqual(
    dirs.map((d) => d.label),
    ["往撫遠街", "往板橋"],
  );
  assert.deepEqual(
    dirs[0].stops.map((s) => s.seq),
    [0, 1, 2, 57],
  );
  assert.deepEqual(
    dirs[1].stops.map((s) => s.id),
    [15304],
  );
});

test("busLabel：路線、方向、站名組成一句（斷網時首頁也顯示得出來）", () => {
  assert.equal(busLabel("307", "往撫遠街", "南京三民路口"), "307 往撫遠街・南京三民路口");
});

test("findEstimate：用路線＋站牌找預估秒數；找不到回 undefined", () => {
  assert.equal(findEstimate(estimates, { city: "tpe", routeId: 16111, stopId: 15276 }), 731);
  assert.equal(findEstimate(estimates, { city: "tpe", routeId: 16111, stopId: 15304 }), 26);
  assert.equal(findEstimate(estimates, { city: "tpe", routeId: 16111, stopId: 999999 }), -3);
  assert.equal(findEstimate(estimates, { city: "ntpc", routeId: 16111, stopId: 15276 }), undefined, "市別不同就不算");
  assert.equal(findEstimate(estimates, { city: "tpe", routeId: 1, stopId: 1 }), undefined);
});

test("etaText：秒數與官方特殊值（-1～-4）換成長輩聽得懂的話", () => {
  assert.equal(etaText(731), "還有 12 分鐘");
  assert.equal(etaText(119), "還有 1 分鐘");
  assert.equal(etaText(59), "快到了");
  assert.equal(etaText(0), "快到了");
  assert.equal(etaText(-1), "還沒發車");
  assert.equal(etaText(-2), "交通管制，這一站不停");
  assert.equal(etaText(-3), "末班車已經過了");
  assert.equal(etaText(-4), "今天沒有開");
  assert.equal(etaText(undefined), "查不到時間");
  assert.equal(etaText(-9), "查不到時間");
});
