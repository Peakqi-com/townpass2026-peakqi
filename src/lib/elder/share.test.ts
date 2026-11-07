import { test } from "node:test";
import assert from "node:assert/strict";
import { followUpShareText, helpShareText } from "./share.ts";

// 「傳給家人知道」的文字：長輩送出前會在畫面上看到，可以再改

test("followUpShareText：回診，寫出日期、星期、要帶健保卡，最後署名", () => {
  assert.equal(
    followUpShareText({ kind: "revisit", date: "2026-11-20", name: "金大森" }),
    "我 11 月 20 日（星期五）要回診，記得提醒我帶健保卡。— 金大森",
  );
});

test("followUpShareText：領藥，多提醒帶慢性病連續處方箋", () => {
  assert.equal(
    followUpShareText({ kind: "refill", date: "2026-11-20", name: "金大森" }),
    "我 11 月 20 日（星期五）要領慢性病連續處方箋的藥，記得提醒我帶健保卡和處方箋。— 金大森",
  );
});

test("followUpShareText：沒有名字（還沒讀到帳號）就不署名", () => {
  assert.equal(
    followUpShareText({ kind: "revisit", date: "2026-11-20" }),
    "我 11 月 20 日（星期五）要回診，記得提醒我帶健保卡。",
  );
  assert.equal(followUpShareText({ kind: "revisit", date: "2026-11-20", name: "  " }).includes("—"), false);
});

test("helpShareText：求助時讓家人知道是誰、要打電話來", () => {
  assert.equal(helpShareText("金大森"), "我是金大森，現在需要幫忙，請盡快打電話給我。");
  assert.equal(helpShareText(undefined), "我現在需要幫忙，請盡快打電話給我。");
  assert.equal(helpShareText(""), "我現在需要幫忙，請盡快打電話給我。");
});
