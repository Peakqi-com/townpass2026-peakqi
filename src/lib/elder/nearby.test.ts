import { test } from "node:test";
import assert from "node:assert/strict";
import { NEARBY_KINDS, getNearbyKind, inDistrict, nearbyHeadline, osmPointUrl, pickPlaces, toNearbyPlace } from "./nearby.ts";

// 欄位與值取自 2026-11-07 實際呼叫 /api/opendata 的回應（天母附近）

const toilet = (name: string, seats: string, distance: number, extra: Record<string, unknown> = {}) => ({
  行政區: "士林區",
  公廁名稱: name,
  公廁地址: `臺北市士林區${name}`,
  無障礙廁座數: seats,
  親子廁座數: "0",
  照護床位置: "",
  lat: 25.11,
  lng: 121.53,
  distance,
  ...extra,
});

test("每一類都有按鈕文字、唸的話、給誰用與資料來源，id 不重複", () => {
  const ids = NEARBY_KINDS.map((k) => k.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const k of NEARBY_KINDS) {
    assert.ok(k.label && k.speak && k.who && k.source, k.id);
    assert.equal(getNearbyKind(k.id), k);
  }
  assert.equal(getNearbyKind("nope"), undefined);
});

test("無障礙廁所：沒有無障礙廁座的公廁不列出，依距離排序", () => {
  const rows = [toilet("天母運動場", "0", 248), toilet("士林地檢署", "4", 363), toilet("天母棒球場", "2", 248)];
  const places = pickPlaces("accessible-toilet", rows);
  assert.deepEqual(
    places.map((p) => p.name),
    ["天母棒球場", "士林地檢署"],
  );
  assert.equal(places[0].details[0], "無障礙廁座 2 間");
  assert.equal(places[0].district, "士林區");
});

test("無障礙廁所：有親子廁座、照護床時補充說明", () => {
  const p = toNearbyPlace("accessible-toilet", toilet("市場", "1", 100, { 親子廁座數: "2", 照護床位置: "2樓" }));
  assert.deepEqual(p?.details, ["無障礙廁座 1 間", "也有親子廁座 2 間", "照護床：2樓"]);
});

test("親子廁所：位置、尿布台、兒童座椅", () => {
  const p = toNearbyPlace("family-toilet", {
    行政區: "士林區",
    公廁名稱: "新光三越台北天母店",
    公廁位置: "A館6樓親子",
    公廁地址: "臺北市士林區天母東路68號",
    尿布臺設置數量: "1",
    兒童座椅設置數量: "1",
    distance: 299,
  });
  assert.deepEqual(p?.details, ["位置：A館6樓親子", "有尿布台", "有兒童安全座椅"]);
});

test("哺集乳室：沒有座標；行政區以地址為準（代碼偶爾和地址不同區），依行政區篩選", () => {
  const rows = [
    { 行政區: "63000070", 機構名稱: "大同士林婦女支持培力中心", 地址: "臺北市大同區迪化街1段21號", 電話: "(02)25580170", 分機: "轉11", 開放時間: "週二至週六 09:00~18:00", 位置指引: "" },
    { 行政區: "63000110", 機構名稱: "士林某處", 地址: "臺北市士林區某路1號", 電話: "", 分機: "", 開放時間: "", 位置指引: "1樓" },
  ];
  const p = toNearbyPlace("nursing-room", rows[0]);
  assert.equal(p?.district, "大同區");
  assert.equal(p?.distance, undefined);
  assert.equal(p?.phone, "(02)25580170 轉11");
  assert.deepEqual(p?.details, ["開放時間：週二至週六 09:00~18:00"]);
  assert.deepEqual(
    inDistrict("nursing-room", rows, "士林區").map((r) => r["機構名稱"]),
    ["士林某處"],
  );
  // 地址看不出行政區時才用代碼
  assert.equal(toNearbyPlace("nursing-room", { 行政區: "63000120", 機構名稱: "某處", 地址: "某路1號" })?.district, "北投區");
});

test("捷運電梯與 AED 的欄位", () => {
  const e = toNearbyPlace("metro-elevator", { "出入口電梯/無障礙坡道名稱": "明德站出口無障礙坡道1", 出入口編號: "出口1", distance: 1494 });
  assert.equal(e?.name, "明德站出口無障礙坡道1");
  assert.deepEqual(e?.details, ["在出口1"]);
  const a = toNearbyPlace("aed", { 場所名稱: "Bounce8", 場所地址: "天母東路8巷80號", 區域代碼: "63000110", AED放置地點: "教室門口邊", AED地點描述: "AED設備擺放在教室入口旁", distance: 189 });
  assert.equal(a?.district, "士林區");
  assert.deepEqual(a?.details, ["放在：教室門口邊", "AED設備擺放在教室入口旁"]);
});

test("同一個地點重複出現時只列一次，最多 3 個", () => {
  const rows = [1, 2, 3, 4].map((i) => toilet(`公廁${i}`, "1", i * 100));
  rows.push(toilet("公廁1", "1", 100));
  assert.equal(pickPlaces("accessible-toilet", rows).length, 3);
});

test("結果第一句：最近的在哪、多遠；找不到時說範圍", () => {
  const kind = getNearbyKind("accessible-toilet")!;
  const places = pickPlaces("accessible-toilet", [toilet("天母棒球場", "2", 248)]);
  assert.equal(nearbyHeadline(kind, places, { radius: 1000 }), "最近的無障礙廁所在天母棒球場，約 250 公尺。");
  assert.equal(nearbyHeadline(kind, [], { radius: 1000 }), "附近 1 公里內沒有找到無障礙廁所。");
  assert.equal(nearbyHeadline(kind, [], { district: "士林區" }), "士林區沒有找到無障礙廁所。");
  const room = getNearbyKind("nursing-room")!;
  const rooms = pickPlaces("nursing-room", [{ 機構名稱: "甲", 地址: "臺北市中山區甲路1號" }]);
  assert.equal(nearbyHeadline(room, rooms, { district: "中山區", total: 37 }), "中山區有 37 間哺集乳室，先列出 1 間。");
  assert.equal(nearbyHeadline(room, rooms, { district: "中山區", total: 1 }), "中山區有 1 間哺集乳室。");
});

test("怎麼去：有座標才給 OpenStreetMap 連結", () => {
  assert.equal(osmPointUrl({ lat: 25.114385, lng: 121.534287 }), "https://www.openstreetmap.org/?mlat=25.114385&mlon=121.534287#map=18/25.114385/121.534287");
  assert.equal(osmPointUrl({}), null);
});
