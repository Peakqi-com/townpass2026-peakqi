import { test } from "node:test";
import assert from "node:assert/strict";
import { elderBenefits, GIFT_TITLE, giftAmountLine, healthCheckTiming } from "./benefits.ts";

// M6 我的權益：依 userinfo 的生日、市民、原住民身分，主動列出長輩的權益
const TODAY = new Date("2026-11-07T04:00:00Z");
const citizen = { citizen: true, nativePeople: false };

test("86 歲市民：重陽禮金 3,000 元、敬老卡、疫苗、健檢都列出", () => {
  const b = elderBenefits({ ...citizen, birthday: "1940/03/01" }, TODAY);
  assert.equal(b.age, 86);
  assert.equal(b.isSenior, true);
  assert.equal(b.gift?.amount, 3000);
  assert.equal(b.seniorCard, true);
  assert.equal(b.vaccine, true);
  assert.ok(b.healthCheck);
});

test("37 歲：沒有長輩權益（畫面只放補助小幫手）", () => {
  const b = elderBenefits({ ...citizen, birthday: "1988/12/12" }, TODAY);
  assert.equal(b.age, 37);
  assert.equal(b.isSenior, false);
  assert.equal(b.gift, null);
  assert.equal(b.seniorCard, false);
  assert.equal(b.vaccine, false);
  assert.equal(b.healthCheck, null);
});

test("原住民：敬老卡、疫苗、健檢的門檻降到 55 歲", () => {
  const b = elderBenefits({ citizen: true, nativePeople: true, birthday: "1970/01/01" }, TODAY);
  assert.equal(b.age, 56);
  assert.equal(b.seniorAge, 55);
  assert.equal(b.seniorCard, true);
  assert.equal(b.vaccine, true);
  assert.ok(b.healthCheck);
});

test("不是臺北市民：只列公費疫苗（全國），不列敬老卡、健檢、禮金", () => {
  const b = elderBenefits({ citizen: false, nativePeople: false, birthday: "1950/01/01" }, TODAY);
  assert.equal(b.vaccine, true);
  assert.equal(b.seniorCard, false);
  assert.equal(b.healthCheck, null);
  assert.equal(b.gift, null);
});

test("生日讀不到：年齡為 null，什麼都不列", () => {
  const b = elderBenefits({ ...citizen, birthday: "" }, TODAY);
  assert.equal(b.age, null);
  assert.equal(b.isSenior, false);
});

test("健檢：每年 1 月開放預約；11 月看到的是「明年（116 年）1 月」", () => {
  assert.deepEqual(healthCheckTiming(TODAY), { year: 2027, rocYear: 116, inJanuary: false });
  assert.deepEqual(healthCheckTiming(new Date("2027-01-10T04:00:00Z")), { year: 2027, rocYear: 116, inJanuary: true });
  // 臺北時間 1/1 凌晨（UTC 還是 12/31）也算 1 月
  assert.deepEqual(healthCheckTiming(new Date("2026-12-31T17:00:00Z")), { year: 2027, rocYear: 116, inJanuary: true });
});

/* ---------- 很多人不知道的權益（排在最上面） ---------- */

test("很多人不知道的權益：86 歲市民有老人健保費補助（資料取自 subsidies.json）、長照交通接送、照顧家人", () => {
  const b = elderBenefits({ ...citizen, birthday: "1940/03/01" }, TODAY);
  assert.ok(b.lesserKnown);
  assert.equal(b.lesserKnown.nhiPremium?.id, "elder-nhi-premium");
  assert.equal(b.lesserKnown.nhiPremium?.amount, "每人每月最多 826 元");
  assert.ok(b.lesserKnown.nhiPremium?.apply.autoNote?.includes("被停補的人可以申請恢復"));
  assert.equal(b.lesserKnown.ltcRide, true);
  assert.equal(b.lesserKnown.care, true);
});

test("很多人不知道的權益：原住民 56 歲也列出老人健保費補助", () => {
  const b = elderBenefits({ citizen: true, nativePeople: true, birthday: "1970/01/01" }, TODAY);
  assert.equal(b.lesserKnown?.nhiPremium?.id, "elder-nhi-premium");
});

test("很多人不知道的權益：未滿年齡不列；不是臺北市民只留照顧家人", () => {
  assert.equal(elderBenefits({ ...citizen, birthday: "1988/12/12" }, TODAY).lesserKnown, null);
  const b = elderBenefits({ citizen: false, nativePeople: false, birthday: "1950/01/01" }, TODAY);
  assert.equal(b.lesserKnown?.nhiPremium, null);
  assert.equal(b.lesserKnown?.ltcRide, false);
  assert.equal(b.lesserKnown?.care, true);
});

/* ---------- 重陽禮金：寫給還沒收到的人 ---------- */

test("重陽禮金的標題寫給還沒收到的人，金額照舊", () => {
  assert.equal(GIFT_TITLE, "還沒收到重陽禮金嗎？");
  const b = elderBenefits({ ...citizen, birthday: "1940/03/01" }, TODAY);
  assert.equal(giftAmountLine(b.gift!), "您今年可能可以領 3,000 元。");
});
