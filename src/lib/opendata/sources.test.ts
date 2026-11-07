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

/* ---------- 避難所、照顧家人、打疫苗做篩檢（2026-11-07 新增） ---------- */

test("shelters：.ods 解析成 419 處，拿掉個人姓名與電話，補上 district", async () => {
  mockFetch({ "4c92dbd4-d259-495a-8390-52628119a4dd": fixture("shelters.ods") });
  const { records } = await getSource("shelters")!.load();
  assert.equal(records.length, 419);
  const first = records[0];
  assert.equal(first["名稱(學校機關全銜)"], "臺北市立螢橋國民中學");
  assert.equal(first.district, "中正區");
  assert.match(String(first["服務里別"]), /林興里/);
  for (const key of ["聯絡人姓名", "聯絡人連絡電話", "管理人姓名", "管理人連絡電話"]) {
    assert.ok(records.every((r) => !(key in r)), `${key} 不能傳給前端`);
  }
  // 台北通測試帳號住中山區正得里，要找得到負責正得里的避難所
  const mine = records.filter((r) => r.district === "中山區" && String(r["服務里別"]).split("、").includes("正得里"));
  assert.ok(mine.length > 0);
});

test("dementia-screening：只取醫院欄位（並排的健康服務中心欄位不對應），行政區用醫院地址", async () => {
  mockFetch({ "7da0648c-bfd9-469b-85ad-ca32023266b9": fixture("dementia-screening.utf8.csv") });
  const { records } = await getSource("dementia-screening")!.load();
  assert.equal(records.length, 11, "北投區那列沒有醫院，不收");
  assert.ok(records.every((r) => !("12區健康服務中心" in r)));
  const guandu = records.find((r) => String(r["醫院名稱"]).includes("關渡醫院"));
  assert.equal(guandu?.district, "北投區", "關渡醫院在北投區（同一列左邊寫的是萬華區，不能採用）");
});

test("ltc-respite-providers：合併巷弄式、社區式、居家式，標上 kind 與 district", async () => {
  const requested = mockFetch({
    "af6888b3-db7a-4ab0-b01a-b88451f0b5b7": fixture("respite-lane.big5.csv"),
    "35e14e55-97b5-4357-9175-2867864691f4": fixture("respite-community.big5.csv"),
    "cf41693d-b35e-4744-8c37-d6505c54c13a": fixture("respite-home.big5.csv"),
  });
  const { records } = await getSource("ltc-respite-providers")!.load();
  assert.equal(requested.length, 3);
  assert.deepEqual([...new Set(records.map((r) => r.kind))], ["巷弄長照站", "社區式", "居家式"]);
  const lane = records.find((r) => r.kind === "巷弄長照站")!;
  assert.equal(lane.district, "中正區", "行政區域代碼 63000050");
  assert.equal(lane["服務區別"], "全區");
});

test("打疫苗、做篩檢、健康服務中心：行政區代碼換成 district", async () => {
  mockFetch({
    "4c6c37f9-ebb5-4672-b33c-6812b853e8e0": fixture("flu-vaccine-adult.utf8.csv"),
    "29384bd5-e15e-4420-bb8e-c79e2ae46e68": fixture("pneumococcal-vaccine.utf8.csv"),
    "c01f280f-7f99-496c-a047-abb47c8e2719": fixture("cancer-screening.utf8.csv"),
    "1e57f3cb-7063-4db7-a263-106ab9bdf6d1": fixture("health-centers.big5.csv"),
    "efed6694-9700-4b45-a7bd-3000918d59b0": fixture("caregiver-centers.utf8.csv"),
  });
  for (const id of ["flu-vaccine-adult", "pneumococcal-vaccine", "cancer-screening"]) {
    const { records } = await getSource(id)!.load();
    assert.ok(records.length > 0, id);
    assert.equal(records[0].district, "松山區", `${id}：63000010 是松山區`);
  }
  const centers = (await getSource("health-centers")!.load()).records;
  assert.equal(centers.length, 12);
  assert.equal(centers.find((r) => r["健康服務中心名稱"] === "中山區健康服務中心")?.district, "中山區");
  const caregivers = (await getSource("caregiver-centers")!.load()).records;
  assert.equal(caregivers.length, 4);
});

test("新增的來源都登記在白名單，而且出處是 data.taipei 資料集頁面", () => {
  for (const id of [
    "shelters",
    "dementia-screening",
    "ltc-respite-providers",
    "caregiver-centers",
    "health-centers",
    "flu-vaccine-adult",
    "pneumococcal-vaccine",
    "cancer-screening",
  ]) {
    const source = getSource(id);
    assert.ok(source, `${id} 沒有登記`);
    assert.match(source.datasetUrl, /^https:\/\/data\.taipei\/dataset\/detail\?id=[0-9a-f-]{36}$/, id);
  }
});

test("denture-clinics：6 處聯醫院區，Big5，用地址補上 district", async () => {
  mockFetch({ "d6522c9f-2026-4ab0-9642-65df9218a9bc": fixture("denture-clinics.big5.csv") });
  const { records } = await getSource("denture-clinics")!.load();
  assert.equal(records.length, 6);
  assert.equal(records[0]["院所名稱"], "臺北市立聯合醫院中興院區");
  assert.equal(records[0].district, "大同區");
});
