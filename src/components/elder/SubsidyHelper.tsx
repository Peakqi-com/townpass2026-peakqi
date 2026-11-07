"use client";

import { useEffect, useRef, useState } from "react";
import { ageOn } from "@/lib/elder/profile";
import { formatPhone, getService, type Service } from "@/lib/elder/services";
import {
  AGE_BRACKETS,
  callScript,
  districtFor,
  districtPhoneText,
  ext1999,
  findSubsidies,
  hasPhoneChannel,
  nativeMatters,
  otherSubject,
  personForOther,
  prepSheet,
  REVIEW_NOTE,
  selfSubject,
  townOf,
  type CareAnswer,
  type DisabilityAnswer,
  type District,
  type IncomeAnswer,
  type NativeAnswer,
  type Subsidy,
  type SubsidyAnswers,
  type SubsidyHint,
  type SubsidyMatch,
  type SubsidyResult,
  type SubsidySubject,
  type Who,
} from "@/lib/elder/subsidy";
import { ChannelButtons, type Channel } from "./ChannelButtons";
import { useElder } from "./ElderProvider";
import { PageShell } from "./PageShell";
import { ServiceAction } from "./ServiceButton";
import { ServiceCard } from "./ServiceCard";
import { ShareToFamily } from "./ShareToFamily";

/* ---------- 問題 ---------- */

type Step = "who" | "age" | "native" | "disability" | "disabilityType" | "income" | "care" | "result";
type QuestionStep = Exclude<Step, "result">;

/** 全部的回答。幫家人看時才有 age（年紀級距的 id 或 "unknown"）和 native（級距會影響結果時才問） */
interface Answers extends SubsidyAnswers {
  who: Who;
  age?: string;
  native?: NativeAnswer;
}
type Draft = Partial<Answers>;

interface Option {
  label: string;
  /** 回上一題時，上次選的那一個顯示 ✓ 並設 aria-pressed */
  selected: (a: Draft) => boolean;
  apply: (a: Draft) => { answers: Draft; next: Step };
}

const d = (label: string, v: DisabilityAnswer, next: Step): Option => ({
  label,
  selected: (a) => a.disability === v,
  apply: (a) => ({ answers: { ...a, disability: v }, next }),
});
const i = (label: string, v: IncomeAnswer): Option => ({
  label,
  selected: (a) => a.income === v,
  apply: (a) => ({ answers: { ...a, income: v }, next: "care" }),
});
const c = (label: string, v: CareAnswer): Option => ({
  label,
  selected: (a) => a.care === v,
  apply: (a) => ({ answers: { ...a, care: v }, next: "result" }),
});
const n = (label: string, v: NativeAnswer): Option => ({
  label,
  selected: (a) => a.native === v,
  apply: (a) => ({ answers: { ...a, native: v }, next: "disability" }),
});
/** 選了年紀：這個級距是不是原住民會影響結果，才再問原住民 */
const ageOption = (label: string, id: string): Option => ({
  label,
  selected: (a) => a.age === id,
  apply: (a) =>
    nativeMatters(id)
      ? { answers: { ...a, age: id }, next: "native" }
      : { answers: { ...a, age: id, native: undefined }, next: "disability" },
});

interface Question {
  title: string;
  hint?: string;
  options: Option[];
}

/** 題目：幫家人看時，主詞改成「他（她）」 */
function questionFor(step: QuestionStep, who: Who | undefined): Question {
  const other = who === "other";
  switch (step) {
    case "who":
      return {
        title: "您是幫誰看？",
        hint: "幫家人看的話，會再問他（她）的年紀。",
        options: [
          {
            label: "幫我自己",
            selected: (a) => a.who === "self",
            apply: (a) => ({ answers: { ...a, who: "self", age: undefined, native: undefined }, next: "disability" }),
          },
          {
            label: "幫另一半或家人",
            selected: (a) => a.who === "other",
            apply: (a) => ({ answers: { ...a, who: "other" }, next: "age" }),
          },
        ],
      };
    case "age":
      return {
        title: "他（她）今年幾歲？",
        hint: "選大概的範圍就好。",
        options: [...AGE_BRACKETS.map((b) => ageOption(b.label, b.id)), ageOption("不知道", "unknown")],
      };
    case "native":
      return {
        title: "他（她）是原住民嗎？",
        hint: "原住民的年齡門檻比較低，有些補助 55 歲就可以申請。",
        options: [n("是", "yes"), n("不是", "no"), n("不知道", "unknown")],
      };
    case "disability":
      return {
        title: other ? "他（她）有沒有身心障礙證明？" : "您有身心障礙證明嗎？",
        options: [
          {
            label: "有",
            selected: (a) => a.disability === "vision" || a.disability === "hearing" || a.disability === "other",
            apply: (a) => ({ answers: a, next: "disabilityType" }),
          },
          d("沒有", "no", "income"),
          d("不知道", "unknown", "income"),
        ],
      };
    case "disabilityType":
      return {
        title: "主要是哪一種？",
        options: [d("看不清楚", "vision", "income"), d("聽不清楚", "hearing", "income"), d("其他", "other", "income")],
      };
    case "income":
      return {
        title: "家裡有低收入戶或中低收入戶證明嗎？",
        hint: "沒有證明，但家裡收入不高，也可能可以申請。",
        options: [i("有低收或中低收證明", "certified"), i("沒有，但收入不高", "notCertified"), i("不知道", "unknown")],
      };
    case "care":
      return {
        title: "家裡有人需要別人照顧嗎？",
        hint: `例如走路、洗澡、吃飯需要有人幫忙。也可以是${other ? "他（她）" : "您"}自己。`,
        options: [c("需要", "yes"), c("不需要", "no"), c("不知道", "unknown")],
      };
  }
}

/** 幫家人看時有沒有問原住民題 */
function asksNative(a: Draft): boolean {
  return a.who === "other" && a.age !== undefined && nativeMatters(a.age);
}

function previous(step: Exclude<Step, "who">, a: Draft): Step {
  switch (step) {
    case "age":
      return "who";
    case "native":
      return "age";
    case "disability":
      return a.who !== "other" ? "who" : asksNative(a) ? "native" : "age";
    case "disabilityType":
    case "income":
      return "disability";
    case "care":
      return "income";
    case "result":
      return "care";
  }
}

/**
 * 「第幾題，共幾題」：幫誰看、年紀還沒回答前，後面要問幾題還不確定，只顯示第幾題。
 * 「主要是哪一種」算在身心障礙那一題裡。
 */
function progressText(step: QuestionStep, a: Draft): string {
  const path: QuestionStep[] =
    a.who === "self"
      ? ["who", "disability", "income", "care"]
      : ["who", "age", ...(asksNative(a) ? (["native"] as const) : []), "disability", "income", "care"];
  const index = path.indexOf(step === "disabilityType" ? "disability" : step) + 1;
  const known = a.who === "self" || (a.who === "other" && a.age !== undefined);
  return known ? `第 ${index} 題，共 ${path.length} 題` : `第 ${index} 題`;
}

/**
 * 這次使用期間的答案：只放在手機的記憶體裡（不存檔、不上傳）。
 * 從撥號確認頁按返回時，不用重新回答；重新整理或關掉就清除。
 */
let remembered: Answers | null = null;

function isComplete(a: Draft): a is Answers {
  if (a.who === undefined || a.disability === undefined || a.income === undefined || a.care === undefined) return false;
  if (a.who === "self") return true;
  return a.age !== undefined && (!nativeMatters(a.age) || a.native !== undefined);
}

/**
 * M12 補助小幫手：先問幫誰看，再問三題大按鈕（都有「不知道」）。
 * 幫自己看：年齡與原住民身分從台北通帶入。幫家人看：問年紀級距（必要時問原住民），
 * 行政區沿用使用者的（假設住在同一戶，畫面上會寫出來）。
 * 結果只說「可能可以申請」，最後由社會局審核。
 */
export function SubsidyHelper() {
  const { ready, now, user, a11y, say } = useElder();
  const [answers, setAnswers] = useState<Draft>(() => remembered ?? {});
  const [step, setStep] = useState<Step>(() => (remembered ? "result" : "who"));
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  // 換題、出結果時把焦點移到新的標題（第一次載入時由 PageShell 移到 h1）。
  // 報讀軟體開著時，移焦點就會唸標題，所以不再呼叫 say，避免唸兩次。
  useEffect(() => {
    if (!moved.current) return;
    heading.current?.focus({ preventScroll: false });
    if (!a11y.screenReader && heading.current?.textContent) say(heading.current.textContent);
    // 只在換題時執行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const go = (next: Step, nextAnswers: Draft) => {
    moved.current = true;
    setAnswers(nextAnswers);
    setStep(next);
    remembered = next === "result" && isComplete(nextAnswers) ? nextAnswers : null;
  };

  const restart = () => go("who", {});

  if (!ready || !now) {
    return (
      <PageShell title="補助小幫手">
        <p className="text-elder-body text-text-second">載入中…</p>
      </PageShell>
    );
  }

  const age = user ? ageOn(user.birthday, now) : null;
  const town = townOf(user?.addresses);
  const district = districtFor(town);
  const citizen = user?.citizen ?? false;
  const intro =
    answers.who === "self"
      ? `從台北通帶入：${[age !== null ? `${age} 歲` : "讀不到生日", town, user?.nativePeople ? "原住民" : null].filter(Boolean).join("・")}。`
      : answers.who === "other"
        ? `幫家人看：年紀照您選的；住的區用您台北通的資料（${town ?? "讀不到"}），當作家人和您住在同一戶。`
        : "先問幫誰看，再問三個問題，幫您看看可能可以申請哪些補助。每一題都可以選「不知道」。";

  return (
    <PageShell title="補助小幫手">
      {step === "result" && isComplete(answers) ? (
        <Results
          headingRef={heading}
          result={findSubsidies(
            answers.who === "self"
              ? { age, nativePeople: user?.nativePeople ?? false, citizen }
              : personForOther({ age: answers.age ?? "unknown", native: answers.native ?? "no" }, citizen),
            answers,
            now,
          )}
          subject={answers.who === "self" ? selfSubject(age) : otherSubject(answers.age ?? "unknown")}
          district={district}
          onRestart={restart}
        />
      ) : (
        <QuestionView
          step={step === "result" ? "care" : step}
          answers={answers}
          intro={intro}
          headingRef={heading}
          onAnswer={(o) => {
            const { answers: next, next: nextStep } = o.apply(answers);
            go(nextStep, next);
          }}
          onBack={step === "who" ? null : () => go(previous(step, answers), answers)}
        />
      )}
    </PageShell>
  );
}

/* ---------- 問題畫面 ---------- */

const CHOICE =
  "flex min-h-[4.5rem] w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-3 text-center text-elder-button font-bold text-text-primary " +
  "outline-offset-2 active:outline active:outline-[6px] active:outline-grayscale-900 focus-visible:outline focus-visible:outline-[6px] focus-visible:outline-grayscale-900";

/**
 * 選項大按鈕。回上一題時，上次選的顯示 ✓、粗框（不只靠顏色），
 * 報讀軟體由 aria-pressed 唸「已選取」。
 */
function Choice({ label, pressed, onPress }: { label: string; pressed: boolean; onPress: () => void }) {
  const { announce } = useElder();
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => {
        announce(label);
        onPress();
      }}
      className={`${CHOICE} ${pressed ? "border-[6px] border-grayscale-900" : "border-4 border-grayscale-800"}`}
    >
      {pressed && <span aria-hidden="true">✓</span>}
      <span>{label}</span>
      {pressed && (
        <span aria-hidden="true" className="text-elder-body">
          （上次選的）
        </span>
      )}
    </button>
  );
}

function QuestionView({
  step,
  answers,
  intro,
  headingRef,
  onAnswer,
  onBack,
}: {
  step: QuestionStep;
  answers: Draft;
  intro: string;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onAnswer: (o: Option) => void;
  onBack: (() => void) | null;
}) {
  const q = questionFor(step, answers.who);
  return (
    <>
      <p className="text-elder-body text-text-second">{intro}您的回答只存在這支手機裡，不會上傳。</p>
      <section aria-labelledby="question" className="flex flex-col gap-4">
        <p className="text-elder-body font-bold text-text-second">{progressText(step, answers)}</p>
        <h2 id="question" ref={headingRef} tabIndex={-1} className="text-elder-title font-bold text-text-primary focus:outline-none">
          {q.title}
        </h2>
        {q.hint && <p className="text-elder-body text-text-primary">{q.hint}</p>}
        <div className="flex flex-col gap-4">
          {q.options.map((o) => (
            <Choice key={o.label} label={o.label} pressed={o.selected(answers)} onPress={() => onAnswer(o)} />
          ))}
        </div>
      </section>
      {onBack && (
        <ServiceAction
          onPress={onBack}
          label="回上一題"
          className="self-start border-4 border-divider bg-white text-elder-body text-text-second"
        />
      )}
    </>
  );
}

/* ---------- 結果畫面 ---------- */

function hintText(h: SubsidyHint, who: Who, nativeExtra: string[]): string {
  const other = who === "other";
  switch (h) {
    case "age":
      return other
        ? "不知道家人的年紀，和年齡有關的補助（例如老人生活津貼）先沒有列出。"
        : "讀不到您的生日，和年齡有關的補助（例如老人生活津貼）先沒有列出。";
    case "notCitizen":
      return other
        ? "您的台北通資料顯示不是臺北市民（這裡當作家人和您住在同一戶），臺北市的補助先沒有列出。全國的補助可以問 1957。"
        : "您的台北通資料顯示不是臺北市民，臺北市的補助先沒有列出。全國的補助可以問 1957。";
    case "disability":
      return other
        ? "不確定他（她）有沒有身心障礙證明：有證明的人，還可能可以申請身障生活補助、輔具補助、愛心卡。可以問問他（她），再重新回答。"
        : "不確定有沒有身心障礙證明：有證明的人，還可能可以申請身障生活補助、輔具補助、愛心卡。可以問家人，再重新回答。";
    case "care":
      return "不確定家裡有沒有人需要照顧：如果有，可以打 1966 申請長照，家人也可以幫忙打。";
    case "native":
      return `不確定他（她）是不是原住民：如果是，還可能有${nativeExtra.map((t) => `「${t}」`).join("、")}。可以問問他（她），再重新回答。`;
  }
}

function Results({
  headingRef,
  result,
  subject,
  district,
  onRestart,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  result: SubsidyResult;
  subject: SubsidySubject;
  district: District | null;
  onRestart: () => void;
}) {
  const count = result.apply.length;
  const other = subject.who === "other";
  const ltc = getService("ltc-1966");
  const title =
    count > 0
      ? `${other ? "您的家人" : "您"}可能可以申請 ${count} 項`
      : `照您的回答，還沒有找到${other ? "家人" : ""}要申請的補助`;

  return (
    <>
      <section aria-labelledby="result" className="flex flex-col gap-3">
        <h2 id="result" ref={headingRef} tabIndex={-1} className="text-elder-title font-bold text-text-primary focus:outline-none">
          {title}
        </h2>
        <p className="text-elder-body font-bold text-text-primary">{REVIEW_NOTE}</p>
        {other && (
          <p className="text-elder-body text-text-primary">
            這是幫家人看的：{subject.ageText ?? "年紀不確定"}
            {district ? `，住在${district.name}` : ""}（當作和您住在同一戶）。
          </p>
        )}
        {count === 0 && (
          <p className="text-elder-body text-text-primary">還是可以找人幫{other ? "家人" : "您"}看看，下面有電話和文字管道。也可以重新回答。</p>
        )}
      </section>

      {/* 沒有找到要申請的：退路就是主要內容，放在最前面，不讓長輩走進死路 */}
      {count === 0 && <AskSomeone />}

      {result.apply.map((m) => (
        <SubsidyCard key={m.subsidy.id} match={m} subject={subject} district={district} />
      ))}

      {result.auto.length > 0 && (
        <section aria-labelledby="auto" className="flex flex-col gap-4">
          <h2 id="auto" className="text-elder-button font-bold text-text-primary">
            不用申請，會自動入帳或減免
          </h2>
          {result.auto.map((m) => (
            <AutoCard key={m.subsidy.id} match={m} district={district} />
          ))}
        </section>
      )}

      {result.hints.length > 0 && (
        <section aria-labelledby="hints" className="flex flex-col gap-3 rounded-2xl bg-bg-dark p-4">
          <h2 id="hints" className="text-elder-button font-bold text-text-primary">
            還有這些可以看看
          </h2>
          {result.hints.map((h) => (
            <p key={h} className="text-elder-body text-text-primary">
              {hintText(h, subject.who, result.nativeExtra)}
            </p>
          ))}
          {result.hints.includes("care") && ltc && (
            <ChannelButtons
              channels={[
                { kind: "run", service: ltc, action: ltc.action, label: ltc.action.label ?? "撥 1966" },
                ...(ltc.alt_channels ?? []).map((a) => ({ kind: "run" as const, service: ltc, action: a, label: a.label, text: true })),
              ]}
            />
          )}
        </section>
      )}

      {result.related.length > 0 && (
        <section aria-labelledby="related" className="flex flex-col gap-4">
          <h2 id="related" className="text-elder-button font-bold text-text-primary">
            其他可能用得到的服務
          </h2>
          {result.related.map((id) => {
            const s = getService(id);
            return s ? <ServiceCard key={id} service={s} headingLevel={3} /> : null;
          })}
        </section>
      )}

      {count > 0 && <AskSomeone />}

      <ServiceAction onPress={onRestart} label="重新回答" className="border-4 border-grayscale-800 bg-white text-text-primary" />

      <p className="rounded-2xl border-4 border-divider p-4 text-elder-body text-text-primary">
        {REVIEW_NOTE}您的回答只存在這支手機裡，不會上傳。金額與資格每年調整，以各卡片上的查證日期為準。
      </p>
    </>
  );
}

/**
 * 退路：沒有找到適合的、或還是不確定時，找真人問。
 * 用服務清單的卡片（ServiceCard），聽不清楚模式會把文字管道排在前面。
 */
const ASK_SOMEONE = ["welfare-1957", "ltc-1966", "page-text"];

function AskSomeone() {
  return (
    <section aria-labelledby="ask-someone" className="flex flex-col gap-4 rounded-2xl bg-bg-dark p-4">
      <h2 id="ask-someone" className="text-elder-button font-bold text-text-primary">
        沒有找到適合的，或還是不確定？
      </h2>
      <p className="text-elder-body text-text-primary">
        不知道可以領什麼，可以問 1957；家裡有人需要照顧，可以問 1966；不方便講電話，可以用文字聯絡。
      </p>
      {ASK_SOMEONE.map((id) => {
        const s = getService(id);
        return s ? <ServiceCard key={id} service={s} headingLevel={3} /> : null;
      })}
    </section>
  );
}

/* ---------- 補助卡片 ---------- */

/** 給 useRunAction 用的服務形狀（只用在開啟網址；撥號一律走確認頁） */
function asService(s: Subsidy): Service {
  return {
    id: s.id,
    title: s.title,
    speak: s.title,
    description: s.summary,
    category: "benefit",
    phrases: [],
    audience: ["elder", "vision", "hearing"],
    action: { type: "open_link", target: s.source },
    owner: s.owner,
    source: s.source,
    verified: s.verified,
  };
}

function districtChannel(d: District): Channel {
  return { kind: "link", href: `/benefits/call/district-${d.id}`, label: `打給${d.name}公所社會課`, voice: true };
}

/** 一項補助的申請管道：線上（確定能用的）→ 區公所社會課 → 專線 → 1999 */
function applyChannels(s: Subsidy, district: District | null): Channel[] {
  const channels: Channel[] = [];
  const a = s.apply;
  if (a.online) {
    channels.push({ kind: "run", service: asService(s), action: { type: "open_external", target: a.online.url }, label: a.online.label, text: true });
  }
  if (a.counter && district) channels.push(districtChannel(district));
  const service = a.service ? getService(a.service) : undefined;
  if (service) {
    channels.push({ kind: "run", service, action: service.action, label: service.action.label ?? service.title });
    for (const alt of service.alt_channels ?? []) {
      channels.push({ kind: "run", service, action: alt, label: alt.label, text: alt.type !== "phone_call" });
    }
  }
  if (a.phone) {
    channels.push({
      kind: "link",
      href: `/benefits/call/${s.id}`,
      label: `打給${a.phone.label} ${formatPhone(a.phone.number)}`,
      voice: true,
    });
  }
  const ext = ext1999(s, district);
  const c1999 = getService("citizen-1999");
  if (ext && c1999) {
    channels.push({ kind: "run", service: c1999, action: c1999.action, label: "打 1999", speak: `打 1999，接通後說轉分機 ${ext}` });
  }
  return channels;
}

function SubsidyCard({ match, subject, district }: { match: SubsidyMatch; subject: SubsidySubject; district: District | null }) {
  const s = match.subsidy;
  const id = `subsidy-${s.id}`;
  const ext = ext1999(s, district);
  const notes = [...match.caveats, ...s.notes];

  return (
    <article aria-labelledby={id} className="flex flex-col gap-4 rounded-2xl border-4 border-elder-benefit bg-white p-4">
      <h3 id={id} className="text-elder-button font-bold text-text-primary">
        {s.title}
      </h3>
      <p className="text-elder-body text-text-primary">{s.summary}</p>
      <p className="text-elder-body font-bold text-text-primary">大約金額：{s.amount}</p>
      {match.caveats.length > 0 && (
        <p className="rounded-xl bg-bg-dark p-3 text-elder-body font-bold text-text-primary">
          要注意：{match.caveats.join("；")}
        </p>
      )}

      {s.documents.length > 0 && (
        <section className="flex flex-col gap-2">
          <h4 className="text-elder-body font-bold text-text-primary">要準備什麼</h4>
          <Checklist items={s.documents} />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h4 className="text-elder-body font-bold text-text-primary">怎麼申請</h4>
        {s.apply.how && <p className="text-elder-body text-text-primary">{s.apply.how}</p>}
        {s.apply.counter && <CounterBox kind={s.apply.counter} district={district} />}
        {ext && <p className="text-elder-body text-text-primary">打 1999，接通後請說：「轉分機 {ext}」。</p>}
        {hasPhoneChannel(s) && (
          <div className="flex flex-col gap-1 rounded-xl border-4 border-divider p-3 text-elder-body text-text-primary">
            <p className="font-bold">打電話或用文字問時，可以先這樣說：</p>
            <p>{callScript(s, subject, district)}</p>
          </div>
        )}
        <ChannelButtons channels={applyChannels(s, district)} />
      </section>

      <section className="flex flex-col gap-2">
        <h4 className="text-elder-body font-bold text-text-primary">家人可以代辦嗎</h4>
        <ProxyInfo subsidy={s} who={subject.who} />
      </section>

      {notes.length > 0 && (
        <section className="flex flex-col gap-2">
          <h4 className="text-elder-body font-bold text-text-primary">注意事項</h4>
          <ul className="flex list-disc flex-col gap-2 pl-6 text-elder-body text-text-primary">
            {notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      )}

      <PrepSheet text={prepSheet(match, district, subject)} />

      <Footer subsidy={s} />
    </article>
  );
}

function AutoCard({ match, district }: { match: SubsidyMatch; district: District | null }) {
  const s = match.subsidy;
  const id = `auto-${s.id}`;
  const ext = ext1999(s, district);
  return (
    <article aria-labelledby={id} className="flex flex-col gap-3 rounded-2xl border-4 border-divider bg-white p-4">
      <h3 id={id} className="text-elder-button font-bold text-text-primary">
        {s.title}
      </h3>
      <p className="text-elder-body text-text-primary">{s.apply.autoNote ?? s.summary}</p>
      <p className="text-elder-body font-bold text-text-primary">大約金額：{s.amount}</p>
      {s.notes.map((n) => (
        <p key={n} className="text-elder-body text-text-second">
          {n}
        </p>
      ))}
      {ext && <p className="text-elder-body text-text-primary">有問題可以打 1999，接通後請說：「轉分機 {ext}」。</p>}
      <Footer subsidy={s} />
    </article>
  );
}

function CounterBox({ kind, district }: { kind: "district_social" | "any_district"; district: District | null }) {
  if (!district) {
    return (
      <p className="rounded-xl bg-bg-dark p-3 text-elder-body text-text-primary">
        {kind === "any_district" ? "任何一個區公所都可以辦。" : "請到戶籍所在地的區公所社會課。"}不知道在哪裡，可以問 1999。
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-bg-dark p-3 text-elder-body text-text-primary">
      <p className="font-bold">
        {kind === "any_district" ? "離您家近的：" : ""}
        {district.name}公所社會課
      </p>
      <p>地址：{district.address}</p>
      <p>電話：{districtPhoneText(district)}</p>
    </div>
  );
}

function ProxyInfo({ subsidy: s, who }: { subsidy: Subsidy; who: Who }) {
  if (s.proxy.allowed === null) {
    return <p className="text-elder-body text-text-primary">官方頁面沒有寫能不能代辦，請先打電話問。</p>;
  }
  if (!s.proxy.allowed) return <p className="text-elder-body text-text-primary">要本人辦理。</p>;
  return (
    <>
      <p className="text-elder-body text-text-primary">
        {who === "other"
          ? s.proxy.bring.length > 0
            ? "可以，您可以幫他（她）辦。代辦的人另外要帶："
            : "可以，您可以幫他（她）辦。"
          : s.proxy.bring.length > 0
            ? "可以。家人另外要帶："
            : "可以請家人幫忙。"}
      </p>
      {s.proxy.bring.length > 0 && <Checklist items={s.proxy.bring} />}
      {s.apply.counter === "district_social" && (
        <p className="text-elder-body text-text-second">官方頁面沒寫要委託書；會不會另外要，建議先打電話問區公所。</p>
      )}
    </>
  );
}

/** 勾選清單：只記在這個畫面，不存檔 */
function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item}>
          <label className="flex min-h-14 items-center gap-4 rounded-xl px-1 text-elder-body text-text-primary">
            <input type="checkbox" className="size-8 shrink-0 accent-grayscale-800" />
            <span>{item}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

/**
 * 申請準備單：一段純文字，可以直接傳簡訊給 M7 設定的家人，或複製後貼到 LINE（共用的 ShareToFamily）。
 * 不假設 LINE 的分享網址格式。
 */
function PrepSheet({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="flex flex-col gap-3">
      <ServiceAction
        onPress={() => setOpen(!open)}
        label={open ? "收起申請準備單" : "看申請準備單（可以傳給家人）"}
        row
        className="border-4 border-grayscale-800 bg-white text-text-primary"
      />
      {open && <ShareToFamily level={4} title="傳給家人幫忙" text={text} />}
    </section>
  );
}

function Footer({ subsidy: s }: { subsidy: Subsidy }) {
  return (
    <p className="text-h3 text-text-second">
      {s.owner}・
      <a href={s.source} className="underline underline-offset-2">
        官方說明
      </a>
      （{s.verified} 查證）
    </p>
  );
}
