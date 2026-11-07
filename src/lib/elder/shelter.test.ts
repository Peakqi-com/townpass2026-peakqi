import { test } from "node:test";
import assert from "node:assert/strict";
import { hazardLabel, sheltersFor, toShelter, type Shelter } from "./shelter.ts";

// 範例取自 2026-11-07 下載的〈臺北市可供避難收容處所一覽表〉（.ods，經 /api/opendata/shelters 整理過）
const raw = (over: Record<string, string>) => ({
  收容所編號: "SA100-0000",
  "名稱(學校機關全銜)": "某某國小",
  縣市: "臺北市",
  鄉鎮: "中山區",
  村里: "正得里",
  門牌地址: "吉林路15號",
  類型: "學校",
  水災: "是",
  震災: "備用",
  無障礙設施: "是",
  室內: "是",
  服務里別: "正得里、正守里、",
  district: "中山區",
  ...over,
});

test("toShelter：地址補上臺北市與行政區，服務里別拆成陣列（去掉結尾的頓號）", () => {
  const s = toShelter(raw({ 收容所編號: "SA104-0010", "名稱(學校機關全銜)": "臺北市中山區長安國民小學" }))!;
  assert.equal(s.key, "SA104-0010");
  assert.equal(s.name, "臺北市中山區長安國民小學");
  assert.equal(s.address, "臺北市中山區吉林路15號");
  assert.deepEqual(s.serves, ["正得里", "正守里"]);
  assert.equal(s.flood, "是");
  assert.equal(s.quake, "備用");
  assert.equal(s.accessible, true);
  assert.equal(s.indoor, true);
});

test("toShelter：地址已經寫了臺北市就不重複加；沒有名稱或不在臺北市的回 null", () => {
  assert.equal(toShelter(raw({ 門牌地址: "臺北市中山區北安路420號" }))!.address, "臺北市中山區北安路420號");
  assert.equal(toShelter(raw({ "名稱(學校機關全銜)": "" })), null);
  assert.equal(toShelter(raw({ district: "" })), null);
});

const list: Shelter[] = [
  toShelter(raw({ 收容所編號: "A", "名稱(學校機關全銜)": "我的里・水災備用", 水災: "備用" }))!,
  toShelter(raw({ 收容所編號: "B", "名稱(學校機關全銜)": "我的里・沒有無障礙", 無障礙設施: "否" }))!,
  toShelter(raw({ 收容所編號: "C", "名稱(學校機關全銜)": "我的里・有無障礙" }))!,
  toShelter(raw({ 收容所編號: "D", "名稱(學校機關全銜)": "同區別的里", 服務里別: "大直里" }))!,
  toShelter(raw({ 收容所編號: "E", "名稱(學校機關全銜)": "同區・不能防水災", 服務里別: "大直里", 水災: "否", 震災: "是" }))!,
  toShelter(raw({ 收容所編號: "F", "名稱(學校機關全銜)": "別區", 鄉鎮: "大安區", district: "大安區" }))!,
];

test("sheltersFor：負責我這個里的排前面，「是」在「備用」前，有無障礙的優先", () => {
  const r = sheltersFor(list, { district: "中山區", village: "正得里", hazard: "flood" });
  assert.deepEqual(r.mine.map((s) => s.key), ["C", "B", "A"]);
  assert.deepEqual(r.others.map((s) => s.key), ["D"], "E 不能防水災，F 在別區");
});

test("sheltersFor：地震只列震災可以用的；沒有選災害時列全部", () => {
  assert.deepEqual(sheltersFor(list, { district: "中山區", village: "正得里", hazard: "quake" }).others.map((s) => s.key), ["E", "D"]);
  const all = sheltersFor(list, { district: "中山區", village: "正得里", hazard: null });
  assert.equal(all.mine.length + all.others.length, 5);
});

test("sheltersFor：不知道里（例如自己換了區）時，全部放在 others", () => {
  const r = sheltersFor(list, { district: "中山區", village: undefined, hazard: "flood" });
  assert.deepEqual(r.mine, []);
  // 「是」且有無障礙（C、D）→「是」沒有無障礙（B）→「備用」（A）
  assert.deepEqual(r.others.map((s) => s.key), ["C", "D", "B", "A"]);
});

test("sheltersFor：同一級裡，和長輩家同一條路的排前面", () => {
  const near = toShelter(raw({ 收容所編號: "N", "名稱(學校機關全銜)": "長安國小", 門牌地址: "吉林路15號" }))!;
  const far = toShelter(raw({ 收容所編號: "F2", "名稱(學校機關全銜)": "大直高中", 門牌地址: "北安路420號" }))!;
  const r = sheltersFor([far, near], { district: "中山區", village: "正得里", hazard: "flood", street: "吉林路" });
  assert.deepEqual(r.mine.map((s) => s.key), ["N", "F2"]);
  // 沒有街道資料時維持原本的順序
  assert.deepEqual(sheltersFor([far, near], { district: "中山區", village: "正得里", hazard: "flood" }).mine.map((s) => s.key), ["F2", "N"]);
});

test("hazardLabel：唸得懂的說法", () => {
  assert.equal(hazardLabel("是"), "可以收容");
  assert.equal(hazardLabel("備用"), "備用");
  assert.equal(hazardLabel("否"), "不適用");
  assert.equal(hazardLabel(""), "資料裡沒寫");
});
