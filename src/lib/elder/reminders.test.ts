import { test } from "node:test";
import assert from "node:assert/strict";
import { followUpDateRange, followUpReminder, formatDay, formatReminderTime, giftReminder } from "./reminders.ts";

const at = (iso: string) => new Date(iso);

test("giftReminder：截止前一天（11/12）早上 9 點提醒", () => {
  const r = giftReminder(at("2026-11-07T15:00:00+08:00"));
  assert.ok(r);
  assert.equal(r.id, "double-ninth-2026");
  assert.equal(r.at, "2026-11-12T09:00:00+08:00");
  assert.equal(r.title, "重陽禮金明天截止");
  assert.ok(r.title.length <= 40 && r.body.length <= 120, "符合 App 端的長度限制");
});

test("giftReminder：已經過了 11/12 早上 9 點 → 改成截止當天早上 9 點", () => {
  const r = giftReminder(at("2026-11-12T10:00:00+08:00"));
  assert.ok(r);
  assert.equal(r.at, "2026-11-13T09:00:00+08:00");
  assert.equal(r.title, "重陽禮金今天截止");
});

test("giftReminder：提醒時間剩不到 5 分鐘就不提供（來不及排程）", () => {
  assert.equal(giftReminder(at("2026-11-13T08:57:00+08:00")), null);
});

test("giftReminder：截止日當天 9 點以後、或已經過了截止日，不提供提醒", () => {
  assert.equal(giftReminder(at("2026-11-13T09:30:00+08:00")), null);
  assert.equal(giftReminder(at("2026-12-01T09:00:00+08:00")), null);
});

test("giftReminder：不是 2026 年就不提供（規則只查證到今年）", () => {
  assert.equal(giftReminder(at("2027-11-01T09:00:00+08:00")), null);
});

test("formatReminderTime：用長輩看得懂的說法", () => {
  assert.equal(formatReminderTime("2026-11-12T09:00:00+08:00"), "11 月 12 日（星期四）早上 9 點");
  assert.equal(formatReminderTime("2026-11-13T09:00:00+08:00"), "11 月 13 日（星期五）早上 9 點");
});

/* ---------- 回診／領藥提醒（看完醫生之後） ---------- */

test("followUpReminder：前一天晚上 7 點提醒回診，id 帶種類和日期", () => {
  const r = followUpReminder({ kind: "revisit", date: "2026-11-20", now: at("2026-11-07T15:00:00+08:00") });
  assert.ok(r);
  assert.equal(r.id, "followup-revisit-20261120");
  assert.equal(r.at, "2026-11-19T19:00:00+08:00");
  assert.equal(r.title, "明天要回診");
  assert.ok(r.body.includes("11 月 20 日（星期五）"), "內文寫出哪一天");
  assert.ok(r.body.includes("健保卡") && r.body.includes("藥袋"), "提醒帶健保卡、藥袋");
});

test("followUpReminder：領藥的內文多提醒帶慢性病連續處方箋", () => {
  const r = followUpReminder({ kind: "refill", date: "2026-11-20", now: at("2026-11-07T15:00:00+08:00") });
  assert.ok(r);
  assert.equal(r.id, "followup-refill-20261120");
  assert.equal(r.at, "2026-11-19T19:00:00+08:00");
  assert.ok(r.title.includes("領藥"));
  assert.ok(r.body.includes("慢性病連續處方箋"));
  assert.ok(r.body.includes("健保卡") && r.body.includes("藥袋"));
});

test("followUpReminder：跨月、跨年的前一天也算對（臺北時間）", () => {
  assert.equal(followUpReminder({ kind: "revisit", date: "2026-12-01", now: at("2026-11-07T15:00:00+08:00") })?.at, "2026-11-30T19:00:00+08:00");
  assert.equal(followUpReminder({ kind: "revisit", date: "2027-01-01", now: at("2026-11-07T15:00:00+08:00") })?.at, "2026-12-31T19:00:00+08:00");
});

test("followUpReminder：前一天晚上 7 點剩不到 5 分鐘 → 改成當天早上 7 點", () => {
  const r = followUpReminder({ kind: "revisit", date: "2026-11-08", now: at("2026-11-07T18:57:00+08:00") });
  assert.ok(r);
  assert.equal(r.at, "2026-11-08T07:00:00+08:00");
  assert.equal(r.title, "今天要回診");
  assert.equal(r.id, "followup-revisit-20261108", "同一天同一種只有一個提醒，id 不因時間改變");
});

test("followUpReminder：兩個時間都過了 → null（畫面說明來不及提醒）", () => {
  assert.equal(followUpReminder({ kind: "revisit", date: "2026-11-07", now: at("2026-11-07T08:00:00+08:00") }), null);
  assert.equal(followUpReminder({ kind: "refill", date: "2026-11-01", now: at("2026-11-07T08:00:00+08:00") }), null);
});

test("followUpReminder：日期格式不對或超過可以選的範圍 → null", () => {
  const now = at("2026-11-07T15:00:00+08:00");
  assert.equal(followUpReminder({ kind: "revisit", date: "", now }), null);
  assert.equal(followUpReminder({ kind: "revisit", date: "2026-02-30", now }), null);
  assert.equal(followUpReminder({ kind: "revisit", date: "2026/11/20", now }), null);
  assert.equal(followUpReminder({ kind: "revisit", date: "2027-12-31", now }), null, "超過 400 天，App 不接受");
});

test("followUpReminder：符合 App 端的規則（id、長度、時間範圍）", () => {
  const now = at("2026-11-07T15:00:00+08:00");
  const { max } = followUpDateRange(now);
  for (const kind of ["revisit", "refill"] as const) {
    for (const date of ["2026-11-08", max]) {
      const r = followUpReminder({ kind, date, now });
      assert.ok(r, `${kind} ${date} 要有提醒`);
      assert.match(r.id, /^[a-z0-9-]+$/);
      assert.ok(r.title.length <= 40, "標題最多 40 字");
      assert.ok(r.body.length <= 120, "內文最多 120 字");
      assert.match(r.at, /\+08:00$/);
      const ahead = new Date(r.at).getTime() - now.getTime();
      assert.ok(ahead >= 60 * 1000 && ahead <= 400 * 24 * 60 * 60 * 1000, "App 只接受 1 分鐘到 400 天之後");
    }
  }
});

test("followUpDateRange：最早明天、最晚 400 天後（以臺北日期計算）", () => {
  assert.deepEqual(followUpDateRange(at("2026-11-07T15:00:00+08:00")), { min: "2026-11-08", max: "2027-12-12" });
  // UTC 還是 11/7，臺北已經是 11/8
  assert.deepEqual(followUpDateRange(at("2026-11-07T16:30:00Z")).min, "2026-11-09");
});

test("formatDay：「11 月 20 日（星期五）」", () => {
  assert.equal(formatDay("2026-11-20"), "11 月 20 日（星期五）");
  assert.equal(formatDay("2027-01-01"), "1 月 1 日（星期五）");
});
