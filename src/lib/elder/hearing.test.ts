import { test } from "node:test";
import assert from "node:assert/strict";
import { CLINIC_QUESTIONS, HELP_CARDS, SMS_110, SMS_119, TEXT_CHANNELS, allSources } from "./hearing.ts";
import { getService } from "./services.ts";

// M8 聽不清楚的資料驗證：號碼與時段只能來自研究文件標 ✅ 的資料，每一筆都要有來源和查證日期。

test("每個來源都是 https，並附查證日期（YYYY-MM-DD）", () => {
  const sources = allSources();
  assert.ok(sources.length >= 6);
  for (const s of sources) {
    assert.match(s.url, /^https:\/\//, s.label);
    assert.match(s.verified, /^\d{4}-\d{2}-\d{2}$/, s.label);
    assert.ok(s.label.length > 0);
  }
});

test("文字管道：id 不重複；每個都有主責機關、服務時間、至少一個聯絡方式", () => {
  const ids = TEXT_CHANNELS.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const c of TEXT_CHANNELS) {
    assert.ok(c.owner.length > 0, `${c.id} 缺主責機關`);
    assert.ok(c.hours.length > 0, `${c.id} 缺服務時間`);
    assert.ok(c.contacts.length > 0, `${c.id} 缺聯絡方式`);
    assert.ok(c.sources.length > 0, `${c.id} 缺來源`);
    if (c.serviceId) assert.ok(getService(c.serviceId), `${c.id} 的 serviceId 不在 services.json`);
  }
});

test("1999：LINE ID 可以複製；時段用現行的（手語視訊週一至週六 9:00–18:00），不出現過時的 8–22 時", () => {
  const c1999 = TEXT_CHANNELS.find((c) => c.id === "1999");
  assert.ok(c1999);
  const line = c1999.contacts.find((x) => x.kind === "line");
  assert.equal(line?.copy, "taipeicity1999");
  const hours = c1999.hours.map((h) => `${h.label}${h.value}`).join("|");
  assert.match(hours, /文字.*24 小時/);
  assert.match(hours, /手語視訊.*週一至週六 9:00–18:00/);
  assert.doesNotMatch(JSON.stringify(c1999), /22:00|8:00–22/);
});

test("手語翻譯：LINE／簡訊 0963-047-723，原則上 3 天前申請", () => {
  const sign = TEXT_CHANNELS.find((c) => c.id === "sign-language");
  assert.ok(sign);
  assert.ok(sign.contacts.some((x) => x.kind === "line" && x.copy === "0963-047-723"));
  assert.ok(sign.contacts.some((x) => x.kind === "sms" && x.sms === "0963047723"));
  assert.match(JSON.stringify(sign), /3 天前/);
});

test("119 簡訊：兩個官方版本都列出、都標待確認，各自附來源", () => {
  const numbers = SMS_119.map((n) => n.number);
  assert.deepEqual(numbers.sort(), ["0911511902", "0932299702"]);
  for (const n of SMS_119) {
    assert.equal(n.pending, true, `${n.number} 要標待確認`);
    assert.ok(n.sources.length > 0);
  }
});

test("110 簡訊 0911-510-914（消防署開放資料 ✅）", () => {
  assert.equal(SMS_110.number, "0911510914");
  assert.match(SMS_110.sources[0].url, /data\.gov\.tw\/dataset\/7916/);
});

test("求助卡、看診問答卡：id 不重複；每題 2～8 個選項、選項不重複", () => {
  assert.ok(HELP_CARDS.length >= 3);
  assert.equal(new Set(HELP_CARDS.map((c) => c.id)).size, HELP_CARDS.length);
  assert.ok(HELP_CARDS.some((c) => c.text.includes("我聽不到")));
  assert.ok(HELP_CARDS.some((c) => c.text.includes("救護車")));
  assert.equal(new Set(CLINIC_QUESTIONS.map((q) => q.id)).size, CLINIC_QUESTIONS.length);
  for (const q of CLINIC_QUESTIONS) {
    assert.ok(q.options.length >= 2 && q.options.length <= 8, q.id);
    assert.equal(new Set(q.options).size, q.options.length, q.id);
  }
});
