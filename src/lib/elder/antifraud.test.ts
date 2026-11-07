import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_MATCHES, MONEY, SCAMS, STEPS, judge, matchScams, resultFor, type AntifraudResult } from "./antifraud.ts";

// M11 防詐先問一下：比對規則與資料驗證。
// 最重要的規則：不管比對到什麼，都不能說「這不是詐騙」或「安全」，避免長輩以為可以放心。

const FORBIDDEN = ["不是詐騙", "安全", "放心", "沒問題"];

function allText(r: AntifraudResult): string {
  return [r.headline, ...r.lines, r.speech].join("\n");
}

function assertNeverReassuring(r: AntifraudResult, label: string) {
  const text = allText(r);
  for (const word of FORBIDDEN) assert.ok(!text.includes(word), `${label} 的結果出現「${word}」：${text}`);
}

test("資料：每種手法都有 id、名稱、按鈕文字、關鍵字、官方提醒，id 不重複", () => {
  assert.ok(SCAMS.length >= 5);
  assert.equal(new Set(SCAMS.map((s) => s.id)).size, SCAMS.length);
  for (const s of SCAMS) {
    assert.ok(s.name.endsWith("詐騙"), `${s.id} 的名稱要以「詐騙」結尾，才能說「這很像〇〇詐騙」`);
    assert.ok(s.choice.length > 0 && s.choice.length <= 16, `${s.id} 的按鈕文字要 1～16 個字`);
    assert.ok(s.keywords.length > 0, `${s.id} 缺關鍵字`);
    assert.ok(s.warning.length > 0, `${s.id} 缺官方提醒`);
  }
});

test("資料：每一筆（手法、下一步、提到錢的字）都有官方來源（165 全民防騙網 https）與查證日期", () => {
  const entries = [...SCAMS, ...STEPS, MONEY];
  for (const e of entries) {
    assert.match(e.source, /^https:\/\/165\.npa\.gov\.tw\//, `${JSON.stringify(e).slice(0, 40)} 的 source 要是 165 全民防騙網`);
    assert.match(e.verified, /^\d{4}-\d{2}-\d{2}$/, `${e.source} 的 verified`);
  }
});

test("資料：資料檔裡的文字都不說「不是詐騙」「安全」", () => {
  for (const s of SCAMS) for (const w of FORBIDDEN) assert.ok(!(s.warning + s.name + s.choice).includes(w), `${s.id} 出現「${w}」`);
  for (const s of STEPS) for (const w of FORBIDDEN) assert.ok(!s.text.includes(w), `${s.id} 出現「${w}」`);
});

test("每種說法都比對得到：按鈕上的文字 → 第一個就是那種手法", () => {
  for (const s of SCAMS) assert.equal(matchScams(s.choice)[0]?.id, s.id, `「${s.choice}」`);
});

test("每種說法都比對得到：每一個關鍵字單獨出現時，結果包含那種手法", () => {
  for (const s of SCAMS) {
    for (const k of s.keywords) {
      const ids = matchScams(k).map((m) => m.id);
      assert.ok(ids.includes(s.id), `關鍵字「${k}」應該比對到 ${s.id}，實際是 ${ids.join("、") || "沒有"}`);
    }
  }
});

test("長輩的說法：句子裡夾著關鍵字也比對得到（全形、標點、空白不影響）", () => {
  assert.equal(matchScams("有個檢察官打來，說我的帳戶涉及洗錢")[0]?.id, "impersonation");
  assert.equal(matchScams("客服說我的分期付款設錯了，要我去ＡＴＭ")[0]?.id, "installment");
  assert.equal(matchScams("LINE 說我抽中 iPhone，要先認證帳戶")[0]?.id, "prize");
  assert.equal(matchScams("朋友介紹的老師說穩賺不賠")[0]?.id, "investment");
  assert.equal(matchScams("打來叫我猜猜我是誰，說急著借錢")[0]?.id, "relative");
  assert.equal(matchScams("對方要我把簡訊驗證碼念給他")[0]?.id, "credentials");
});

test("警察要提款卡：同時像兩種時，以假檢警為主，最多列出兩種", () => {
  const ids = matchScams("警察說要監管我的提款卡").map((s) => s.id);
  assert.equal(ids[0], "impersonation");
  assert.ok(ids.length <= MAX_MATCHES);
});

test("語音辨識聽錯一個字時，長的關鍵字仍然比對得到（穩賺不陪→穩賺不賠）", () => {
  assert.equal(matchScams("他說穩賺不陪")[0]?.id, "investment");
});

test("比對到時：說「這很像〇〇詐騙」＋官方提醒，下一步提醒掛電話", () => {
  const r = judge("有個檢察官說要監管帳戶");
  assert.equal(r.kind, "match");
  assert.equal(r.headline, "這很像假檢警詐騙");
  assert.ok(r.lines.includes(SCAMS.find((s) => s.id === "impersonation")!.warning));
  assert.ok(r.speech.startsWith("這很像假檢警詐騙"));
  assert.match(r.speech, /掛/);
  assertNeverReassuring(r, "假檢警");
});

test("resultFor：點按鈕直接得到那種手法的結果；不認得的 id 當作不確定", () => {
  for (const s of SCAMS) {
    const r = resultFor(s.id);
    assert.equal(r.kind, "match");
    assert.equal(r.headline, `這很像${s.name}`);
    assert.deepEqual(r.scams.map((x) => x.id), [s.id]);
    assertNeverReassuring(r, s.id);
  }
  assert.equal(resultFor("nope").kind, "unsure");
});

test("沒比對到時：說「我們不確定」，提醒要錢、要帳號密碼就先停下來；絕不說「不是詐騙」「安全」", () => {
  for (const q of ["今天天氣很好", "asdf", "我想吃飯", "   ", ""]) {
    const r = judge(q);
    assert.equal(r.kind, "unsure", q);
    assert.deepEqual(r.scams, []);
    assert.match(r.headline, /不確定/);
    assert.ok(allText(r).includes("要錢"), "要提醒「要錢」");
    assert.ok(allText(r).includes("帳號密碼"), "要提醒「帳號密碼」");
    assert.match(r.speech, /停下來/);
    assertNeverReassuring(r, `「${q}」`);
  }
});

test("沒比對到手法但提到錢：一樣不確定，但特別提醒不要轉帳", () => {
  const r = judge("對方叫我先匯款過去");
  assert.equal(r.kind, "unsure");
  assert.equal(r.mentionsMoney, true);
  assert.match(r.speech, /不要轉帳/);
  assertNeverReassuring(r, "提到錢");
  assert.equal(judge("今天天氣很好").mentionsMoney, false);
});

test("所有手法、所有比對結果都不會出現讓人放心的字", () => {
  for (const s of SCAMS) {
    assertNeverReassuring(judge(s.choice), s.choice);
    for (const k of s.keywords) assertNeverReassuring(judge(k), k);
  }
});
