"use client";

import { useEffect, useRef, useState } from "react";
import {
  DISABILITY_UNSURE_NOTE,
  RIDE_QUESTIONS,
  RIDE_START,
  answerRide,
  backRide,
  rideResult,
  type RideAnswer,
  type RideState,
} from "@/lib/elder/ride";
import { getService, type Service } from "@/lib/elder/services";
import { CATEGORY_STYLE, ServiceCard } from "./ServiceCard";
import { useElder } from "./ElderProvider";
import { PageShell } from "./PageShell";

const FOCUS_RING =
  "outline-offset-2 focus-visible:outline focus-visible:outline-[6px] focus-visible:outline-grayscale-900 active:outline active:outline-[6px] active:outline-grayscale-900";

/** 頁內的次要按鈕（回上一題、重新回答），白底粗框，和選項的黃色區分 */
const SECONDARY =
  `flex min-h-[4.5rem] w-full items-center justify-center rounded-2xl border-4 border-grayscale-800 bg-white px-5 text-elder-button font-bold text-text-primary ${FOCUS_RING}`;

function pick(ids: readonly string[] = []): Service[] {
  return ids.map(getService).filter((s): s is Service => Boolean(s));
}

/**
 * M5 我要叫車：最多兩題大按鈕，分流到復康巴士、長照交通接送、敬老計程車。
 * 分流邏輯在 src/lib/elder/ride.ts（純函式，有測試）。
 * 頁面只有一個「回首頁」（PageShell）；「回上一題」是頁內的按鈕，不是另一層導覽。
 */
export function RideScreen() {
  const { mode, announce, say, a11y } = useElder();
  const hearing = mode === "hearing";
  const [state, setState] = useState<RideState>(RIDE_START);
  const heading = useRef<HTMLHeadingElement>(null);
  // 換題或出結果時，把焦點移到新的標題；第一次載入由 PageShell 把焦點放在 h1
  const moved = useRef(false);

  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    heading.current?.focus();
  }, [state]);

  const result = rideResult(state.answers, { hearing });
  const services = pick(result?.serviceIds);
  const fallbacks = pick(result?.fallback.serviceIds);
  const question = state.asking ? RIDE_QUESTIONS[state.asking] : null;
  const canGoBack = backRide(state) !== null;

  const go = (next: RideState, spoken: string) => {
    moved.current = true;
    setState(next);
    // 焦點會移到新的標題，報讀軟體會唸它；報讀軟體開著時再 say 會唸兩次
    if (!a11y.screenReader) say(spoken);
  };

  const answer = (value: RideAnswer, label: string) => {
    announce(label);
    const next = answerRide(state, value);
    const nextResult = rideResult(next.answers, { hearing });
    if (nextResult) {
      const titles = nextResult.serviceIds.map((id) => getService(id)?.title).filter(Boolean).join("、");
      go(next, `${nextResult.heading}。${titles}`);
    } else if (next.asking) {
      // 「不知道」時先用一句話說怎麼處理，完整說明畫面上另有大字
      const note = next.answers.disability === "unsure" ? "先當作沒有身障證明。" : "";
      go(next, `${note}${RIDE_QUESTIONS[next.asking].title}`);
    }
  };

  const back = () => {
    const prev = backRide(state);
    if (!prev?.asking) return;
    announce("回上一題");
    go(prev, RIDE_QUESTIONS[prev.asking].title);
  };

  const restart = () => {
    announce("重新回答");
    go(RIDE_START, RIDE_QUESTIONS.disability.title);
  };

  return (
    <PageShell title="叫車">
      <p className="text-elder-body font-bold text-text-primary">復康巴士只限有身障證明的人搭。</p>
      <p className="text-elder-body text-text-second">回答一、兩個問題，幫您找適合的車。</p>

      {question && state.asking && (
        <section aria-labelledby="ride-question" className="flex flex-col gap-4">
          <h2
            id="ride-question"
            ref={heading}
            tabIndex={-1}
            className="text-elder-button font-bold text-text-primary focus:outline-none"
          >
            {question.title}
          </h2>
          <p className="text-elder-body text-text-second">
            第 {state.asking === "disability" ? 1 : 2} 題。{question.hint}
          </p>
          {state.asking === "ltc" && state.answers.disability === "unsure" && (
            <p className="rounded-2xl bg-bg-dark p-4 text-elder-body text-text-primary">{DISABILITY_UNSURE_NOTE}</p>
          )}
          <div className="flex flex-col gap-4">
            {question.options.map((option) => {
              const pressed = state.answers[state.asking!] === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => answer(option.value, option.label)}
                  className={`flex min-h-[4.5rem] w-full items-center justify-center rounded-2xl px-5 text-elder-button font-bold ${FOCUS_RING} ${
                    CATEGORY_STYLE.ride.className
                  } ${pressed ? "outline outline-[6px] outline-grayscale-900" : ""}`}
                >
                  {option.label}
                  {/* 已選的狀態用粗框加文字，不只靠顏色；報讀軟體由 aria-pressed 唸「已選取」 */}
                  {pressed && (
                    <span aria-hidden="true" className="ml-2">
                      （上次選的）
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {canGoBack && (
            <button type="button" onClick={back} className={SECONDARY}>
              回上一題
            </button>
          )}
        </section>
      )}

      {result && (
        <section aria-labelledby="ride-result" className="flex flex-col gap-4">
          <h2
            id="ride-result"
            ref={heading}
            tabIndex={-1}
            className="text-elder-button font-bold text-text-primary focus:outline-none"
          >
            {result.heading}
          </h2>
          {result.notes.map((note) => (
            <p key={note} className="text-elder-body text-text-second">
              {note}
            </p>
          ))}
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} headingLevel={3} />
          ))}
          <p className="text-h3 text-text-second">能不能用，最後以主責機關審核為準。</p>
        </section>
      )}

      {/* 叫車最常遇到的是訂不到車：列出下一個可以試的方式，不讓長輩卡在這裡（邏輯在 ride.ts） */}
      {result && fallbacks.length > 0 && (
        <section aria-labelledby="ride-fallback" className="flex flex-col gap-4">
          <h2 id="ride-fallback" className="text-elder-button font-bold text-text-primary">
            訂不到車怎麼辦？
          </h2>
          <p className="text-elder-body text-text-second">照順序試試看：</p>
          {result.fallback.notes.map((note) => (
            <p key={note} className="text-elder-body text-text-second">
              {note}
            </p>
          ))}
          {fallbacks.map((service) => (
            <ServiceCard key={service.id} service={service} headingLevel={3} />
          ))}
        </section>
      )}

      {result && (
        <div className="flex flex-col gap-4">
          <button type="button" onClick={back} className={SECONDARY}>
            回上一題
          </button>
          <button type="button" onClick={restart} className={SECONDARY}>
            重新回答
          </button>
        </div>
      )}
    </PageShell>
  );
}
