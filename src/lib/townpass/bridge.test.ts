import { test } from "node:test";
import assert from "node:assert/strict";
import { parseReply } from "./bridge.ts";

// App 回覆的解析。iOS 的 flutter_inappwebview 會吃掉反斜線（2026-11-07 iPhone 實機紀錄）。

test("parseReply：正常的 JSON 回覆", () => {
  assert.deepEqual(parseReply('{"name":"userinfo","data":{"realName":"王小明"}}'), { name: "userinfo", data: { realName: "王小明" } });
  assert.deepEqual(parseReply('{"name":"qr_code_scan","data":"{\\"kind\\":\\"elder-family\\"}"}'), {
    name: "qr_code_scan",
    data: '{"kind":"elder-family"}',
  });
});

test("parseReply：iOS 吃掉反斜線的掃碼回覆，仍拆得出設定碼", () => {
  const code = '{"kind":"elder-family","v":1,"contacts":[{"name":"大兒子","phone":"0912345678"}],"town":"士林區"}';
  // 實機收到的樣子：data 裡的引號沒有跳脫
  const raw = `{"name":"qr_code_scan","data":"${code}"}`;
  assert.throws(() => JSON.parse(raw));
  assert.deepEqual(parseReply(raw), { name: "qr_code_scan", data: code });
});

test("parseReply：看不懂的內容回傳 null", () => {
  assert.equal(parseReply("hello"), null);
  assert.equal(parseReply('{"data":1}'), null);
  assert.equal(parseReply(42), null);
});
