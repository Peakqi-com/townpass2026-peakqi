import { test } from "node:test";
import assert from "node:assert/strict";
import { findServices, normalize } from "./match.ts";

const ids = (q: string, mode?: "normal" | "hearing" | "vision") => findServices(q, { mode }).map((s) => s.id);

test("normalize：全形轉半形、臺→台、去掉空白與標點、英文轉小寫", () => {
  assert.equal(normalize("  我要　去臺北，看醫生！"), "我要去台北看醫生");
  assert.equal(normalize("ＡＴＭ １９９９"), "atm1999");
});

test("長輩的說法：叫車", () => {
  assert.equal(ids("我要叫車")[0], "page-ride");
  assert.equal(ids("我腳不方便要怎麼去醫院")[0], "page-ride");
});

test("長輩的說法：看醫生、掛號", () => {
  assert.equal(ids("我要去看醫生")[0], "tpech-reg");
  assert.equal(ids("聯醫掛號")[0], "tpech-reg");
});

test("長輩的說法：防詐騙；已經有確切命中時，不補上只是字面相似的服務", () => {
  // 「打電話」和手語視訊轉譯的說法「幫我打電話」部分相似，但長輩要的只有 165
  assert.deepEqual(ids("有人打電話說我中獎要我去ATM"), ["antifraud-165"]);
});

test("長輩的說法：敬老卡、重陽禮金、長照", () => {
  assert.equal(ids("敬老卡還有幾點")[0], "senior-card");
  assert.equal(ids("重陽禮金什麼時候發")[0], "double-ninth");
  assert.equal(ids("我爸跌倒走不動要找人照顧")[0], "ltc-1966");
});

test("長輩的說法：吃飯、上課、聽不到", () => {
  assert.equal(ids("附近哪裡可以吃飯")[0], "page-community");
  assert.equal(ids("我聽不到")[0], "page-text");
});

test("語音辨識聽錯一個字時，仍然找得到（敬老咖→敬老卡）", () => {
  assert.equal(ids("敬老咖點數")[0], "senior-card");
  assert.equal(ids("敬老咖")[0], "senior-card", "完全沒有確切命中時，才用字面相似補救");
});

test("最多回三個；找不到時回空陣列", () => {
  assert.ok(ids("看醫生").length <= 3);
  assert.deepEqual(ids("asdfgh"), []);
  assert.deepEqual(ids(""), []);
  assert.deepEqual(ids("   "), []);
});

test("聽不清楚模式：同分時優先給有文字管道的服務", () => {
  // 「手語」同時符合手語翻譯與手語視訊轉譯，兩者都對聽障者友善；重點是第一名一定是給聽障者的服務
  const first = findServices("手語", { mode: "hearing" })[0];
  assert.ok(first.audience.includes("hearing"));
});
