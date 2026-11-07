import { test } from "node:test";
import assert from "node:assert/strict";
import { formatReminderTime, giftReminder } from "./reminders.ts";

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
