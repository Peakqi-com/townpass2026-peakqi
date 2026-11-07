/**
 * 設定碼的 QR 內容：整段都用 Byte 模式。
 *
 * qrcode 套件預設會把字串切成最省空間的多段（例如電話 0912345678 會變成 Numeric 段）。
 * 但 iOS 的 mobile_scanner 7.4.2 用自己的解析器（BarcodePayloadParser.swift）讀 QR，
 * 只認得 Byte 段，遇到 Numeric／Alphanumeric 段就停，回傳已讀到的部分——
 * 設定碼在電話號碼前被截斷，變成不合法的 JSON（2026-11-07 iPhone 實機確認）。
 * 官方城市通 App 用同一個套件，所以在產生 QR 這一端處理。
 */
export function byteModeSegments(text: string): { data: Uint8ClampedArray; mode: "byte" }[] {
  return [{ data: new Uint8ClampedArray(new TextEncoder().encode(text)), mode: "byte" }];
}
