import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getSource } from "./sources.ts";

// 用實際下載的資料（fixtures/ 是 2026-11-07 從 data.taipei 下載的原始檔前幾列，保留原始編碼）
// 驗證 M9、M10 新增來源的整條流程：抓取 → 解碼（Big5／BOM）→ CSV → 欄位整理 → 座標。

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url));
const realFetch = globalThis.fetch;

/** 依 rid 回傳對應的檔案，順便記錄抓了哪些網址 */
function mockFetch(byRid: Record<string, Buffer>): string[] {
  const requested: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    requested.push(url);
    const rid = new URL(url).searchParams.get("rid") ?? "";
    const body = byRid[rid];
    if (!body) return new Response("not found", { status: 404 });
    return new Response(new Uint8Array(body), { status: 200 });
  }) as typeof fetch;
  return requested;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

test("audible-signals：Big5 解碼、WGS84 座標", async () => {
  const requested = mockFetch({ "1c18341c-9f6f-4b6b-b17f-8c66b94e39a0": fixture("audible-signals.big5.csv") });
  const source = getSource("audible-signals")!;
  assert.equal(source.hasGeo, true);
  const { records } = await source.load();
  assert.equal(requested.length, 1);
  assert.equal(records.length, 2);
  assert.equal(records[0]["路口"], "八德路二段　　建國北一段");
  assert.equal(records[0]["行政區"], "中山區");
  assert.equal(records[0].lat, 25.046066);
  assert.equal(records[0].lng, 121.536674);
});

test("metro-station-facilities：Big5 解碼，保留英文欄位", async () => {
  mockFetch({ "5d45ef49-d60d-4354-b634-8dcf7d28da07": fixture("metro-station-facilities.big5.csv") });
  const { records } = await getSource("metro-station-facilities")!.load();
  assert.equal(records.length, 1);
  const r = records[0];
  assert.equal(r.Station_Name, "市政府站");
  assert.equal(r.Elevator_and_Wheelchair_Ramps, "出口2");
  assert.equal(r.Priority_Seats_for_Visually_Impaired_Passengers, "一、二月臺前端");
  assert.equal(r["1999_Sign_Language_Service_quantity"], "0");
  assert.equal(r.lat, undefined);
});

test("elder-meals：去掉 BOM、接回欄位內換行、加上 district", async () => {
  mockFetch({ "86d839db-85c7-48b0-991b-dc86922eb093": fixture("elder-meals.utf8.csv") });
  const { records } = await getSource("elder-meals")!.load();
  assert.equal(records.length, 2);
  assert.equal(records[0]["序號"], "3");
  assert.equal(records[0]["據點名稱"], "財團法人基督教台灣信義會(士林歌珊堂)");
  assert.equal(records[0].district, "士林區");
  assert.equal(records[1].district, "中山區");
});

test("elder-care-points：只有行政區代碼時也能用 district 篩選", async () => {
  const csv = "﻿據點名稱,據點類型,地址,行政區代碼,電話\r\n某據點,\"社區照顧關懷據點\n4-5時段\",復興南路2段148巷24號,63000030,02-27001234\r\n";
  mockFetch({ "11930dc6-4092-4bde-a42c-7722e0416462": Buffer.from(csv) });
  const { records } = await getSource("elder-care-points")!.load();
  assert.equal(records[0].district, "大安區");
  assert.equal(records[0]["據點類型"], "社區照顧關懷據點 4-5時段");
});

test("elder-lohas：合併樂齡學堂與樂齡學習中心兩個資源", async () => {
  const requested = mockFetch({
    "2cd14e6d-ed84-40bc-8523-812be0e0bf6a": Buffer.from("﻿編號,行政區,郵遞區號,辦理學校,民眾洽詢電話,地址,網址\r\n1,士林區,111,芝山國小,2831-6115轉251,臺北市士林區德行東路285號,http://x/\r\n"),
    "462a64a2-f999-4322-8ac9-ae241380ffc1": Buffer.from("﻿編號,縣市別代碼,行政區,郵遞區號,承辦單位,樂齡中心名稱,電話,傳真,地址,網址\r\n1,63000,大安區,106,圖書館,臺北市樂齡學習示範中心,02-2755-2823轉2302,,臺北市大安區建國南路2段125號11樓,\r\n"),
  });
  const { records } = await getSource("elder-lohas")!.load();
  assert.equal(requested.length, 2);
  assert.deepEqual(
    records.map((r) => [r.kind, r.district]),
    [
      ["樂齡學堂", "士林區"],
      ["樂齡學習中心", "大安區"],
    ],
  );
});

test("M9、M10 的來源都登記在白名單，而且出處是 data.taipei 資料集頁面", () => {
  for (const id of [
    "elder-meals",
    "elder-care-points",
    "elder-evergreen",
    "elder-lohas",
    "elder-service-centers",
    "metro-station-facilities",
    "metro-accessibility-alerts",
    "metro-elevators",
    "audible-signals",
  ]) {
    const source = getSource(id);
    assert.ok(source, `${id} 沒有登記`);
    assert.match(source.datasetUrl, /^https:\/\/data\.taipei\/dataset\/detail\?id=[0-9a-f-]{36}$/, id);
  }
});
