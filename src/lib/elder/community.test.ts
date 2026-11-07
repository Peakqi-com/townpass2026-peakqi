import { test } from "node:test";
import assert from "node:assert/strict";
import { CARE_CATEGORIES, COMMUNITY_CATEGORIES, formatPhoneDigits, mapSearchAddress, osmSearchUrl, parsePhones, placesInDistrict, resultSummary, toCommunityPlace, userHome, userStreet, type CommunityPlace, parseServiceArea } from "./community.ts";
import type { TownPassAccount } from "../townpass/types.ts";

// M9 附近吃飯上課：把四個開放資料集整理成同一種「地點」，給長輩大字顯示、撥號、查路線。
// 測試資料取自 2026-11-07 下載的實際資料。

test("四個分類各對應一個代理來源", () => {
  assert.deepEqual(
    COMMUNITY_CATEGORIES.map((c) => [c.id, c.label, c.source]),
    [
      ["meals", "共餐", "elder-meals"],
      ["care", "關懷據點", "elder-care-points"],
      ["evergreen", "長青學苑", "elder-evergreen"],
      ["lohas", "樂齡學習", "elder-lohas"],
    ],
  );
});

test("formatPhoneDigits：市話、手機、0800", () => {
  assert.equal(formatPhoneDigits("0228369493"), "(02)2836-9493");
  assert.equal(formatPhoneDigits("0939060673"), "0939-060673");
  assert.equal(formatPhoneDigits("0800088258"), "0800-088-258");
  assert.equal(formatPhoneDigits("037123456"), "037123456");
});

test("parsePhones：各種寫法都能撥（只撥主號，分機另外提示）", () => {
  assert.deepEqual(parsePhones("02-28369493"), { phones: [{ dial: "0228369493", display: "(02)2836-9493" }] });
  assert.deepEqual(parsePhones("(02)27685636"), { phones: [{ dial: "0227685636", display: "(02)2768-5636" }] });
  assert.deepEqual(parsePhones("02-28381571#253").phones, [{ dial: "0228381571", display: "(02)2838-1571", ext: "253" }]);
  assert.deepEqual(parsePhones("02-2755-2823轉2302").phones, [{ dial: "0227552823", display: "(02)2755-2823", ext: "2302" }]);
  assert.deepEqual(parsePhones("02-27001234分機12").phones[0].ext, "12");
  assert.deepEqual(parsePhones("02-27001234 #99").phones[0].ext, "99");
  assert.deepEqual(parsePhones("02-27001234*88").phones[0].ext, "88");
  // 手機少了開頭的 0（關懷據點的實際資料）
  assert.deepEqual(parsePhones("918124780").phones, [{ dial: "0918124780", display: "0918-124780" }]);
  // 樂齡學堂的電話沒有區碼
  assert.deepEqual(parsePhones("2831-6115轉251").phones, [{ dial: "0228316115", display: "(02)2831-6115", ext: "251" }]);
});

test("parsePhones：一格裡有兩支電話（清理後的換行會變成「、」）", () => {
  assert.deepEqual(
    parsePhones("02- 27815504、0936-096604").phones.map((p) => p.dial),
    ["0227815504", "0936096604"],
  );
  assert.deepEqual(
    parsePhones("02-2700-1234#12 / 0912345678").phones.map((p) => [p.dial, p.ext]),
    [
      ["0227001234", "12"],
      ["0912345678", undefined],
    ],
  );
  // 重複的只留一支
  assert.equal(parsePhones("02-28369493、(02)2836-9493").phones.length, 1);
});

test("parsePhones：沒有電話或位數不對時，保留原文當說明", () => {
  assert.deepEqual(parsePhones("0933-7476120"), { phones: [], note: "0933-7476120" });
  assert.deepEqual(parsePhones("俟福國社宅完工後開辦"), { phones: [], note: "俟福國社宅完工後開辦" });
  assert.deepEqual(parsePhones(""), { phones: [] });
  assert.deepEqual(parsePhones(undefined), { phones: [] });
});

test("toCommunityPlace：共餐", () => {
  const place = toCommunityPlace("meals", {
    序號: "117",
    據點名稱: "社團法人中華社區厝邊頭尾營造協會",
    行政區: "中山區",
    據點地址: "臺北市中山區力行里南京東路3段130號3樓",
    聯絡電話: "0939-260482",
    district: "中山區",
  });
  assert.deepEqual(place, {
    key: "meals-117-社團法人中華社區厝邊頭尾營造協會",
    name: "社團法人中華社區厝邊頭尾營造協會",
    address: "臺北市中山區力行里南京東路3段130號3樓",
    district: "中山區",
    phones: [{ dial: "0939260482", display: "0939-260482" }],
  });
});

test("toCommunityPlace：關懷據點的類型、樂齡學習的網址與種類", () => {
  const care = toCommunityPlace("care", { 據點名稱: "甲", 據點類型: "社區照顧關懷據點 4-5時段", 地址: "X", 電話: "02-27001234", district: "大安區" });
  assert.equal(care.note, "社區照顧關懷據點 4-5時段");
  const school = toCommunityPlace("lohas", { 辦理學校: "芝山國小", 民眾洽詢電話: "2831-6115轉251", 地址: "臺北市士林區德行東路285號", 網址: "http://new.zsps.tp.edu.tw/", kind: "樂齡學堂", district: "士林區" });
  assert.equal(school.name, "芝山國小樂齡學堂");
  assert.equal(school.url, "http://new.zsps.tp.edu.tw/");
  assert.equal(school.phones[0].ext, "251");
  const center = toCommunityPlace("lohas", { 樂齡中心名稱: "臺北市萬華區樂齡學習中心", 電話: "02-23361266轉140", 地址: "Y", kind: "樂齡學習中心", district: "萬華區" });
  assert.equal(center.name, "臺北市萬華區樂齡學習中心");
  const evergreen = toCommunityPlace("evergreen", { 機構名稱: "臺北市大同社區大學", 地址: "臺北市大同區長安西路37-1號", 電話: "(02)25556008", district: "大同區" });
  assert.equal(evergreen.phones[0].dial, "0225556008");
});

const place = (address: string, district?: string): CommunityPlace => ({ key: address, name: "某據點", address, district: district as CommunityPlace["district"], phones: [] });

test("placesInDistrict：只留同一區（代理的 q 會比對所有欄位，名稱裡有「中山區」的外區據點要排除），同一里的排前面", () => {
  const list = [
    place("臺北市中山區中山里A路1號", "中山區"),
    { ...place("臺北市大同區B路2號", "大同區"), name: "臺北市中山區某某協會" },
    place("臺北市中山區正得里林森北路62號", "中山區"),
  ];
  const result = placesInDistrict(list, "中山區", "正得里");
  assert.deepEqual(
    result.map((p) => [p.address, p.sameVillage]),
    [
      ["臺北市中山區正得里林森北路62號", true],
      ["臺北市中山區中山里A路1號", false],
    ],
  );
  // 沒有里的資料時維持原順序
  assert.equal(placesInDistrict(list, "中山區")[0].address, "臺北市中山區中山里A路1號");
});

test("mapSearchAddress：給地圖搜尋的地址（OpenStreetMap 查不到門牌，只查到路、段、巷；取第一個地點、去掉里、補上臺北市與行政區）", () => {
  assert.equal(mapSearchAddress(place("臺北市士林區三玉里德行東路203巷2號1樓", "士林區")), "臺北市士林區德行東路203巷");
  assert.equal(mapSearchAddress(place("臺北市大安區錦安里潮州街130巷3號1樓；永康街60號4樓", "大安區")), "臺北市大安區潮州街130巷");
  assert.equal(mapSearchAddress(place("臺北市士林區名山里雨聲街68號 芝山岩區民活動中心", "士林區")), "臺北市士林區雨聲街");
  assert.equal(mapSearchAddress(place("臺北市士林區福佳里文昌路166-1號(文昌區民活動中心)", "士林區")), "臺北市士林區文昌路");
  assert.equal(mapSearchAddress(place("臺北市大同區至聖里重慶北路3段223巷43、 45、 47號", "大同區")), "臺北市大同區重慶北路3段223巷");
  assert.equal(mapSearchAddress(place("臺北市大安區誠安里安東街28號1樓、31之1號1樓；中山區埤頭里市民大道3段209號1樓", "大安區")), "臺北市大安區安東街");
  assert.equal(mapSearchAddress(place("臺北市大安區群賢里和平東路2段311巷43弄36號1樓", "大安區")), "臺北市大安區和平東路2段311巷");
  // 地址沒寫臺北市或行政區、夾郵遞區號、行政區寫錯字
  assert.equal(mapSearchAddress(place("復興南路2段148巷24號", "大安區")), "臺北市大安區復興南路2段148巷");
  assert.equal(mapSearchAddress(place("臺北市11172延平北路六段308號", "士林區")), "臺北市士林區延平北路六段");
  assert.equal(mapSearchAddress(place("10659臺北市大安區建國南路2段125號11樓", "大安區")), "臺北市大安區建國南路2段");
  assert.equal(mapSearchAddress(place("臺北市內區大湖山莊街170號", "內湖區")), "臺北市內湖區大湖山莊街");
  assert.equal(mapSearchAddress(place("臺北市復興北路430巷1號", "中山區")), "臺北市中山區復興北路430巷");
  // 沒有門牌的原樣保留
  assert.equal(mapSearchAddress(place("臺北市北投區福國路-福國社宅1樓", "北投區")), "臺北市北投區福國路-福國社宅1樓");
});

test("osmSearchUrl：OpenStreetMap 搜尋網址（不用 Google Maps）", () => {
  assert.equal(
    osmSearchUrl(place("臺北市中山區正得里林森北路62號", "中山區")),
    "https://www.openstreetmap.org/search?query=" + encodeURIComponent("臺北市中山區林森北路"),
  );
});

const account = (addresses: Partial<TownPassAccount["addresses"][number]>[], residentAddress = ""): TownPassAccount =>
  ({ addresses, residentAddress }) as unknown as TownPassAccount;

test("userHome：用台北通帳號的地址找行政區（優先 priority），不是臺北市就回 null", () => {
  assert.deepEqual(userHome(account([{ city: "臺北市", town: "中山區", village: "正得里", priority: true }])), { district: "中山區", village: "正得里" });
  assert.deepEqual(
    userHome(account([
      { city: "臺北市", town: "北投區", village: "", priority: false },
      { city: "臺北市", town: "大安區", village: "古莊里", priority: true },
    ])),
    { district: "大安區", village: "古莊里" },
  );
  assert.deepEqual(userHome(account([{ city: "台北市", town: "士林區", priority: false }])), { district: "士林區", village: undefined });
  assert.equal(userHome(account([{ city: "新北市", town: "板橋區", priority: true }])), null);
  assert.deepEqual(userHome(account([], "臺北市文山區木柵路一段 1 號")), { district: "文山區", village: undefined });
  assert.equal(userHome(null), null);
});

test("userStreet：主要地址的街道；不是臺北市或沒有資料回 undefined", () => {
  assert.equal(userStreet(account([{ city: "臺北市", town: "中山區", village: "正得里", street: "吉林路", priority: true }])), "吉林路");
  assert.equal(userStreet(account([{ city: "新北市", town: "板橋區", street: "文化路", priority: true }])), undefined);
  assert.equal(userStreet(account([{ city: "臺北市", town: "中山區", priority: true }])), undefined);
  assert.equal(userStreet(null), undefined);
});

/* ---------- 照顧家人、打疫苗做篩檢（2026-11-07 新增） ---------- */

test("resultSummary：依篩選方式說清楚範圍（全市的不能說成這一區的）", () => {
  const [dementia, respite] = CARE_CATEGORIES;
  assert.equal(resultSummary(COMMUNITY_CATEGORIES[0], "中山區", 12), "中山區有 12 個共餐");
  assert.equal(resultSummary(dementia, "中山區", 11), "失智篩檢全市有 11 個，在中山區的排前面");
  assert.equal(resultSummary(respite, "中山區", 180), "可以服務中山區的喘息服務有 180 個");
});

test("parseServiceArea：全區、列出的行政區、看不懂", () => {
  assert.equal(parseServiceArea("全區"), "all");
  assert.deepEqual(parseServiceArea("士林區、北投區"), ["士林區", "北投區"]);
  assert.equal(parseServiceArea("新北市"), undefined);
  assert.equal(parseServiceArea(""), undefined);
});

test("toCommunityPlace：喘息服務的電話接上分機，標出類型與服務範圍", () => {
  const place = toCommunityPlace("respite", {
    序號: "1",
    機構名稱: "社團法人臺北市臻佶祥社會服務協會",
    "機構（服務）地址": "臺北市中正區中華路二段315巷16、 18號",
    市話: "(02)23036281",
    分機: "17",
    服務區別: "全區",
    kind: "巷弄長照站",
    district: "中正區",
  });
  assert.deepEqual(place.phones, [{ dial: "0223036281", display: "(02)2303-6281", ext: "17" }]);
  assert.equal(place.note, "巷弄長照站。服務範圍：全區");
  assert.equal(place.serves, "all");
});

test("toCommunityPlace：不在臺北市的喘息單位即使寫「全區」也不算服務臺北", () => {
  const place = toCommunityPlace("respite", { 序號: "9", 機構名稱: "新北某居家長照機構", 服務區別: "全區", kind: "居家式" });
  assert.equal(place.serves, undefined);
  assert.equal(place.note, "居家式（到家裡服務）。服務範圍：全區");
});

test("toCommunityPlace：癌症篩檢列出可以做的項目", () => {
  const place = toCommunityPlace("cancer", {
    醫事機構代碼: "501010019",
    院所名稱: "三軍總醫院松山分院附設民眾診療服務處",
    地址: "臺北市松山區健康路１３１號",
    聯絡電話: "(02)27642151",
    子宮頸癌篩檢: "Y",
    口腔癌篩檢: "Y",
    大腸癌篩檢: "Y",
    乳癌篩檢: "",
    肺癌篩檢: "Y",
    district: "松山區",
  });
  assert.equal(place.note, "可以做：子宮頸癌、口腔癌、大腸癌、肺癌篩檢");
  assert.equal(place.key, "cancer-501010019-三軍總醫院松山分院附設民眾診療服務處");
});

test("placesInDistrict：服務範圍包含這一區的也列出，在這一區的排前面", () => {
  const base = { address: "", phones: [] };
  const places = [
    { ...base, key: "a", name: "全區、在別區", district: "大安區" as const, serves: "all" as const },
    { ...base, key: "b", name: "只服務士林北投", district: "士林區" as const, serves: ["士林區" as const, "北投區" as const] },
    { ...base, key: "c", name: "在中山區", district: "中山區" as const },
    { ...base, key: "d", name: "在別區、不服務中山", district: "文山區" as const, serves: ["文山區" as const] },
  ];
  assert.deepEqual(
    placesInDistrict(places, "中山區").map((p) => p.key),
    ["c", "a"],
  );
  assert.deepEqual(
    placesInDistrict(places, "北投區").map((p) => p.key),
    ["a", "b"],
  );
});
