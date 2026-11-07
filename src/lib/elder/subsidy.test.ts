import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AGE_BRACKETS,
  callScript,
  callTargetFor,
  callTargets,
  districtFor,
  findSubsidies,
  hasPhoneChannel,
  nativeMatters,
  otherSubject,
  personForOther,
  prepSheet,
  selfSubject,
  SUBSIDIES,
  DISTRICTS,
  RELATED,
  townOf,
  type SubsidyAnswers,
  type SubsidyPerson,
} from "./subsidy.ts";
import { getService } from "./services.ts";

// M12 補助小幫手：資格規則（純函式）。答案只在手機的記憶體裡，不上傳。
const TODAY = new Date("2026-11-07T04:00:00Z");

const elder: SubsidyPerson = { age: 86, nativePeople: false, citizen: true };
const young: SubsidyPerson = { age: 37, nativePeople: false, citizen: true };
const none: SubsidyAnswers = { disability: "no", income: "certified", care: "no" };

const applyIds = (p: SubsidyPerson, a: SubsidyAnswers, d = TODAY) => findSubsidies(p, a, d).apply.map((m) => m.subsidy.id);
const autoIds = (p: SubsidyPerson, a: SubsidyAnswers, d = TODAY) => findSubsidies(p, a, d).auto.map((m) => m.subsidy.id);

/* ---------- 資料檢查 ---------- */

test("資料：id 不重複、只用 https 官方來源、有查證日期與主責機關", () => {
  const ids = SUBSIDIES.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const s of SUBSIDIES) {
    assert.match(s.id, /^[a-z0-9-]+$/, `${s.id} 的 id 要能放進網址`);
    assert.match(s.source, /^https:\/\//, `${s.id} 的 source`);
    assert.match(s.verified, /^\d{4}-\d{2}-\d{2}$/, `${s.id} 的 verified`);
    assert.ok(s.owner && s.title && s.summary && s.amount, `${s.id} 缺欄位`);
    if (s.apply.online) assert.match(s.apply.online.url, /^https:\/\//);
    if (s.apply.phone) assert.match(s.apply.phone.number, /^\d{3,12}$/);
  }
});

test("資料：引用的服務（1966、1957）和相關服務都存在於 services.json", () => {
  for (const s of SUBSIDIES) {
    if (s.apply.service) assert.ok(getService(s.apply.service), `${s.id} 引用的 ${s.apply.service}`);
  }
  for (const ids of Object.values(RELATED)) for (const id of ids) assert.ok(getService(id), id);
  for (const s of SUBSIDIES) for (const other of s.exclusiveWith ?? []) assert.ok(SUBSIDIES.some((x) => x.id === other));
});

test("資料：12 區社會課都有電話（數字）與地址", () => {
  assert.equal(DISTRICTS.length, 12);
  for (const d of DISTRICTS) {
    assert.match(d.phone, /^02\d{8}$/, d.name);
    assert.ok(d.address.startsWith(`臺北市${d.name}`), d.name);
  }
});

test("資料：要申請的補助都至少有一個申請管道", () => {
  for (const s of SUBSIDIES) {
    if (s.rule.autoGranted) continue;
    const a = s.apply;
    assert.ok(a.counter || a.call1999 || a.service || a.phone || a.online, `${s.id} 沒有申請管道`);
  }
});

/* ---------- 年齡與原住民身分（從 userinfo 帶入） ---------- */

test("65 歲以上：列出老人生活津貼；未滿 65 不列", () => {
  assert.ok(applyIds(elder, none).includes("elder-allowance"));
  assert.ok(!applyIds(young, none).includes("elder-allowance"));
});

test("老人健保費補助：原住民門檻降到 55 歲；一般人要 65 歲", () => {
  const native56: SubsidyPerson = { age: 56, nativePeople: true, citizen: true };
  const general56: SubsidyPerson = { age: 56, nativePeople: false, citizen: true };
  assert.ok(autoIds(native56, none).includes("elder-nhi-premium"));
  assert.ok(!autoIds(general56, none).includes("elder-nhi-premium"));
});

test("讀不到年齡：年齡門檻的補助先不列，並提示", () => {
  const r = findSubsidies({ age: null, nativePeople: false, citizen: true }, none, TODAY);
  assert.ok(!r.apply.some((m) => m.subsidy.id === "elder-allowance"));
  assert.ok(r.hints.includes("age"));
});

test("不是臺北市民：臺北市的補助不列，並提示", () => {
  const r = findSubsidies({ age: 86, nativePeople: false, citizen: false }, { ...none, care: "yes" }, TODAY);
  assert.ok(!r.apply.some((m) => m.subsidy.id === "elder-allowance"));
  assert.ok(r.apply.some((m) => m.subsidy.id === "ltc-care"), "長照是全國的，仍然列出");
  assert.ok(r.hints.includes("notCitizen"));
});

/* ---------- 收入 ---------- */

test("收入答「不知道」：仍列出主要津貼，並標「要看家裡收入」", () => {
  const r = findSubsidies(elder, { disability: "no", income: "unknown", care: "no" }, TODAY);
  const allowance = r.apply.find((m) => m.subsidy.id === "elder-allowance");
  assert.ok(allowance, "老人生活津貼要列出");
  assert.ok(allowance.caveats.includes("要看家裡收入"));
  assert.ok(r.apply.some((m) => m.subsidy.id === "low-income-status"), "也列出申請低收、中低收");
});

test("沒有證明但收入不高：同樣標「要看家裡收入」", () => {
  const r = findSubsidies(elder, { disability: "no", income: "notCertified", care: "no" }, TODAY);
  assert.ok(r.apply.find((m) => m.subsidy.id === "elder-allowance")?.caveats.includes("要看家裡收入"));
});

test("已有低收或中低收證明：不再列「申請低收入戶」，津貼不加註收入", () => {
  const r = findSubsidies(elder, none, TODAY);
  assert.ok(!r.apply.some((m) => m.subsidy.id === "low-income-status"));
  assert.deepEqual(r.apply.find((m) => m.subsidy.id === "elder-allowance")?.caveats, []);
});

test("衛福部加發生活補助：有證明的人自動入帳；只到 116 年 1 月", () => {
  assert.ok(autoIds(young, none).includes("mohw-extra-2026"));
  assert.ok(!autoIds(young, { ...none, income: "unknown" }).includes("mohw-extra-2026"));
  assert.ok(!autoIds(young, none, new Date("2027-02-01T04:00:00Z")).includes("mohw-extra-2026"));
});

/* ---------- 身心障礙 ---------- */

test("有身障證明：列出身障生活補助、愛心卡、輔具；健保費放在「不用申請」", () => {
  const ids = applyIds(young, { disability: "other", income: "notCertified", care: "no" });
  for (const id of ["disability-living", "love-card", "disability-assistive", "disability-parking", "vehicle-tax"]) {
    assert.ok(ids.includes(id), id);
  }
  assert.ok(autoIds(young, { disability: "other", income: "notCertified", care: "no" }).includes("disability-insurance"));
});

test("沒有身障證明：不列身障的補助", () => {
  const ids = applyIds(elder, { disability: "no", income: "unknown", care: "no" });
  assert.ok(!ids.some((id) => ["disability-living", "love-card", "disability-assistive"].includes(id)));
});

test("身障證明答「不知道」：不列身障補助，改用提示說明", () => {
  const r = findSubsidies(elder, { disability: "unknown", income: "unknown", care: "no" }, TODAY);
  assert.ok(!r.apply.some((m) => m.subsidy.rule.disability));
  assert.ok(r.hints.includes("disability"));
});

test("身障生活補助：已列冊低收、中低收由社會局主動核發，放在「不用申請」", () => {
  const r = findSubsidies(young, { disability: "other", income: "certified", care: "no" }, TODAY);
  assert.ok(r.auto.some((m) => m.subsidy.id === "disability-living"));
  assert.ok(!r.apply.some((m) => m.subsidy.id === "disability-living"));
});

test("老人生活津貼和身障生活補助同時出現時，兩張都提醒只能擇優領一項", () => {
  const r = findSubsidies(elder, { disability: "other", income: "unknown", care: "no" }, TODAY);
  const a = r.apply.find((m) => m.subsidy.id === "elder-allowance");
  const b = r.apply.find((m) => m.subsidy.id === "disability-living");
  assert.ok(a?.caveats.some((c) => c.includes("身障生活補助")));
  assert.ok(b?.caveats.some((c) => c.includes("老人生活津貼")));
});

test("看不清楚、聽不清楚：輔具補助排在身障補助的前面，並帶出相關服務", () => {
  const vision = findSubsidies(young, { disability: "vision", income: "certified", care: "no" }, TODAY);
  const ids = vision.apply.map((m) => m.subsidy.id);
  assert.ok(ids.indexOf("disability-assistive") < ids.indexOf("love-card"));
  assert.deepEqual(vision.related, ["vision-rehab", "blind-library"]);
  const hearing = findSubsidies(young, { disability: "hearing", income: "certified", care: "no" }, TODAY);
  assert.deepEqual(hearing.related, ["sign-language", "vrs"]);
});

/* ---------- 照顧 ---------- */

test("家裡有人需要照顧：列出長照、喘息、輔具（不看使用者本人的年齡）", () => {
  const ids = applyIds(young, { disability: "no", income: "unknown", care: "yes" });
  for (const id of ["ltc-care", "ltc-respite", "ltc-assistive-home"]) assert.ok(ids.includes(id), id);
  assert.ok(findSubsidies(young, { disability: "no", income: "unknown", care: "yes" }, TODAY).related.includes("ltc-ride"));
});

test("照顧答「不需要」不列長照；答「不知道」改用提示", () => {
  assert.ok(!applyIds(elder, none).includes("ltc-care"));
  const r = findSubsidies(elder, { ...none, care: "unknown" }, TODAY);
  assert.ok(!r.apply.some((m) => m.subsidy.id === "ltc-care"));
  assert.ok(r.hints.includes("care"));
});

test("排序：沒有附註的排前面（比較可能可以申請）", () => {
  const r = findSubsidies(elder, { disability: "no", income: "unknown", care: "yes" }, TODAY);
  const counts = r.apply.map((m) => m.caveats.length);
  assert.deepEqual(counts, [...counts].sort((a, b) => a - b));
});

test("排序：「只能選一項領」的提醒不影響排序，兩項主要津貼排在同樣要看收入的項目前面", () => {
  const ids = applyIds(elder, { disability: "other", income: "unknown", care: "no" });
  assert.ok(ids.indexOf("elder-allowance") < ids.indexOf("low-income-status"));
  assert.ok(ids.indexOf("disability-living") < ids.indexOf("low-income-status"));
});

/* ---------- 行政區與電話 ---------- */

test("districtFor：依 userinfo 的行政區找社會課；找不到回 null", () => {
  assert.equal(districtFor("中山區")?.phone, "0225031369");
  assert.equal(districtFor("台北市中山區")?.name, "中山區", "容許前面帶城市");
  assert.equal(districtFor("板橋區"), null);
  assert.equal(districtFor(undefined), null);
});

test("callTargets：12 區社會課與補助的專線都可以撥，並附文字管道", () => {
  const targets = callTargets();
  assert.ok(targets.some((t) => t.id === "district-zhongshan"));
  assert.ok(targets.some((t) => t.id === "vehicle-tax"));
  const zs = callTargetFor("district-zhongshan");
  assert.ok(zs);
  assert.equal(zs.action.type, "phone_call");
  assert.ok(zs.confirm, "撥號前要確認");
  assert.ok(zs.description.includes("524～530"), "分機要寫出來");
  assert.ok((zs.alt_channels ?? []).some((a) => a.type === "page" && a.target === "/text"), "旁邊要有文字管道");
  assert.equal(callTargetFor("nope"), undefined);
});

/* ---------- 申請準備單 ---------- */

test("prepSheet：要帶什麼、代辦、去哪裡、注意事項、審核提醒與出處", () => {
  const r = findSubsidies(elder, { disability: "no", income: "unknown", care: "no" }, TODAY);
  const m = r.apply.find((x) => x.subsidy.id === "elder-allowance")!;
  const text = prepSheet(m, districtFor("中山區"));
  assert.ok(text.includes("老人生活津貼"));
  assert.ok(text.includes("□ 身分證正本"));
  assert.ok(text.includes("代申請人"));
  assert.ok(text.includes("中山區公所社會課"));
  assert.ok(text.includes("臺北市中山區松江路 367 號 1 樓"));
  assert.ok(text.includes("(02)2503-1369 轉 524～530"));
  assert.ok(text.includes("1999"));
  assert.ok(text.includes("要看家裡收入"));
  assert.ok(text.includes("最後由社會局審核"));
  assert.ok(text.includes("https://dosw.gov.taipei/"));
  assert.ok(!text.includes("符合資格"), "不說「符合」");
});

test("prepSheet：不知道行政區時，寫「戶籍所在地的區公所社會課」", () => {
  const m = findSubsidies(elder, none, TODAY).apply.find((x) => x.subsidy.id === "elder-allowance")!;
  assert.ok(prepSheet(m, null).includes("戶籍所在地的區公所社會課"));
});

test("townOf：優先用標記為主要的地址，沒有就用第一筆", () => {
  const a = { town: "大安區", priority: false };
  const b = { town: "中山區", priority: true };
  assert.equal(townOf([a, b]), "中山區");
  assert.equal(townOf([a]), "大安區");
  assert.equal(townOf([]), null);
  assert.equal(townOf(undefined), null);
});

/* ---------- 假牙補助（taipei-subsidies.md A.12，2026-11-07 查證） ---------- */

test("假牙補助：55 歲以上列出，未滿 55 不列；不是臺北市民不列", () => {
  const age55: SubsidyPerson = { age: 55, nativePeople: false, citizen: true };
  const age54: SubsidyPerson = { age: 54, nativePeople: false, citizen: true };
  assert.ok(applyIds(age55, none).includes("denture"));
  assert.ok(!applyIds(age54, none).includes("denture"));
  assert.ok(!applyIds({ ...elder, citizen: false }, none).includes("denture"));
});

test("假牙補助：沒有低收、中低收證明時標「要看家裡收入」；申請管道是 1999 轉 1576，不是區公所", () => {
  const noCert = findSubsidies(elder, { ...none, income: "notCertified" }, TODAY).apply.find((m) => m.subsidy.id === "denture");
  assert.ok(noCert && noCert.caveats.length > 0);
  const denture = SUBSIDIES.find((s) => s.id === "denture")!;
  assert.equal(denture.apply.call1999, "1576");
  assert.equal(denture.apply.counter, undefined);
  assert.equal(denture.proxy.allowed, null, "官方沒寫代辦規定");
});

/* ---------- 幫誰看：幫另一半或家人看（年紀用選的級距） ---------- */

test("年紀級距：由資料裡的年齡門檻產生（未滿 55／55～64／65 以上）", () => {
  assert.deepEqual(
    AGE_BRACKETS.map((b) => b.label),
    ["未滿 55 歲", "55～64 歲", "65 歲以上"],
  );
  // 每一個年齡門檻都剛好是某個級距的下限，級距內不會跨過門檻
  for (const s of SUBSIDIES) {
    for (const min of [s.rule.ageMin, s.rule.ageMinNative]) {
      if (min !== undefined) assert.ok(AGE_BRACKETS.some((b) => b.min === min), `${s.id} 的門檻 ${min}`);
    }
  }
});

test("級距判斷和實際年齡一致：級距內任何一個歲數，列出的補助都一樣", () => {
  const answers: SubsidyAnswers = { disability: "no", income: "unknown", care: "no" };
  for (const b of AGE_BRACKETS) {
    for (const native of ["yes", "no"] as const) {
      const byBracket = findSubsidies(personForOther({ age: b.id, native }, true), answers, TODAY);
      const ids = (r: typeof byBracket) => [...r.apply, ...r.auto].map((m) => m.subsidy.id).sort();
      for (let age = Math.max(b.min, 40); age < (b.max ?? 100); age++) {
        const exact = findSubsidies({ age, nativePeople: native === "yes", citizen: true }, answers, TODAY);
        assert.deepEqual(ids(byBracket), ids(exact), `${b.label}、${age} 歲、原住民：${native}`);
      }
    }
  }
});

test("幫家人看：65 歲以上列出老人生活津貼；未滿 55 不列；行政區、市民身分沿用使用者的（同一戶）", () => {
  const answers: SubsidyAnswers = { disability: "no", income: "unknown", care: "no" };
  const senior = personForOther({ age: "65-up", native: "no" }, true);
  assert.equal(senior.citizen, true);
  assert.ok(applyIds(senior, answers).includes("elder-allowance"));
  assert.ok(autoIds(senior, answers).includes("elder-nhi-premium"));
  const youngOther = personForOther({ age: "under-55", native: "no" }, true);
  assert.ok(!applyIds(youngOther, answers).includes("elder-allowance"));
  assert.ok(!applyIds(youngOther, answers).includes("denture"));
  assert.equal(personForOther({ age: "65-up", native: "no" }, false).citizen, false);
});

test("幫家人看：年紀「不知道」時，年齡門檻的補助先不列，並提示", () => {
  const p = personForOther({ age: "unknown", native: "unknown" }, true);
  assert.equal(p.age, null);
  const r = findSubsidies(p, none, TODAY);
  assert.ok(!r.apply.some((m) => m.subsidy.id === "elder-allowance"));
  assert.ok(r.hints.includes("age"));
  assert.ok(!r.hints.includes("native"), "年紀不知道時，問原住民也沒用");
});

test("原住民題只在會影響結果的級距問（55～64 歲）", () => {
  assert.equal(nativeMatters("under-55"), false);
  assert.equal(nativeMatters("55-64"), true);
  assert.equal(nativeMatters("65-up"), false);
  assert.equal(nativeMatters("unknown"), false);
});

test("幫家人看、55～64 歲：原住民列出老人健保費補助；不是不列；不知道時提示可能多哪幾項", () => {
  assert.ok(autoIds(personForOther({ age: "55-64", native: "yes" }, true), none).includes("elder-nhi-premium"));
  assert.ok(!autoIds(personForOther({ age: "55-64", native: "no" }, true), none).includes("elder-nhi-premium"));
  const r = findSubsidies(personForOther({ age: "55-64", native: "unknown" }, true), none, TODAY);
  assert.ok(!r.auto.some((m) => m.subsidy.id === "elder-nhi-premium"), "不確定時先不列");
  assert.ok(r.hints.includes("native"));
  assert.ok(r.nativeExtra.includes("老人健保費補助"));
});

test("幫自己看：不會出現原住民提示（台北通帶入）", () => {
  const r = findSubsidies({ age: 60, nativePeople: false, citizen: true }, none, TODAY);
  assert.ok(!r.hints.includes("native"));
  assert.deepEqual(r.nativeExtra, []);
});

/* ---------- 打電話時的第一句話 ---------- */

const allowance = SUBSIDIES.find((s) => s.id === "elder-allowance")!;
const ltc = SUBSIDIES.find((s) => s.id === "ltc-care")!;
const zhongshan = districtFor("中山區");

test("callScript：幫自己問，帶出補助名稱、行政區、年紀", () => {
  assert.equal(
    callScript(allowance, selfSubject(72), zhongshan),
    "您好，我想問「老人生活津貼」怎麼申請。我住在中山區，今年 72 歲。",
  );
});

test("callScript：幫家人問，用「我家人」，年紀用級距", () => {
  assert.equal(
    callScript(allowance, otherSubject("65-up"), zhongshan),
    "您好，我想幫我家人問「老人生活津貼」怎麼申請。我家人住在中山區，今年 65 歲以上。",
  );
  assert.equal(
    callScript(allowance, otherSubject("under-55"), zhongshan),
    "您好，我想幫我家人問「老人生活津貼」怎麼申請。我家人住在中山區，今年未滿 55 歲。",
  );
});

test("callScript：不知道年紀或行政區時就不說", () => {
  assert.equal(callScript(ltc, selfSubject(null), null), "您好，我想問「長照服務」怎麼申請。");
  assert.equal(
    callScript(ltc, otherSubject("unknown"), zhongshan),
    "您好，我想幫我家人問「長照服務」怎麼申請。我家人住在中山區。",
  );
  assert.equal(callScript(ltc, selfSubject(80), null), "您好，我想問「長照服務」怎麼申請。我今年 80 歲。");
});

test("hasPhoneChannel：要申請的補助都有電話可以問；只有線上申請的沒有", () => {
  for (const s of SUBSIDIES) if (!s.rule.autoGranted) assert.ok(hasPhoneChannel(s), s.id);
  assert.ok(!hasPhoneChannel({ ...allowance, apply: { online: { url: "https://example.gov.tw/", label: "線上申請" } } }));
});

test("prepSheet：附上打電話時的第一句話", () => {
  const m = findSubsidies(elder, none, TODAY).apply.find((x) => x.subsidy.id === "elder-allowance")!;
  const text = prepSheet(m, zhongshan, selfSubject(86));
  assert.ok(text.includes("打電話時可以先說：您好，我想問「老人生活津貼」怎麼申請。我住在中山區，今年 86 歲。"));
  assert.ok(!text.includes("幫家人看"));
});

test("prepSheet：幫家人看時寫明是幫家人看、當作同一戶，代辦改成「代辦的人」", () => {
  const p = personForOther({ age: "65-up", native: "no" }, true);
  const m = findSubsidies(p, { disability: "no", income: "unknown", care: "no" }, TODAY).apply.find(
    (x) => x.subsidy.id === "elder-allowance",
  )!;
  const text = prepSheet(m, zhongshan, otherSubject("65-up"));
  assert.ok(text.includes("幫家人看的（65 歲以上，當作和您住在同一戶）"));
  assert.ok(text.includes("可以幫家人代辦，代辦的人另外要帶："));
  assert.ok(text.includes("我想幫我家人問「老人生活津貼」怎麼申請"));
  assert.ok(!text.includes("符合"), "不說「符合」");
});
