import { test } from "node:test";
import assert from "node:assert/strict";
import { ageOn, doubleNinthGift, greetingFor, parseMode } from "./profile.ts";

// 2026-11-07 中午（臺北時間）＝ 04:00 UTC
const TODAY = new Date("2026-11-07T04:00:00Z");

test("ageOn：依生日（yyyy/MM/dd）算出當天的實歲", () => {
  assert.equal(ageOn("1940/03/01", TODAY), 86);
  assert.equal(ageOn("1940/11/07", TODAY), 86, "生日當天算滿");
  assert.equal(ageOn("1940/11/08", TODAY), 85, "生日還沒到");
  assert.equal(ageOn("1988/12/12", TODAY), 37);
});

test("ageOn：格式錯誤或空值回傳 null", () => {
  for (const bad of ["", "1940-03-01", "abc", "1940/13/01", "1940/02/30"]) {
    assert.equal(ageOn(bad, TODAY), null, bad);
  }
});

test("greetingFor：依臺北時間回傳早安、午安、晚安", () => {
  assert.equal(greetingFor(new Date("2026-11-07T00:30:00Z")), "早安"); // 08:30
  assert.equal(greetingFor(new Date("2026-11-07T04:00:00Z")), "午安"); // 12:00
  assert.equal(greetingFor(new Date("2026-11-07T09:59:00Z")), "午安"); // 17:59
  assert.equal(greetingFor(new Date("2026-11-07T10:00:00Z")), "晚安"); // 18:00
  assert.equal(greetingFor(new Date("2026-11-06T20:00:00Z")), "早安"); // 04:00 → 清晨也說早安
});

test("parseMode：只接受三種模式，其他回傳 null", () => {
  assert.equal(parseMode("normal"), "normal");
  assert.equal(parseMode("hearing"), "hearing");
  assert.equal(parseMode("vision"), "vision");
  assert.equal(parseMode(null), null);
  assert.equal(parseMode("deaf"), null);
});

const citizen = { citizen: true, nativePeople: false };

test("重陽禮金：依年底前的年齡分級（115 年）", () => {
  assert.equal(doubleNinthGift({ ...citizen, birthday: "1961/12/31" }, TODAY)?.amount, 1500, "年底滿 65");
  assert.equal(doubleNinthGift({ ...citizen, birthday: "1942/06/01" }, TODAY)?.amount, 1500, "84 歲");
  assert.equal(doubleNinthGift({ ...citizen, birthday: "1941/12/31" }, TODAY)?.amount, 3000, "年底滿 85");
  assert.equal(doubleNinthGift({ ...citizen, birthday: "1927/01/01" }, TODAY)?.amount, 10000, "99 歲");
});

test("重陽禮金：未滿 65、非臺北市民、生日格式錯誤時回傳 null", () => {
  assert.equal(doubleNinthGift({ ...citizen, birthday: "1962/01/01" }, TODAY), null, "年底才 64");
  assert.equal(doubleNinthGift({ citizen: false, nativePeople: false, birthday: "1940/01/01" }, TODAY), null);
  assert.equal(doubleNinthGift({ ...citizen, birthday: "" }, TODAY), null);
});

test("重陽禮金：原住民年齡門檻各降 10 歲", () => {
  const native = { citizen: true, nativePeople: true };
  assert.equal(doubleNinthGift({ ...native, birthday: "1971/12/31" }, TODAY)?.amount, 1500, "年底滿 55");
  assert.equal(doubleNinthGift({ ...native, birthday: "1951/01/01" }, TODAY)?.amount, 3000, "75 歲");
  assert.equal(doubleNinthGift({ ...native, birthday: "1937/01/01" }, TODAY)?.amount, 10000, "89 歲");
  assert.equal(doubleNinthGift({ ...native, birthday: "1972/01/01" }, TODAY), null, "54 歲");
});

test("重陽禮金：11/13 前顯示剩幾天；之後到 12/31 前只能申請補發", () => {
  const person = { ...citizen, birthday: "1940/03/01" };

  assert.deepEqual(doubleNinthGift(person, TODAY), { amount: 3000, phase: "apply", daysLeft: 6 });
  assert.deepEqual(doubleNinthGift(person, new Date("2026-11-13T04:00:00Z")), {
    amount: 3000,
    phase: "apply",
    daysLeft: 0,
  });
  assert.deepEqual(doubleNinthGift(person, new Date("2026-11-14T04:00:00Z")), {
    amount: 3000,
    phase: "reissue",
    daysLeft: 47,
  });
});

test("重陽禮金：規則只適用 115 年（2026），其他年份不顯示，避免金額過期", () => {
  const person = { ...citizen, birthday: "1940/03/01" };
  assert.equal(doubleNinthGift(person, new Date("2027-10-01T04:00:00Z")), null);
  assert.equal(doubleNinthGift(person, new Date("2025-11-01T04:00:00Z")), null);
});
