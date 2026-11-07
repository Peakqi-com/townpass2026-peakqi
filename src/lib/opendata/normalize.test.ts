import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv } from "./parse.ts";
import { cleanCell, districtFromAddress, districtFromCode, mergeLohas, normalizeElderRecord, TAIPEI_DISTRICTS } from "./normalize.ts";

// 長輩服務資料集（共餐、關懷據點、長青學苑、樂齡學習）的欄位整理。
// 範例資料取自 2026-11-07 實際下載的 data.taipei 檔案。

test("TAIPEI_DISTRICTS：12 個行政區", () => {
  assert.equal(TAIPEI_DISTRICTS.length, 12);
});

test("districtFromCode：行政區代碼對照（以老人共餐資料同時有代碼和名稱的 440 筆為準）", () => {
  assert.equal(districtFromCode("63000010"), "松山區");
  assert.equal(districtFromCode("63000040"), "中山區");
  assert.equal(districtFromCode("63000110"), "士林區");
  assert.equal(districtFromCode("63000120"), "北投區");
  assert.equal(districtFromCode(" 63000030 "), "大安區");
  assert.equal(districtFromCode("65000010"), undefined);
  assert.equal(districtFromCode(""), undefined);
  assert.equal(districtFromCode(undefined), undefined);
});

test("districtFromAddress：取第一個出現的行政區；沒寫行政區時回 undefined", () => {
  assert.equal(districtFromAddress("臺北市士林區三玉里德行東路203巷2號1樓"), "士林區");
  assert.equal(districtFromAddress("臺北市大安區誠安里安東街28號1樓；中山區埤頭里市民大道3段209號1樓"), "大安區");
  assert.equal(districtFromAddress("復興南路2段148巷24號"), undefined);
  assert.equal(districtFromAddress("臺北市11172延平北路六段308號"), undefined);
});

test("cleanCell：欄位內換行（斷在字中間就接起來，數字之間當成分隔）", () => {
  assert.equal(cleanCell("財團法人基督教台灣信義會(士林歌珊\n堂)"), "財團法人基督教台灣信義會(士林歌珊堂)");
  assert.equal(cleanCell("臺北市士林區名山里雨聲街68號 芝山岩區民活動中\n心"), "臺北市士林區名山里雨聲街68號 芝山岩區民活動中心");
  assert.equal(cleanCell("社區照顧關懷據點\n4-5時段"), "社區照顧關懷據點 4-5時段");
  assert.equal(cleanCell("02- 27815504\n0936-096604"), "02- 27815504、0936-096604");
  assert.equal(cleanCell("0912-345678 / 0912-\n345678"), "0912-345678 / 0912-345678");
  assert.equal(cleanCell("  前後空白  "), "前後空白");
});

test("cleanCell：康熙部首「⾧」換回「長」、筆畫「㇐」換回「一」（報讀軟體才唸得對）", () => {
  assert.equal(cleanCell("財團法人臺北市松年⾧春社會福利基金會"), "財團法人臺北市松年長春社會福利基金會");
  assert.equal(cleanCell("財團法人㇐粒麥子社會福利慈善事業基金會"), "財團法人一粒麥子社會福利慈善事業基金會");
});

test("normalizeElderRecord：清理每個欄位並加上 district（行政區欄位 > 代碼 > 地址）", () => {
  // 共餐：有行政區欄位
  assert.deepEqual(
    normalizeElderRecord({ 據點名稱: "甲乙\n協會", 行政區: "士林區", 行政區代碼: "63000110", 據點地址: "臺北市士林區X路1號" }, { address: "據點地址" }),
    { 據點名稱: "甲乙協會", 行政區: "士林區", 行政區代碼: "63000110", 據點地址: "臺北市士林區X路1號", district: "士林區" },
  );
  // 關懷據點：只有代碼，地址沒寫行政區
  assert.equal(normalizeElderRecord({ 地址: "復興南路2段148巷24號", 行政區代碼: "63000030" }, { address: "地址" }).district, "大安區");
  // 沒有代碼時看地址
  assert.equal(normalizeElderRecord({ 地址: "臺北市中山區Y街2號" }, { address: "地址" }).district, "中山區");
  // 都沒有
  assert.equal(normalizeElderRecord({ 地址: "Y街2號" }, { address: "地址" }).district, undefined);
});

test("mergeLohas：樂齡學堂與樂齡學習中心合併成一個來源，標上 kind", () => {
  const schools = parseCsv("編號,行政區,郵遞區號,辦理學校,民眾洽詢電話,地址,網址\n1,士林區,111,社子國小,2812-9059轉873,臺北市11172延平北路六段308號,http://www.stps.tp.edu.tw/\n");
  const centers = parseCsv(
    "編號,縣市別代碼,行政區,郵遞區號,承辦單位,樂齡中心名稱,電話,傳真,地址,網址\n1,63000,大安區,106,臺北市立圖書館總館諮詢服務課,臺北市樂齡學習示範中心,02-2755-2823轉2302,02-2701-0721,10659臺北市大安區建國南路2段125號11樓,http://epage.tpml.edu.tw/\n",
  );
  const merged = mergeLohas(schools, centers);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].kind, "樂齡學堂");
  assert.equal(merged[0].district, "士林區");
  assert.equal(merged[0]["辦理學校"], "社子國小");
  assert.equal(merged[1].kind, "樂齡學習中心");
  assert.equal(merged[1].district, "大安區");
  assert.equal(merged[1]["樂齡中心名稱"], "臺北市樂齡學習示範中心");
});
