import { test } from "node:test";
import assert from "node:assert/strict";
import { homeEntry, modeEntry } from "./entry.ts";

test("homeEntry：還沒選模式 → 去選模式", () => {
  assert.equal(homeEntry({ mode: null, flag: null, historyLength: 1 }), "pick");
  assert.equal(homeEntry({ mode: null, flag: "done", historyLength: 3 }), "pick");
});

test("homeEntry：選過模式、剛打開服務（沒有上一頁）→ 墊一筆選模式頁，讓 App 出現返回鍵", () => {
  assert.equal(homeEntry({ mode: "normal", flag: null, historyLength: 1 }), "seed");
  assert.equal(homeEntry({ mode: "hearing", flag: null, historyLength: 1 }), "seed");
});

test("homeEntry：已經有上一頁就不墊。墊完一定會有上一頁，所以不會無限循環", () => {
  assert.equal(homeEntry({ mode: "vision", flag: null, historyLength: 2 }), "stay");
  assert.equal(homeEntry({ mode: "vision", flag: "done", historyLength: 2 }), "stay");
});

test("homeEntry：sessionStorage 留著上次的值（WebView 重開仍沿用）也照樣墊，不然返回鍵會消失", () => {
  assert.equal(homeEntry({ mode: "normal", flag: "done", historyLength: 1 }), "seed");
  assert.equal(homeEntry({ mode: "normal", flag: "forward", historyLength: 1 }), "seed");
});

test("homeEntry：sessionStorage 不能用（undefined）時不墊，寧可沒有返回鍵也不能卡在循環裡", () => {
  assert.equal(homeEntry({ mode: "normal", flag: undefined, historyLength: 1 }), "stay");
});

test("modeEntry：首頁剛墊好紀錄 → 直接回首頁，不顯示選模式畫面", () => {
  assert.equal(modeEntry({ mode: "normal", flag: "forward" }), "forward");
});

test("modeEntry：使用者自己按返回或點「換模式」→ 顯示選模式畫面", () => {
  assert.equal(modeEntry({ mode: "normal", flag: "done" }), "show");
  assert.equal(modeEntry({ mode: "normal", flag: null }), "show");
  assert.equal(modeEntry({ mode: "normal", flag: undefined }), "show");
});

test("modeEntry：還沒選模式時一定顯示選模式畫面", () => {
  assert.equal(modeEntry({ mode: null, flag: "forward" }), "show");
});
