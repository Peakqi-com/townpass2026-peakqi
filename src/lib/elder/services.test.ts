import { test } from "node:test";
import assert from "node:assert/strict";
import { SERVICES, getService, phoneOf, type Action } from "./services.ts";

// M3 服務清單的資料驗證：清單之後由各局處維護，這些規則保證每一筆都可以安全使用。

test("每筆服務的 id 不重複", () => {
  const ids = SERVICES.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("每筆服務都有標題、唸出的話、說明、至少一個長輩說法", () => {
  for (const s of SERVICES) {
    assert.ok(s.title.length > 0 && s.title.length <= 8, `${s.id} 標題要 1～8 個字`);
    assert.ok(s.speak.length > 0, `${s.id} 缺 speak`);
    assert.ok(s.description.length > 0, `${s.id} 缺 description`);
    assert.ok(s.phrases.length > 0, `${s.id} 缺 phrases`);
  }
});

test("每筆服務都附官方來源（https）與查證日期（YYYY-MM-DD）", () => {
  for (const s of SERVICES) {
    assert.match(s.source, /^https:\/\//, `${s.id} 的 source`);
    assert.match(s.verified, /^\d{4}-\d{2}-\d{2}$/, `${s.id} 的 verified`);
    assert.ok(s.owner.length > 0, `${s.id} 缺主責機關`);
  }
});

function assertActionValid(id: string, a: Action) {
  switch (a.type) {
    case "phone_call":
      assert.match(a.target, /^\d{3,12}$/, `${id} 的電話只能是數字`);
      break;
    case "open_link":
    case "open_external":
      assert.match(a.target, /^https:\/\//, `${id} 的連結必須是 https`);
      break;
    case "page":
      assert.match(a.target, /^\/[a-z0-9/-]*$/, `${id} 的頁面路徑`);
      break;
    case "1999agree":
      break;
    default:
      assert.fail(`${id} 有未知的動作類型`);
  }
}

test("動作只能是既有或 M0 新增的 Handler，或站內頁面；目標格式正確", () => {
  for (const s of SERVICES) {
    assertActionValid(s.id, s.action);
    if (s.fallback) assertActionValid(s.id, s.fallback);
    for (const alt of s.alt_channels ?? []) {
      assertActionValid(s.id, alt);
      assert.ok(alt.label.length > 0, `${s.id} 的替代管道缺 label`);
    }
  }
});

test("只能用講的服務（主要動作是撥號）必須明確寫出 alt_channels（沒有就寫空陣列）", () => {
  for (const s of SERVICES) {
    if (s.action.type === "phone_call" || s.action.type === "1999agree") {
      assert.ok(Array.isArray(s.alt_channels), `${s.id} 要明確寫 alt_channels，給聽障者另一條路`);
    }
  }
});

test("getService 與 phoneOf", () => {
  assert.equal(getService("ltc-1966")?.title, "1966 長照");
  assert.equal(getService("nope"), undefined);
  assert.deepEqual(phoneOf(getService("ltc-1966")!), { type: "phone_call", target: "1966" });
  // 主要動作不是撥號、但備援是撥號
  assert.equal(phoneOf(getService("tpech-reg")!)?.target, "0221811995");
  assert.equal(phoneOf(getService("page-ride")!), null);
});
