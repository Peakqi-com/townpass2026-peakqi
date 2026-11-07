import { test } from "node:test";
import assert from "node:assert/strict";
import { HOME_BUTTONS } from "./home.ts";
import {
  FAMILY_LIMITS,
  checkContact,
  TAIPEI_TOWNS,
  checkFamilyConfig,
  decodeFamilyConfig,
  encodeFamilyConfig,
  familyButtons,
  formatMobile,
  normalizePhone,
  type FamilyConfig,
} from "./familyConfig.ts";

// M7 家人代設定：設定碼由家人的手機產生、長輩的手機掃描。
// 掃到的內容一律當成不可信（任何人都能做一張 QR 貼在公布欄），驗證不過就不存。

const GOOD: FamilyConfig = {
  v: 1,
  buttons: ["health", "ride", "family", "community"],
  contacts: [
    { name: "大兒子", phone: "0912345678" },
    { name: "女兒", phone: "0223456789" },
  ],
  town: "中山區",
};

/** 把設定改一個欄位後編成 JSON（模擬別人做的 QR） */
const tamper = (patch: Record<string, unknown>) => JSON.stringify({ kind: "elder-family", ...GOOD, ...patch });

test("編碼後再解碼，內容不變", () => {
  const text = encodeFamilyConfig(GOOD);
  assert.deepEqual(decodeFamilyConfig(text), GOOD);
});

test("編碼結果是有版本號與種類標記的 JSON", () => {
  const raw = JSON.parse(encodeFamilyConfig(GOOD));
  assert.equal(raw.kind, "elder-family");
  assert.equal(raw.v, 1);
});

test("最多 6 個按鈕、3 位聯絡人、名稱 10 個字時，設定碼仍然很短（QR 不會太密）", () => {
  const big: FamilyConfig = {
    v: 1,
    buttons: HOME_BUTTONS.map((b) => b.id),
    contacts: [1, 2, 3].map(() => ({ name: "一二三四五六七八九十", phone: "123456789012345" })),
    town: "大安區",
  };
  const text = encodeFamilyConfig(big);
  assert.ok(text.length <= FAMILY_LIMITS.maxInput, `長度 ${text.length}`);
  assert.deepEqual(decodeFamilyConfig(text), big);
});

test("不是長輩模式的設定碼：網址、亂碼、空字串、其他 JSON 一律回 null", () => {
  for (const bad of [
    "https://www.gov.taipei/",
    "",
    "{",
    "null",
    "[]",
    "123",
    '"elder-family"',
    JSON.stringify({ v: 1 }),
    JSON.stringify({ ...GOOD }), // 少了 kind
    tamper({ kind: "other" }),
  ]) {
    assert.equal(decodeFamilyConfig(bad), null, bad);
  }
});

test("不是字串（App 回傳 null 或其他型別）回 null", () => {
  for (const bad of [null, undefined, 123, {}, []]) {
    assert.equal(decodeFamilyConfig(bad), null);
  }
});

test("太長的內容不解析（避免被塞大量資料）", () => {
  const padded = tamper({ note: "x".repeat(FAMILY_LIMITS.maxInput) });
  assert.equal(decodeFamilyConfig(padded), null);
});

test("不支援的版本號回 null", () => {
  for (const v of [0, 2, "1", null]) assert.equal(decodeFamilyConfig(tamper({ v })), null, String(v));
});

test("按鈕：只能是首頁有的按鈕、4～6 個、不能重複、一定要有「打給家人」", () => {
  assert.equal(decodeFamilyConfig(tamper({ buttons: ["health", "ride", "family", "hack"] })), null, "不認識的 id");
  assert.equal(decodeFamilyConfig(tamper({ buttons: ["health", "ride", "family"] })), null, "少於 4 個");
  assert.equal(
    decodeFamilyConfig(tamper({ buttons: [...HOME_BUTTONS.map((b) => b.id), "health"] })),
    null,
    "多於 6 個",
  );
  assert.equal(decodeFamilyConfig(tamper({ buttons: ["health", "health", "ride", "family"] })), null, "重複");
  assert.equal(decodeFamilyConfig(tamper({ buttons: ["health", "ride", "benefits", "text"] })), null, "沒有打給家人");
  assert.equal(decodeFamilyConfig(tamper({ buttons: "health" })), null, "不是陣列");
  assert.equal(decodeFamilyConfig(tamper({ buttons: ["health", "ride", "family", 1] })), null, "不是字串");
});

test("聯絡人：1～3 位", () => {
  assert.equal(decodeFamilyConfig(tamper({ contacts: [] })), null, "0 位");
  const four = [1, 2, 3, 4].map(() => ({ name: "兒子", phone: "0912345678" }));
  assert.equal(decodeFamilyConfig(tamper({ contacts: four })), null, "4 位");
  assert.equal(decodeFamilyConfig(tamper({ contacts: "0912345678" })), null, "不是陣列");
});

test("電話：只能是 3～15 位數字", () => {
  for (const phone of ["12", "1234567890123456", "0912-345-678", "+886912345678", "tel:110", "０９１２３４５６７８", "", 912345678]) {
    assert.equal(decodeFamilyConfig(tamper({ contacts: [{ name: "兒子", phone }] })), null, String(phone));
  }
  for (const phone of ["110", "123456789012345"]) {
    assert.ok(decodeFamilyConfig(tamper({ contacts: [{ name: "兒子", phone }] })), phone);
  }
});

test("名稱：1～10 個字，不能有控制字元或隱藏的方向字元", () => {
  for (const name of ["", "   ", "一二三四五六七八九十一", "兒\n子", "兒子‮", "\u0000", 1, null]) {
    assert.equal(decodeFamilyConfig(tamper({ contacts: [{ name, phone: "0912345678" }] })), null, JSON.stringify(name));
  }
  assert.equal(
    decodeFamilyConfig(tamper({ contacts: [{ name: "一二三四五六七八九十", phone: "0912345678" }] }))?.contacts[0].name,
    "一二三四五六七八九十",
  );
});

test("名稱前後的空白會去掉", () => {
  const config = decodeFamilyConfig(tamper({ contacts: [{ name: "  女兒 ", phone: "0912345678" }] }));
  assert.equal(config?.contacts[0].name, "女兒");
});

test("行政區：只能是臺北市 12 區之一", () => {
  assert.equal(TAIPEI_TOWNS.length, 12);
  for (const town of ["板橋區", "中山", "台北市中山區", "", null]) {
    assert.equal(decodeFamilyConfig(tamper({ town })), null, String(town));
  }
  for (const town of TAIPEI_TOWNS) assert.ok(decodeFamilyConfig(tamper({ town })), town);
});

test("多出來的欄位會被丟掉，不會存下來", () => {
  const config = decodeFamilyConfig(tamper({ script: "<img onerror=alert(1)>" }));
  assert.ok(config);
  assert.equal("script" in config, false);
  const contact = decodeFamilyConfig(tamper({ contacts: [{ name: "兒子", phone: "0912345678", href: "javascript:1" }] }))
    ?.contacts[0];
  assert.deepEqual(contact, { name: "兒子", phone: "0912345678" });
});

test("checkFamilyConfig：失敗時回傳給家人看的中文原因", () => {
  const result = checkFamilyConfig({ ...GOOD, contacts: [] });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /聯絡人/);
  const noTown = checkFamilyConfig({ ...GOOD, town: "" });
  assert.equal(noTown.ok, false);
  if (!noTown.ok) assert.match(noTown.reason, /行政區/);
});

test("checkContact：家人的表單逐列檢查，原因接在「第 N 位聯絡人」後面", () => {
  assert.deepEqual(checkContact({ name: " 兒子 ", phone: "0912345678" }), {
    ok: true,
    contact: { name: "兒子", phone: "0912345678" },
  });
  const noName = checkContact({ name: "", phone: "0912345678" });
  assert.equal(noName.ok, false);
  if (!noName.ok) assert.equal(noName.reason, "要填稱呼");
  const badPhone = checkContact({ name: "兒子", phone: "12" });
  assert.equal(badPhone.ok, false);
  if (!badPhone.ok) assert.match(badPhone.reason, /電話/);
});

test("normalizePhone：家人輸入時去掉空白、橫線、括號，全形數字轉半形", () => {
  assert.equal(normalizePhone("0912-345-678"), "0912345678");
  assert.equal(normalizePhone("(02) 2345 6789"), "0223456789");
  assert.equal(normalizePhone("０９１２３４５６７８"), "0912345678");
  assert.equal(normalizePhone(" 0912 345 678 "), "0912345678");
});

test("formatMobile：手機號碼分段顯示，其他號碼照舊", () => {
  assert.equal(formatMobile("0912345678"), "0912 345 678");
  assert.equal(formatMobile("0223456789"), "(02)2345-6789");
  assert.equal(formatMobile("110"), "110");
});

test("familyButtons：有家人設定時照家人挑的順序，沒有時用預設 6 個", () => {
  assert.deepEqual(
    familyButtons(GOOD).map((b) => b.id),
    ["health", "ride", "family", "community"],
  );
  assert.equal(familyButtons(null), HOME_BUTTONS);
});
