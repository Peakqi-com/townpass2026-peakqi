import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { cancelReminder, getA11yState, openExternal, rootFontSizePercent, setReminder, speak, startListening } from "./elder.ts";

/** 模擬城市通 App 的 flutterObject：記錄網頁送出的訊息，並可以從 App 端回覆。 */
class FakeFlutterObject {
  sent: { name: string; data: unknown }[] = [];
  private listeners = new Set<(event: MessageEvent<string>) => void>();

  postMessage(message: string) {
    this.sent.push(JSON.parse(message));
  }
  addEventListener(_type: "message", listener: (event: MessageEvent<string>) => void) {
    this.listeners.add(listener);
  }
  removeEventListener(_type: "message", listener: (event: MessageEvent<string>) => void) {
    this.listeners.delete(listener);
  }
  reply(name: string, data: unknown) {
    const event = { data: JSON.stringify({ name, data }) } as MessageEvent<string>;
    for (const listener of [...this.listeners]) listener(event);
  }
  get listenerCount() {
    return this.listeners.size;
  }
}

let fo: FakeFlutterObject;
const g = globalThis as unknown as { window?: { flutterObject?: FakeFlutterObject } };

beforeEach(() => {
  fo = new FakeFlutterObject();
  g.window = { flutterObject: fo };
});
afterEach(() => {
  delete g.window;
});

function recorder() {
  const events: string[] = [];
  return {
    events,
    handlers: {
      onListening: () => events.push("listening"),
      onText: (text: string) => events.push(`text:${text}`),
      onError: (code: string) => events.push(`error:${code}`),
    },
  };
}

test("startListening：送出 start（預設 zh-TW），收到 listening 再收到文字", () => {
  const { events, handlers } = recorder();
  startListening(handlers);

  assert.deepEqual(fo.sent, [{ name: "listen", data: { action: "start", locale: "zh-TW" } }]);

  fo.reply("listen", { status: "listening" });
  fo.reply("listen", { text: "我要叫車" });

  assert.deepEqual(events, ["listening", "text:我要叫車"]);
});

test("startListening：收到文字後就停止監聽，之後的回覆不再觸發", () => {
  const { events, handlers } = recorder();
  startListening(handlers);

  fo.reply("listen", { text: "看醫生" });
  fo.reply("listen", { text: "第二次" });

  assert.deepEqual(events, ["text:看醫生"]);
  assert.equal(fo.listenerCount, 0);
});

test("startListening：App 回覆錯誤（例如不支援離線辨識）時呼叫 onError 並停止監聽", () => {
  const { events, handlers } = recorder();
  startListening(handlers);

  fo.reply("listen", { error: "offline_unavailable" });

  assert.deepEqual(events, ["error:offline_unavailable"]);
  assert.equal(fo.listenerCount, 0);
});

test("startListening：忽略其他 name 的訊息，以及 stop／cancel 的狀態回覆", () => {
  const { events, handlers } = recorder();
  startListening(handlers);

  fo.reply("speak", true);
  fo.reply("listen", { status: "stopped" });
  fo.reply("listen", { text: "叫車" });

  assert.deepEqual(events, ["text:叫車"]);
});

test("stop() 送出 stop 並繼續等最後的文字；cancel() 送出 cancel 並立即停止監聽", () => {
  const { events, handlers } = recorder();
  const session = startListening(handlers);

  session.stop();
  assert.deepEqual(fo.sent.at(-1), { name: "listen", data: { action: "stop" } });
  fo.reply("listen", { text: "放開後的結果" });
  assert.deepEqual(events, ["text:放開後的結果"]);

  const second = startListening(handlers);
  second.cancel();
  assert.deepEqual(fo.sent.at(-1), { name: "listen", data: { action: "cancel" } });
  assert.equal(fo.listenerCount, 0);
});

test("不在城市通 App 內時，立即回報 not_in_app（網頁改用打字）", () => {
  delete g.window;
  const { events, handlers } = recorder();

  const session = startListening(handlers);
  session.stop();
  session.cancel();

  assert.deepEqual(events, ["error:not_in_app"]);
});

test("getA11yState：回傳 App 的螢幕閱讀器狀態與字級", async () => {
  const pending = getA11yState();
  fo.reply("a11y_state", { screenReader: true, textScale: 1.5 });

  assert.deepEqual(await pending, { screenReader: true, textScale: 1.5 });
});

test("getA11yState：App 沒有這個 Handler（逾時）或不在 App 內時，回傳預設值", async () => {
  assert.deepEqual(await getA11yState(20), { screenReader: false, textScale: 1 });

  delete g.window;
  assert.deepEqual(await getA11yState(20), { screenReader: false, textScale: 1 });
});

test("speak：送出 { text, rate } 並回傳 App 的結果", async () => {
  const pending = speak("叫車", 0.4);
  assert.deepEqual(fo.sent, [{ name: "speak", data: { text: "叫車", rate: 0.4 } }]);
  fo.reply("speak", true);
  assert.equal(await pending, true);
});

test("openExternal：送出網址並回傳 App 是否成功開啟", async () => {
  const pending = openExternal("https://line.me/R/ti/p/@taipeicity1999");
  assert.deepEqual(fo.sent, [{ name: "open_external", data: "https://line.me/R/ti/p/@taipeicity1999" }]);
  fo.reply("open_external", false);
  assert.equal(await pending, false);
});

test("rootFontSizePercent：依系統字級設定根字級，限制在 100%～300%", () => {
  assert.equal(rootFontSizePercent(1), 100);
  assert.equal(rootFontSizePercent(1.35), 135);
  assert.equal(rootFontSizePercent(0.8), 100);
  assert.equal(rootFontSizePercent(5), 300);
  assert.equal(rootFontSizePercent(Number.NaN), 100);
});

test("setReminder：送出 set 與提醒內容，App 排好時回傳 scheduled", async () => {
  const reminder = { id: "double-ninth-2026", title: "重陽禮金明天截止", body: "可以線上申請匯款。", at: "2026-11-12T09:00:00+08:00" };
  const pending = setReminder(reminder);
  assert.deepEqual(fo.sent, [{ name: "reminder", data: { action: "set", ...reminder } }]);
  fo.reply("reminder", { status: "scheduled", at: "2026-11-12T01:00:00.000Z" });
  assert.deepEqual(await pending, { ok: true });
});

test("setReminder：App 回覆錯誤（例如沒有通知權限）時回傳錯誤代碼", async () => {
  const pending = setReminder({ id: "x", title: "t", body: "b", at: "2026-11-12T09:00:00+08:00" });
  fo.reply("reminder", { error: "permission_denied" });
  assert.deepEqual(await pending, { ok: false, error: "permission_denied" });
});

test("setReminder：不在城市通 App 內時回傳 not_in_app，不送出訊息", async () => {
  delete g.window;
  assert.deepEqual(await setReminder({ id: "x", title: "t", body: "b", at: "2026-11-12T09:00:00+08:00" }), { ok: false, error: "not_in_app" });
});

test("cancelReminder：送出 cancel", async () => {
  const pending = cancelReminder("double-ninth-2026");
  assert.deepEqual(fo.sent, [{ name: "reminder", data: { action: "cancel", id: "double-ninth-2026" } }]);
  fo.reply("reminder", { status: "cancelled" });
  assert.equal(await pending, true);
});
