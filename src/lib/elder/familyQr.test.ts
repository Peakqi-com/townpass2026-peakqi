import { test } from "node:test";
import assert from "node:assert/strict";
import { create } from "qrcode";
import { encodeFamilyConfig } from "./familyConfig.ts";
import { byteModeSegments } from "./familyQr.ts";

// iOS 的 mobile_scanner 只讀得到 Byte 段：設定碼的 QR 必須只有一段 Byte。

const text = encodeFamilyConfig({
  v: 1,
  buttons: ["health", "ride", "family", "community"],
  contacts: [{ name: "兒子", phone: "0912345678" }],
  town: "士林區",
  buses: [{ city: "tpe", routeId: 15314, stopId: 12788, label: "203 往天母・天母國中", lat: 25.11807, lng: 121.53707 }],
});

test("qrcode 預設會把電話切成 Numeric 段（iOS 會在這裡截斷）", () => {
  const modes = create(text, { errorCorrectionLevel: "M" }).segments.map((s) => s.mode.id);
  assert.ok(modes.includes("Numeric"), modes.join(","));
});

test("byteModeSegments：整段一個 Byte 段，內容是 UTF-8 原文", () => {
  const qr = create(byteModeSegments(text), { errorCorrectionLevel: "M" });
  assert.deepEqual(
    qr.segments.map((s) => s.mode.id),
    ["Byte"],
  );
  assert.equal(new TextDecoder().decode(new Uint8Array(byteModeSegments(text)[0].data)), text);
});
