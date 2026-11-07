/**
 * M5 我要叫車：最多問兩題，分流到三種車（規格見 TownPass docs/townpass/elder-mode-spec.md M5）。
 *
 * 為什麼要分流：小型復康巴士只限持身心障礙證明的人搭乘，很多長輩以為自己也能叫
 * （taipei-elderly-services.md B.3 ✅）。所以先問身障證明，再問長照等級：
 *
 *   有身障證明？ ── 有 → 復康巴士
 *        │
 *        └ 沒有／不知道 → 長照 2 級以上？ ── 是 → 長照交通接送
 *                               ├ 不是 → 敬老計程車
 *                               └ 不知道 → 打 1966 問＋敬老計程車
 *
 * 純函式，不碰畫面，可以用 node --test 測試。服務本身（電話、網址）放在 services.json。
 */

export type RideQuestion = "disability" | "ltc";
export type RideAnswer = "yes" | "no" | "unsure";
export type RideAnswers = Partial<Record<RideQuestion, RideAnswer>>;

export interface RideState {
  /** 回答過的題目。回上一題時保留，讓按鈕顯示「已選」 */
  answers: RideAnswers;
  /** 正在問的題目；null 表示已經有結果 */
  asking: RideQuestion | null;
}

export interface RideQuestionText {
  title: string;
  /** 題目下面的一句補充說明 */
  hint: string;
  options: { value: RideAnswer; label: string }[];
}

export const RIDE_QUESTIONS: Readonly<Record<RideQuestion, RideQuestionText>> = {
  disability: {
    title: "您有身心障礙證明嗎？",
    hint: "就是身心障礙手冊或證明。",
    options: [
      { value: "yes", label: "有" },
      { value: "no", label: "沒有" },
      { value: "unsure", label: "不知道" },
    ],
  },
  ltc: {
    title: "家裡有沒有申請過長照，等級 2 級以上？",
    hint: "照管專員到家裡評估過，會告訴您長照等級。",
    options: [
      { value: "yes", label: "是" },
      { value: "no", label: "不是" },
      { value: "unsure", label: "不知道" },
    ],
  },
};

export const RIDE_START: RideState = { answers: {}, asking: "disability" };

/** 不知道有沒有身障證明時的提示（第 2 題和結果都會顯示） */
export const DISABILITY_UNSURE_NOTE = "不知道有沒有身障證明，先當作沒有。復康巴士只限有身障證明的人搭。";

/** 依目前的回答，下一個要問的題目；null 表示可以給結果了 */
function nextQuestion(answers: RideAnswers): RideQuestion | null {
  if (!answers.disability) return "disability";
  if (answers.disability === "yes") return null;
  if (!answers.ltc) return "ltc";
  return null;
}

/** 回答正在問的題目。改了答案時，後面的題目要重新回答 */
export function answerRide(state: RideState, answer: RideAnswer): RideState {
  const question = state.asking;
  if (!question) return state;
  const changed = state.answers[question] !== answer;
  const answers: RideAnswers =
    question === "disability" && changed ? { disability: answer } : { ...state.answers, [question]: answer };
  return { answers, asking: nextQuestion(answers) };
}

/** 回上一題；已經在第 1 題時回 null。保留原本的回答 */
export function backRide(state: RideState): RideState | null {
  if (state.asking === "disability") return null;
  if (state.asking === "ltc") return { answers: state.answers, asking: "disability" };
  // 從結果回到最後問的那一題
  return { answers: state.answers, asking: state.answers.disability === "yes" ? "disability" : "ltc" };
}

export interface RideFallback {
  /** 訂不到車時依序改試的服務（services.json 的 id），最後一定是「打給家人」 */
  serviceIds: string[];
  /** 補充提示，放在「訂不到車怎麼辦？」下面 */
  notes: string[];
}

export interface RideResult {
  /** 結果標題（也是焦點與報讀的第一句） */
  heading: string;
  /** 依序顯示的服務（services.json 的 id） */
  serviceIds: string[];
  /** 補充提示，放在標題下面 */
  notes: string[];
  /** 「訂不到車怎麼辦？」：下一個可以試的方式 */
  fallback: RideFallback;
}

export interface RideResultOptions {
  /** 聽不清楚模式：只能用講的叫車方式旁邊，加上手語視訊轉譯（請翻譯員代打電話） */
  hearing?: boolean;
}

/**
 * 依回答給結果；還沒答完回 null。
 * 用語只說「可能可以」，資格以主責機關審核為準（CLAUDE.md §4.5）。
 */
export function rideResult(answers: RideAnswers, options: RideResultOptions = {}): RideResult | null {
  const base = baseResult(answers);
  if (!base) return null;
  const result: RideResult = { ...base, fallback: rideFallback(answers) };
  if (!options.hearing) return result;
  // 聽不清楚模式：敬老計程車只能用講的，旁邊加手語視訊轉譯（請翻譯員代叫）
  const serviceIds = result.serviceIds.includes("senior-taxi") ? [...result.serviceIds, "vrs"] : result.serviceIds;
  const fallbackIds = result.fallback.serviceIds.flatMap((id) => (id === "senior-taxi" ? [id, "vrs"] : [id]));
  return { ...result, serviceIds, fallback: { ...result.fallback, serviceIds: fallbackIds } };
}

/** 長照交通接送的條件（退路裡沒問過長照等級時提醒） */
export const LTC_RIDE_CONDITION = "沒問過您的長照等級：長照 2 級以上才能用長照交通接送。今天就要出門，可以直接叫敬老計程車。";

/**
 * 訂不到車怎麼辦？依結果的車種往下一層退：
 *   復康巴士 → 長照交通接送（沒回答過「不是／不知道」才放）→ 敬老計程車 → 打給家人
 *   長照交通接送 → 敬老計程車 → 打給家人
 *   敬老計程車（含長照等級不知道）→ 打給家人
 * 只用 services.json 裡已經有的服務；能不能用一樣以主責機關審核為準。
 */
function rideFallback(answers: RideAnswers): RideFallback {
  if (answers.disability === "yes") {
    // 有身障證明時不會問長照等級，所以只有回答過「是」才不用提醒條件
    const ltcAllowed = answers.ltc === undefined || answers.ltc === "yes";
    return {
      serviceIds: [...(ltcAllowed ? ["ltc-ride"] : []), "senior-taxi", "page-family"],
      notes: ltcAllowed && answers.ltc !== "yes" ? [LTC_RIDE_CONDITION] : [],
    };
  }
  if (answers.ltc === "yes") return { serviceIds: ["senior-taxi", "page-family"], notes: [] };
  return { serviceIds: ["page-family"], notes: ["叫不到車的話，打給家人，請家人來接您或幫您叫車。"] };
}

// 補充提示只放服務卡片上沒寫的事，避免同一句話唸兩次（taipei-elderly-services.md B.3 ✅）
function baseResult(answers: RideAnswers): Omit<RideResult, "fallback"> | null {
  if (nextQuestion(answers) !== null) return null;

  if (answers.disability === "yes") {
    return {
      heading: "您可能可以搭復康巴士",
      serviceIds: ["rehab-bus"],
      notes: ["早上 8 點到下午 5 點受理訂車。"],
    };
  }

  const notes = answers.disability === "unsure" ? [DISABILITY_UNSURE_NOTE] : [];
  switch (answers.ltc) {
    case "yes":
      return {
        heading: "您可能可以用長照交通接送",
        serviceIds: ["ltc-ride"],
        notes: [...notes, "每月給付上限 1,680 元，一般戶自付 30%。"],
      };
    case "no":
      return {
        heading: "建議您搭敬老計程車",
        serviceIds: ["senior-taxi"],
        notes: [...notes, "打通以後按 0，就是敬老愛心車。"],
      };
    default:
      return {
        heading: "先打 1966 問長照等級",
        serviceIds: ["ltc-1966", "senior-taxi"],
        notes: [...notes, "長照 2 級以上可以用長照交通接送。今天就要出門，可以先搭敬老計程車。"],
      };
  }
}
