import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ageOn,
  build119Sms,
  buildInterpreterRequest,
  dateInputValue,
  daysFromToday,
  formatMobile,
  formatPosition,
  genderFromIdNo,
  leadTimeNotice,
  smsUri,
  weekdayZh,
} from "./messages.ts";

// M8 聽不清楚：簡訊範本、手語翻譯申請文字。範本依臺北市消防局〈聽語障人士 119 緊急報案服務宣導單〉。

const NOW = new Date(2026, 10, 7, 10, 30); // 2026-11-07（六）10:30，本地時間

test("ageOn：用生日（yyyy/MM/dd）算足歲，生日還沒到要少一歲", () => {
  assert.equal(ageOn("1950/03/10", NOW), 76);
  assert.equal(ageOn("1950/12/31", NOW), 75);
  assert.equal(ageOn("1950/11/07", NOW), 76, "生日當天算滿");
  assert.equal(ageOn("1988/12/12", NOW), 37);
  assert.equal(ageOn("", NOW), null);
  assert.equal(ageOn("不是日期", NOW), null);
});

test("genderFromIdNo：身分證第 2 碼 1 是男、2 是女，其他格式不猜", () => {
  assert.equal(genderFromIdNo("A123456789"), "男");
  assert.equal(genderFromIdNo("b223456789"), "女");
  assert.equal(genderFromIdNo("A823456789"), null, "新式居留證號不猜");
  assert.equal(genderFromIdNo(""), null);
});

test("formatPosition：經緯度取到小數 5 位（約 1 公尺）；不合理的值回 null", () => {
  assert.equal(formatPosition({ latitude: 25.0375, longitude: 121.5637 }), "北緯 25.03750，東經 121.56370");
  assert.equal(formatPosition({ latitude: Number.NaN, longitude: 121 }), null);
  assert.equal(formatPosition({ latitude: 95, longitude: 121 }), null);
  assert.equal(formatPosition(null), null);
});

test("formatMobile：手機號碼排成 0911-511-902；其他號碼原樣", () => {
  assert.equal(formatMobile("0911511902"), "0911-511-902");
  assert.equal(formatMobile("119"), "119");
});

test("119 簡訊：火災範本照消防局格式，帶入姓名、性別、年齡、地址與 GPS", () => {
  const text = build119Sms({
    kind: "fire",
    name: "金大森",
    gender: "男",
    age: 76,
    address: "臺北市中山區吉林路 69 號 4 樓",
    position: { latitude: 25.0375, longitude: 121.5637 },
  });
  assert.equal(
    text,
    "求救！我是金大森，男，76歲，發生火災了，在臺北市中山區吉林路 69 號 4 樓（GPS 北緯 25.03750，東經 121.56370）的地方，請救我！",
  );
});

test("119 簡訊：受傷、生病範本加上衣服特徵；沒填就省略", () => {
  assert.equal(
    build119Sms({ kind: "injury", name: "王小明", address: "捷運市政府站 2 號出口", clothing: "紅色外套" }),
    "求救！我是王小明，受傷了，在捷運市政府站 2 號出口的地方，身穿紅色外套，請救我！",
  );
  assert.equal(
    build119Sms({ kind: "sick", name: "王小明", age: 80, address: "家裡" }),
    "求救！我是王小明，80歲，生病了，在家裡的地方，請救我！",
  );
});

test("119 簡訊：只有 GPS 沒有地址時用 GPS；兩個都沒有時留下要填的空格", () => {
  assert.equal(
    build119Sms({ kind: "sick", position: { latitude: 25.0375, longitude: 121.5637 } }),
    "求救！生病了，在 GPS 北緯 25.03750，東經 121.56370 的地方，請救我！",
  );
  assert.match(build119Sms({ kind: "fire" }), /在（請填寫地址）的地方/);
});

test("119 簡訊：空白的姓名、地址、衣服不會留下多餘的逗號", () => {
  const text = build119Sms({ kind: "injury", name: "  ", address: " 家裡 ", clothing: " " });
  assert.equal(text, "求救！受傷了，在家裡的地方，請救我！");
});

test("110 簡訊：沿用 119 範本的格式，改成需要警察", () => {
  assert.equal(
    build119Sms({ kind: "police", name: "金大森", address: "家裡" }),
    "求救！我是金大森，需要警察協助，在家裡的地方，請幫我！",
  );
});

test("smsUri：只留數字，內文要編碼（Android、iOS 都能讀的 ?&body= 寫法）", () => {
  assert.equal(smsUri("0911-511-902", "求救！"), "sms:0911511902?&body=%E6%B1%82%E6%95%91%EF%BC%81");
  assert.equal(smsUri("0963047723", "a b&c"), "sms:0963047723?&body=a%20b%26c");
});

test("weekdayZh 與 daysFromToday：日期字串（YYYY-MM-DD）用本地時間計算", () => {
  assert.equal(weekdayZh("2026-11-07"), "星期六");
  assert.equal(weekdayZh("2026-11-12"), "星期四");
  assert.equal(weekdayZh("亂寫"), null);
  assert.equal(daysFromToday("2026-11-07", NOW), 0);
  assert.equal(daysFromToday("2026-11-10", NOW), 3);
  assert.equal(daysFromToday("2026-11-06", NOW), -1);
  assert.equal(daysFromToday("2026-12-01", NOW), 24);
  assert.equal(daysFromToday("", NOW), null);
});

test("leadTimeNotice：原則上 3 天前申請；不到 3 天提醒，但不擋（緊急案件不在此限）", () => {
  assert.equal(leadTimeNotice("2026-11-10", NOW), null);
  assert.match(leadTimeNotice("2026-11-08", NOW) ?? "", /不到 3 天/);
  assert.match(leadTimeNotice("2026-11-06", NOW) ?? "", /已經過了/);
  assert.match(leadTimeNotice("", NOW) ?? "", /請選日期/);
});

test("手語翻譯申請文字：帶入姓名、手機、日期（含星期）、時間、地點、事由", () => {
  const text = buildInterpreterRequest({
    service: "手語翻譯",
    name: "金大森",
    phone: "0932166777",
    date: "2026-11-12",
    time: "14:30",
    place: "臺北市立聯合醫院仁愛院區",
    purpose: "看診",
  });
  assert.equal(
    text,
    [
      "您好，我想申請手語翻譯服務。",
      "姓名：金大森",
      "聯絡手機：0932-166-777",
      "日期：2026-11-12（星期四）14:30",
      "地點：臺北市立聯合醫院仁愛院區",
      "事由：看診",
      "謝謝！",
    ].join("\n"),
  );
});

test("手語翻譯申請文字：沒填的欄位寫「（請填寫）」，提醒使用者補上", () => {
  const text = buildInterpreterRequest({ service: "同步聽打", date: "", place: " ", purpose: "" });
  assert.match(text, /^您好，我想申請同步聽打服務。/);
  assert.match(text, /姓名：（請填寫）/);
  assert.match(text, /日期：（請填寫）/);
  assert.match(text, /地點：（請填寫）/);
  assert.match(text, /事由：（請填寫）/);
  assert.doesNotMatch(text, /聯絡手機/, "沒有手機就不寫這一行");
});

test("dateInputValue：給 <input type=date> 的今天（YYYY-MM-DD，本地時間、補零）", () => {
  assert.equal(dateInputValue(NOW), "2026-11-07");
  assert.equal(dateInputValue(new Date(2027, 0, 3, 23, 59)), "2027-01-03");
});
