/**
 * 重陽禮金卡片的文字（首頁 M1 和我的權益 M6 共用）。
 * 重陽禮金幾乎每位長輩都知道、也大多領過，所以卡片寫給「還沒收到」的人。
 * 單獨放一個檔案：首頁只要這兩行字，不用載入整份補助資料。
 */
import type { GiftInfo } from "./profile.ts";

export const GIFT_TITLE = "還沒收到重陽禮金嗎？";

export function giftAmountLine(gift: GiftInfo): string {
  return `您今年可能可以領 ${gift.amount.toLocaleString("zh-TW")} 元。`;
}
