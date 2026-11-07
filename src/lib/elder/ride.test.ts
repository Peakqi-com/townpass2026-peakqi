import { test } from "node:test";
import assert from "node:assert/strict";
import { getService } from "./services.ts";
import {
  RIDE_QUESTIONS,
  RIDE_START,
  answerRide,
  backRide,
  rideResult,
  type RideAnswer,
  type RideState,
} from "./ride.ts";

// M5 我要叫車：最多兩題，分流到復康巴士、長照交通接送、敬老計程車

/** 從頭依序回答，回傳最後的狀態 */
function play(...answers: RideAnswer[]): RideState {
  return answers.reduce((state, a) => answerRide(state, a), RIDE_START);
}

const ids = (state: RideState) => rideResult(state.answers)?.serviceIds;

test("一開始問第 1 題（身障證明），還沒有結果", () => {
  assert.equal(RIDE_START.asking, "disability");
  assert.equal(rideResult(RIDE_START.answers), null);
});

test("有身障證明 → 只問一題就到結果：復康巴士", () => {
  const state = play("yes");
  assert.equal(state.asking, null);
  assert.deepEqual(ids(state), ["rehab-bus"]);
});

test("沒有身障證明 → 問第 2 題（長照等級）", () => {
  const state = play("no");
  assert.equal(state.asking, "ltc");
  assert.equal(rideResult(state.answers), null, "還沒答第 2 題，不能有結果");
});

test("沒有身障證明＋長照 2 級以上 → 長照交通接送", () => {
  assert.deepEqual(ids(play("no", "yes")), ["ltc-ride"]);
});

test("沒有身障證明＋長照不到 2 級 → 敬老計程車", () => {
  assert.deepEqual(ids(play("no", "no")), ["senior-taxi"]);
});

test("長照等級不知道 → 先打 1966 問，再給敬老計程車", () => {
  assert.deepEqual(ids(play("no", "unsure")), ["ltc-1966", "senior-taxi"]);
});

test("不知道有沒有身障證明 → 當作沒有，繼續問第 2 題，並提示原因", () => {
  const state = play("unsure");
  assert.equal(state.asking, "ltc");
  const result = rideResult(play("unsure", "no").answers);
  assert.deepEqual(result?.serviceIds, ["senior-taxi"]);
  assert.ok(
    result?.notes.some((n) => n.includes("當作沒有")),
    "結果要說明「不知道」被當作沒有",
  );
});

test("每一種結果都有標題，而且不說「符合」（資格以主責機關審核為準）", () => {
  const paths: RideAnswer[][] = [["yes"], ["no", "yes"], ["no", "no"], ["no", "unsure"], ["unsure", "yes"], ["unsure", "unsure"]];
  for (const path of paths) {
    const result = rideResult(play(...path).answers);
    assert.ok(result, `${path.join("→")} 要有結果`);
    assert.ok(result.heading.length > 0);
    assert.ok(!result.heading.includes("符合"), `${path.join("→")} 的標題不能說「符合」`);
    for (const note of result.notes) assert.ok(!note.includes("符合"));
  }
});

test("結果裡的服務都在服務清單裡（services.json）", () => {
  const paths: RideAnswer[][] = [["yes"], ["no", "yes"], ["no", "no"], ["no", "unsure"]];
  for (const path of paths) {
    for (const id of rideResult(play(...path).answers)?.serviceIds ?? []) {
      assert.ok(getService(id), `${id} 不在 services.json`);
    }
  }
});

test("回上一題：第 1 題沒有上一題", () => {
  assert.equal(backRide(RIDE_START), null);
});

test("回上一題：從第 2 題回到第 1 題，保留原本的回答（按鈕顯示已選）", () => {
  const back = backRide(play("no"));
  assert.deepEqual(back, { asking: "disability", answers: { disability: "no" } });
});

test("回上一題：從結果回到最後一題", () => {
  assert.equal(backRide(play("yes"))?.asking, "disability", "有身障證明時只問過第 1 題");
  assert.equal(backRide(play("no", "no"))?.asking, "ltc");
});

test("回上一題後，在第 2 題沒有結果（看得到題目，不會直接跳到結果）", () => {
  const back = backRide(play("no", "no"));
  assert.ok(back);
  assert.equal(back.asking, "ltc");
  assert.equal(back.answers.ltc, "no", "保留原本的回答");
});

test("改了第 1 題的答案，後面的回答清掉；沒改就保留", () => {
  const atQ1 = backRide(backRide(play("no", "yes"))!)!;
  assert.equal(atQ1.asking, "disability");
  assert.equal(answerRide(atQ1, "no").answers.ltc, "yes", "答案沒變，保留第 2 題的回答");
  assert.equal(answerRide(atQ1, "unsure").answers.ltc, undefined, "答案改了，第 2 題要重新回答");
  assert.deepEqual(ids(answerRide(atQ1, "yes")), ["rehab-bus"]);
});

test("在結果頁再呼叫 answerRide 不會改變狀態", () => {
  const done = play("yes");
  assert.deepEqual(answerRide(done, "no"), done);
});

test("題目文字：Q1 問身障證明、Q2 問長照 2 級以上；每題都有三個選項", () => {
  assert.equal(RIDE_QUESTIONS.disability.title, "您有身心障礙證明嗎？");
  assert.ok(RIDE_QUESTIONS.ltc.title.includes("2 級以上"));
  for (const q of Object.values(RIDE_QUESTIONS)) {
    assert.deepEqual(
      q.options.map((o) => o.value),
      ["yes", "no", "unsure"],
    );
  }
});

test("聽不清楚模式：結果有敬老計程車（只能用講的）時，加上手語視訊轉譯，請翻譯員代叫", () => {
  assert.deepEqual(rideResult(play("no", "no").answers, { hearing: true })?.serviceIds, ["senior-taxi", "vrs"]);
  assert.deepEqual(rideResult(play("no", "unsure").answers, { hearing: true })?.serviceIds, [
    "ltc-1966",
    "senior-taxi",
    "vrs",
  ]);
  assert.deepEqual(rideResult(play("yes").answers, { hearing: true })?.serviceIds, ["rehab-bus"], "復康巴士可以用網站預約，不用加");
  assert.ok(getService("vrs"), "vrs 要在 services.json");
});

/* ---------- 訂不到車怎麼辦？（退路） ---------- */

const fallbackIds = (state: RideState, hearing = false) => rideResult(state.answers, { hearing })?.fallback.serviceIds;

test("退路：復康巴士訂不到 → 長照交通接送、敬老計程車、打給家人", () => {
  assert.deepEqual(fallbackIds(play("yes")), ["ltc-ride", "senior-taxi", "page-family"]);
  const result = rideResult(play("yes").answers);
  assert.ok(
    result?.fallback.notes.some((n) => n.includes("長照") && n.includes("2 級以上")),
    "沒問過長照等級，要說明長照交通接送的條件",
  );
});

test("退路：長照交通接送訂不到 → 敬老計程車、打給家人", () => {
  assert.deepEqual(fallbackIds(play("no", "yes")), ["senior-taxi", "page-family"]);
  assert.deepEqual(fallbackIds(play("unsure", "yes")), ["senior-taxi", "page-family"]);
});

test("退路：敬老計程車叫不到 → 打給家人", () => {
  assert.deepEqual(fallbackIds(play("no", "no")), ["page-family"]);
  assert.deepEqual(fallbackIds(play("no", "unsure")), ["page-family"], "長照等級不知道時，主要也是敬老計程車");
});

test("退路：回答過「長照不到 2 級」或「不知道」時，不推長照交通接送", () => {
  for (const path of [["no", "no"], ["no", "unsure"], ["unsure", "no"], ["unsure", "unsure"]] as RideAnswer[][]) {
    assert.ok(!fallbackIds(play(...path))?.includes("ltc-ride"), `${path.join("→")} 不能出現長照交通接送`);
  }
});

test("退路：不重複結果裡已經有的服務，而且一定有「打給家人」", () => {
  const paths: RideAnswer[][] = [["yes"], ["no", "yes"], ["no", "no"], ["no", "unsure"], ["unsure", "yes"], ["unsure", "unsure"]];
  for (const path of paths) {
    const result = rideResult(play(...path).answers);
    assert.ok(result);
    for (const id of result.fallback.serviceIds) {
      assert.ok(!result.serviceIds.includes(id), `${path.join("→")}：${id} 已經在結果裡`);
      assert.ok(getService(id), `${id} 不在 services.json`);
    }
    assert.equal(result.fallback.serviceIds.at(-1), "page-family");
    for (const note of result.fallback.notes) assert.ok(!note.includes("符合"));
  }
});

test("退路：聽不清楚模式，退路裡有敬老計程車（只能用講的）時，緊接著加手語視訊轉譯", () => {
  assert.deepEqual(fallbackIds(play("yes"), true), ["ltc-ride", "senior-taxi", "vrs", "page-family"]);
  assert.deepEqual(fallbackIds(play("no", "yes"), true), ["senior-taxi", "vrs", "page-family"]);
  assert.deepEqual(fallbackIds(play("no", "no"), true), ["page-family"], "結果已經有手語視訊轉譯，退路不用再放");
});
