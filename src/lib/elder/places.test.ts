import { test } from "node:test";
import assert from "node:assert/strict";
import {
  alertsForStation,
  buildStations,
  cleanAlertText,
  describeStation,
  formatAlertTime,
  formatDistance,
  nearestSignals,
  nearestStation,
  segments,
  signalName,
  signalsSentence,
  stationsByLine,
} from "./places.ts";

// M10 視障出門：找最近的捷運站、組成「一句話」回答、排序附近的有聲號誌。
// 測試資料取自 2026-11-07 下載的 data.taipei 實際資料（欄位名稱、寫法都照原樣）。

const facility = (overrides: Record<string, string>) => ({
  Line: "板南線",
  Station_Number: "BL18",
  Station_Name: "市政府站",
  PAO: "大廳層(B1)，近出口1",
  Elevator_and_Wheelchair_Ramps: "出口2",
  Priority_Seats_for_Visually_Impaired_Passengers: "一、二月臺前端",
  Tactile_Guide_Paths_quantity: "出口電梯--大廳無障礙閘門--月臺電梯--月臺",
  "1999_Sign_Language_Service_quantity": "0",
  ...overrides,
});

const FACILITIES = [
  facility({}),
  facility({
    Line: "淡水信義線/板南線",
    Station_Number: "BL12/R10",
    Station_Name: "台北車站",
    PAO: "【淡水信義線】大廳層(B3)，近台鐵/高鐵轉乘區。【板南線】大廳層(B2)，近出口M4、M5、M6。",
    Elevator_and_Wheelchair_Ramps: "【淡水信義線】出口M2。【板南線】出口M4。",
    Priority_Seats_for_Visually_Impaired_Passengers: "【淡水信義線】一月臺前端。【板南線】無。",
    Tactile_Guide_Paths_quantity: "【淡水信義線】/【板南線】出口電梯--大廳無障礙閘門--月臺電梯--月臺",
    "1999_Sign_Language_Service_quantity": "1",
  }),
  facility({
    Line: "淡水信義線",
    Station_Number: "R14",
    Station_Name: "圓山站",
    PAO: "大廳層(2樓)，近出口",
    Elevator_and_Wheelchair_Ramps: "出口1、出口2",
    Priority_Seats_for_Visually_Impaired_Passengers: "無",
    Tactile_Guide_Paths_quantity: "0",
  }),
  facility({ Line: "淡水信義線", Station_Number: "R11", Station_Name: "中山站" }),
  facility({ Line: "文湖線", Station_Number: "BR12", Station_Name: "中山國中站", Elevator_and_Wheelchair_Ramps: "單一出口" }),
];

const ELEVATORS = [
  { "出入口電梯/無障礙坡道名稱": "市政府站出口電梯", 出入口編號: "出口2", lat: 25.0411, lng: 121.5659 },
  { "出入口電梯/無障礙坡道名稱": "台北車站出口電梯1", 出入口編號: "M2", lat: 25.0466, lng: 121.5168 },
  { "出入口電梯/無障礙坡道名稱": "台北車站出口電梯2", 出入口編號: "M4", lat: 25.0472, lng: 121.5185 },
  { "出入口電梯/無障礙坡道名稱": "圓山站出口無障礙坡道1", 出入口編號: "出口1", lat: 25.0713, lng: 121.5201 },
  { "出入口電梯/無障礙坡道名稱": "圓山站出口無障礙坡道2", 出入口編號: "出口2", lat: 25.0719, lng: 121.5197 },
  { "出入口電梯/無障礙坡道名稱": "中山站出口電梯1", 出入口編號: "出口4", lat: 25.0527, lng: 121.5204 },
  // 「中山國中站」不能被當成「中山站」
  { "出入口電梯/無障礙坡道名稱": "中山國中站出口電梯", 出入口編號: "單一出口", lat: 25.0608, lng: 121.5442 },
  // 沒有座標的跳過
  { "出入口電梯/無障礙坡道名稱": "中山站出口電梯2", 出入口編號: "出口5" },
];

const STATIONS = buildStations(FACILITIES, ELEVATORS);
const get = (name: string) => STATIONS.find((s) => s.name === name)!;

test("segments：多線車站的「【線名】…。」分段", () => {
  assert.deepEqual(segments("出口2"), [{ lines: [], value: "出口2" }]);
  assert.deepEqual(segments("【淡水信義線】出口M2。【板南線】出口M4。"), [
    { lines: ["淡水信義線"], value: "出口M2" },
    { lines: ["板南線"], value: "出口M4" },
  ]);
  assert.deepEqual(segments("【淡水信義線】/【板南線】出口電梯--月臺"), [{ lines: ["淡水信義線", "板南線"], value: "出口電梯--月臺" }]);
});

test("buildStations：用名稱的最長前綴把出入口電梯對到車站（中山國中站不會算成中山站）", () => {
  assert.equal(STATIONS.length, 5);
  assert.deepEqual(get("中山站").exits.map((e) => e.label), ["出口4"]);
  assert.deepEqual(get("中山國中站").exits.map((e) => e.label), ["單一出口"]);
  assert.deepEqual(get("台北車站").exits.map((e) => [e.label, e.kind]), [
    ["出口M2", "電梯"],
    ["出口M4", "電梯"],
  ]);
  assert.deepEqual(get("圓山站").exits.map((e) => e.kind), ["坡道", "坡道"]);
  assert.equal(get("台北車站").signLanguage, true);
  assert.deepEqual(get("台北車站").lines, ["淡水信義線", "板南線"]);
});

test("nearestStation：找最近的無障礙出入口", () => {
  const near = nearestStation(STATIONS, { lat: 25.0375, lng: 121.5637 })!;
  assert.equal(near.station.name, "市政府站");
  assert.equal(near.exit.label, "出口2");
  assert.ok(near.distance > 400 && near.distance < 500, String(near.distance));
  assert.equal(nearestStation([], { lat: 25, lng: 121.5 }), null);
});

test("formatDistance：公尺取整到 10，超過 1 公里用公里", () => {
  assert.equal(formatDistance(3), "10 公尺");
  assert.equal(formatDistance(447), "450 公尺");
  assert.equal(formatDistance(1000), "1 公里");
  assert.equal(formatDistance(2349), "2.3 公里");
});

test("describeStation：第一句就是重點（最近的站、哪個出口的電梯、多遠）", () => {
  const station = get("市政府站");
  const result = describeStation(station, { distance: 447, exit: station.exits[0], alerts: [] });
  assert.equal(result.headline, "離您最近的是市政府站，出口2的電梯約 450 公尺。");
  assert.deepEqual(result.details, [
    "電梯在出口2。",
    "目前沒有無障礙設施異常公告。",
    "導盲磚從出口電梯，接到大廳無障礙閘門、月臺電梯、月臺。",
    "視障優先候車在一、二月臺前端。",
    "詢問處在大廳層(B1)，近出口1，可以請站務人員引導。",
  ]);
  assert.equal(result.summary, "離您最近的是市政府站，出口2的電梯約 450 公尺。電梯在出口2。目前沒有無障礙設施異常公告。");
});

test("describeStation：多線車站分線說明；有 1999 手語視訊；異常公告排在電梯後面", () => {
  const result = describeStation(get("台北車站"), {
    alerts: [{ time: "11月1日 22:40", text: "捷運板南線台北車站月台電梯暫停使用。" }],
  });
  assert.equal(result.headline, "台北車站：電梯在淡水信義線出口M2；板南線出口M4。");
  assert.deepEqual(result.details, [
    "異常公告（11月1日 22:40）：捷運板南線台北車站月台電梯暫停使用。",
    "導盲磚：淡水信義線、板南線從出口電梯，接到大廳無障礙閘門、月臺電梯、月臺。",
    "視障優先候車：淡水信義線在一月臺前端；板南線沒有。",
    "詢問處：淡水信義線大廳層(B3)，近台鐵/高鐵轉乘區；板南線大廳層(B2)，近出口M4、M5、M6。可以請站務人員引導。",
    "本站有 1999 手語視訊，可以請站務人員協助。",
  ]);
  assert.equal(
    result.summary,
    "台北車站：電梯在淡水信義線出口M2；板南線出口M4。異常公告（11月1日 22:40）：捷運板南線台北車站月台電梯暫停使用。本站有 1999 手語視訊，可以請站務人員協助。",
  );
});

test("describeStation：坡道、沒有導盲磚、沒有優先候車、單一出口、公告讀不到", () => {
  const ramp = describeStation(get("圓山站"), { alerts: [] });
  assert.equal(ramp.headline, "圓山站：無障礙坡道在出口1、出口2。");
  assert.ok(ramp.details.includes("資料沒有列出導盲磚路線。"));
  assert.ok(!ramp.details.some((d) => d.startsWith("視障優先候車")));
  const single = describeStation(get("中山國中站"), { alerts: null });
  assert.equal(single.headline, "中山國中站：本站只有一個出口，有電梯。");
  assert.equal(single.details[0], "異常公告暫時讀不到。");
});

test("formatAlertTime、cleanAlertText：異常公告的時間與內文（去掉括號和客套話，報讀比較快）", () => {
  assert.equal(formatAlertTime("20261101T224000"), "11月1日 22:40");
  assert.equal(formatAlertTime("2026/11/01 22:40"), "2026/11/01 22:40");
  assert.equal(
    cleanAlertText("捷運板南線【頂埔站】【月台電梯】已修復完成及開放使用，歡迎搭乘，造成不便，敬請見諒。\t\t\t"),
    "捷運板南線頂埔站月台電梯已修復完成及開放使用。",
  );
});

test("alertsForStation：臺／台、有沒有「站」字都對得到", () => {
  const alerts = [
    { 項次: "1", 日期時間: "20261101T224000", 路線: "板南線", 車站: "頂埔站", 說明: "捷運板南線【頂埔站】【月台電梯】已修復完成及開放使用。" },
    { 項次: "2", 日期時間: "20261102T080000", 路線: "淡水信義線", 車站: "臺北車站", 說明: "月台電梯維修中。" },
  ];
  assert.deepEqual(alertsForStation(alerts, "台北車站"), [{ time: "11月2日 08:00", text: "月台電梯維修中。" }]);
  assert.deepEqual(alertsForStation(alerts, "頂埔站").length, 1);
  assert.deepEqual(alertsForStation(alerts, "市政府站"), []);
});

test("signalName：全形空白分隔的兩條路改成「與」", () => {
  assert.equal(signalName("八德路二段　　建國北一段"), "八德路二段與建國北一段");
  assert.equal(signalName("民生東二段　　吉林路　"), "民生東二段與吉林路");
  assert.equal(signalName("民生西路        　66巷(捷運1號出口)"), "民生西路與66巷(捷運1號出口)");
});

test("nearestSignals：由近到遠取 3 個，沒有座標的跳過", () => {
  const signals = [
    { 路口: "A路　　B路", 行政區: "信義區", lat: 25.04, lng: 121.565 },
    { 路口: "C路　　D路", 行政區: "信義區", lat: 25.0376, lng: 121.5638 },
    { 路口: "E路　　F路", 行政區: "大安區", lat: 25.03, lng: 121.55 },
    { 路口: "G路　　H路", 行政區: "中山區", lat: 25.06, lng: 121.52 },
    { 路口: "沒有座標", 行政區: "中山區" },
  ];
  const result = nearestSignals(signals, { lat: 25.0375, lng: 121.5637 });
  assert.deepEqual(
    result.map((s) => [s.name, s.district]),
    [
      ["C路與D路", "信義區"],
      ["A路與B路", "信義區"],
      ["E路與F路", "大安區"],
    ],
  );
  assert.ok(result[0].distance < result[1].distance);
});

test("stationsByLine：依路線分組，照站號排序（站號和路線的順序不一定對得上，以站號字首為準）", () => {
  const groups = stationsByLine(STATIONS);
  assert.deepEqual(
    groups.map((g) => [g.line, g.stations.map((s) => s.name)]),
    [
      ["文湖線", ["中山國中站"]],
      ["淡水信義線", ["台北車站", "中山站", "圓山站"]],
      ["板南線", ["台北車站", "市政府站"]],
    ],
  );
});

test("signalsSentence：附近有聲號誌的一句話；沒有資料、讀不到時明白說", () => {
  const signals = [
    { name: "市府路與松壽路", district: "信義區", distance: 183, lat: 0, lng: 0 },
    { name: "松壽路與松智路", district: "信義區", distance: 251, lat: 0, lng: 0 },
  ];
  assert.equal(signalsSentence(signals), "附近的有聲號誌路口：市府路與松壽路，約 180 公尺；松壽路與松智路，約 250 公尺。");
  assert.equal(signalsSentence([]), "附近沒有有聲號誌路口的資料。");
  assert.equal(signalsSentence(null), "有聲號誌資料暫時讀不到。");
});
