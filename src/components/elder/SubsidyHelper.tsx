"use client";

import { useEffect, useRef, useState } from "react";
import { ageOn } from "@/lib/elder/profile";
import { formatPhone, getService, type Service } from "@/lib/elder/services";
import {
  districtFor,
  districtPhoneText,
  ext1999,
  findSubsidies,
  prepSheet,
  REVIEW_NOTE,
  townOf,
  type CareAnswer,
  type DisabilityAnswer,
  type District,
  type IncomeAnswer,
  type Subsidy,
  type SubsidyAnswers,
  type SubsidyHint,
  type SubsidyMatch,
} from "@/lib/elder/subsidy";
import { ChannelButtons, type Channel } from "./ChannelButtons";
import { useElder } from "./ElderProvider";
import { PageShell } from "./PageShell";
import { ServiceAction } from "./ServiceButton";
import { ServiceCard } from "./ServiceCard";

/* ---------- 問題 ---------- */

type Step = "disability" | "disabilityType" | "income" | "care" | "result";

interface Option {
  label: string;
  apply: (a: Partial<SubsidyAnswers>) => { answers: Partial<SubsidyAnswers>; next: Step };
}

const d = (v: DisabilityAnswer, next: Step) => (a: Partial<SubsidyAnswers>) => ({ answers: { ...a, disability: v }, next });
const i = (v: IncomeAnswer) => (a: Partial<SubsidyAnswers>) => ({ answers: { ...a, income: v }, next: "care" as Step });
const c = (v: CareAnswer) => (a: Partial<SubsidyAnswers>) => ({ answers: { ...a, care: v }, next: "result" as Step });

const QUESTIONS: Record<Exclude<Step, "result">, { n: 1 | 2 | 3; title: string; hint?: string; options: Option[] }> = {
  disability: {
    n: 1,
    title: "您有身心障礙證明嗎？",
    options: [
      { label: "有", apply: (a) => ({ answers: a, next: "disabilityType" }) },
      { label: "沒有", apply: d("no", "income") },
      { label: "不知道", apply: d("unknown", "income") },
    ],
  },
  disabilityType: {
    n: 1,
    title: "主要是哪一種？",
    options: [
      { label: "看不清楚", apply: d("vision", "income") },
      { label: "聽不清楚", apply: d("hearing", "income") },
      { label: "其他", apply: d("other", "income") },
    ],
  },
  income: {
    n: 2,
    title: "家裡有低收入戶或中低收入戶證明嗎？",
    hint: "沒有證明，但家裡收入不高，也可能可以申請。",
    options: [
      { label: "有低收或中低收證明", apply: i("certified") },
      { label: "沒有，但收入不高", apply: i("notCertified") },
      { label: "不知道", apply: i("unknown") },
    ],
  },
  care: {
    n: 3,
    title: "家裡有人需要別人照顧嗎？",
    hint: "例如走路、洗澡、吃飯需要有人幫忙。也可以是您自己。",
    options: [
      { label: "需要", apply: c("yes") },
      { label: "不需要", apply: c("no") },
      { label: "不知道", apply: c("unknown") },
    ],
  },
};

const PREVIOUS: Record<Exclude<Step, "disability">, Step> = {
  disabilityType: "disability",
  income: "disability",
  care: "income",
  result: "care",
};

/**
 * 這次使用期間的答案：只放在手機的記憶體裡（不存檔、不上傳）。
 * 從撥號確認頁按返回時，不用重新回答；重新整理或關掉就清除。
 */
let remembered: SubsidyAnswers | null = null;

function isComplete(a: Partial<SubsidyAnswers>): a is SubsidyAnswers {
  return a.disability !== undefined && a.income !== undefined && a.care !== undefined;
}

/**
 * M12 補助小幫手：最多三題大按鈕（都有「不知道」），年齡與原住民身分從台北通帶入。
 * 結果只說「可能可以申請」，最後由社會局審核。
 */
export function SubsidyHelper() {
  const { ready, now, user, a11y, say } = useElder();
  const [answers, setAnswers] = useState<Partial<SubsidyAnswers>>(() => remembered ?? {});
  const [step, setStep] = useState<Step>(() => (remembered ? "result" : "disability"));
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

  const go = (next: Step, nextAnswers: Partial<SubsidyAnswers>) => {
    moved.current = true;
    setAnswers(nextAnswers);
    setStep(next);
    remembered = next === "result" && isComplete(nextAnswers) ? nextAnswers : null;
  };

  const restart = () => go("disability", {});

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
  const known = [age !== null ? `${age} 歲` : "讀不到生日", town, user?.nativePeople ? "原住民" : null].filter(Boolean).join("・");

  return (
    <PageShell title="補助小幫手">
      {step === "result" && isComplete(answers) ? (
        <Results
          headingRef={heading}
          result={findSubsidies(
            { age, nativePeople: user?.nativePeople ?? false, citizen: user?.citizen ?? false },
            answers,
            now,
          )}
          district={district}
          onRestart={restart}
        />
      ) : (
        <Question
          step={step === "result" ? "care" : step}
          known={known}
          headingRef={heading}
          onAnswer={(o) => {
            const { answers: next, next: nextStep } = o.apply(answers);
            go(nextStep, next);
          }}
          onBack={step === "disability" ? null : () => go(PREVIOUS[step], answers)}
        />
      )}
    </PageShell>
  );
}

/* ---------- 問題畫面 ---------- */

function Question({
  step,
  known,
  headingRef,
  onAnswer,
  onBack,
}: {
  step: Exclude<Step, "result">;
  known: string;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onAnswer: (o: Option) => void;
  onBack: (() => void) | null;
}) {
  const q = QUESTIONS[step];
  return (
    <>
      <p className="text-elder-body text-text-second">
        問您最多三個問題，幫您看看可能可以申請哪些補助。從台北通帶入：{known}。您的回答只存在這支手機裡，不會上傳。
      </p>
      <section aria-labelledby="question" className="flex flex-col gap-4">
        <p className="text-elder-body font-bold text-text-second">第 {q.n} 題，共 3 題</p>
        <h2 id="question" ref={headingRef} tabIndex={-1} className="text-elder-title font-bold text-text-primary focus:outline-none">
          {q.title}
        </h2>
        {q.hint && <p className="text-elder-body text-text-primary">{q.hint}</p>}
        <div className="flex flex-col gap-4">
          {q.options.map((o) => (
            <ServiceAction
              key={o.label}
              onPress={() => onAnswer(o)}
              label={o.label}
              className="border-4 border-grayscale-800 bg-white text-text-primary"
            />
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

const HINTS: Record<SubsidyHint, string> = {
  age: "讀不到您的生日，和年齡有關的補助（例如老人生活津貼）先沒有列出。",
  notCitizen: "您的台北通資料顯示不是臺北市民，臺北市的補助先沒有列出。全國的補助可以問 1957。",
  disability: "不確定有沒有身心障礙證明：有證明的人，還可能可以申請身障生活補助、輔具補助、愛心卡。可以問家人，再重新回答。",
  care: "不確定家裡有沒有人需要照顧：如果有，可以打 1966 申請長照，家人也可以幫忙打。",
};

function Results({
  headingRef,
  result,
  district,
  onRestart,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  result: ReturnType<typeof findSubsidies>;
  district: District | null;
  onRestart: () => void;
}) {
  const count = result.apply.length;
  const ltc = getService("ltc-1966");
  const welfare = getService("welfare-1957");

  return (
    <>
      <section aria-labelledby="result" className="flex flex-col gap-3">
        <h2 id="result" ref={headingRef} tabIndex={-1} className="text-elder-title font-bold text-text-primary focus:outline-none">
          {count > 0 ? `您可能可以申請 ${count} 項` : "照您的回答，還沒有找到要申請的補助"}
        </h2>
        <p className="text-elder-body font-bold text-text-primary">{REVIEW_NOTE}</p>
        {count === 0 && <p className="text-elder-body text-text-primary">可以打 1957 或 1999 問問看，也可以重新回答。</p>}
      </section>

      {result.apply.map((m) => (
        <SubsidyCard key={m.subsidy.id} match={m} district={district} />
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
              {HINTS[h]}
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

      {welfare && <ServiceCard service={welfare} />}

      <ServiceAction onPress={onRestart} label="重新回答" className="border-4 border-grayscale-800 bg-white text-text-primary" />

      <p className="rounded-2xl border-4 border-divider p-4 text-elder-body text-text-primary">
        {REVIEW_NOTE}您的回答只存在這支手機裡，不會上傳。金額與資格每年調整，以各卡片上的查證日期為準。
      </p>
    </>
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

function SubsidyCard({ match, district }: { match: SubsidyMatch; district: District | null }) {
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
        <ChannelButtons channels={applyChannels(s, district)} />
      </section>

      <section className="flex flex-col gap-2">
        <h4 className="text-elder-body font-bold text-text-primary">家人可以代辦嗎</h4>
        <ProxyInfo subsidy={s} />
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

      <PrepSheet text={prepSheet(match, district)} />

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

function ProxyInfo({ subsidy: s }: { subsidy: Subsidy }) {
  if (s.proxy.allowed === null) {
    return <p className="text-elder-body text-text-primary">官方頁面沒有寫能不能代辦，請先打電話問。</p>;
  }
  if (!s.proxy.allowed) return <p className="text-elder-body text-text-primary">要本人辦理。</p>;
  return (
    <>
      <p className="text-elder-body text-text-primary">
        {s.proxy.bring.length > 0 ? "可以。家人另外要帶：" : "可以請家人幫忙。"}
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
 * 申請準備單：一段純文字，按「複製」後可以貼到 LINE 傳給家人。
 * 不假設 LINE 的分享網址格式；複製失敗時把文字選起來，讓人手動複製。
 */
function PrepSheet({ text }: { text: string }) {
  const { say } = useElder();
  const [open, setOpen] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const box = useRef<HTMLParagraphElement>(null);

  const copy = async () => {
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch {
      ok = false;
    }
    setCopyFailed(!ok);
    if (ok) {
      say("複製好了。可以貼到 LINE 傳給家人。");
      return;
    }
    // 自動複製不行：把文字選起來，請家人幫忙複製
    const el = box.current;
    const selection = typeof window !== "undefined" ? window.getSelection() : null;
    if (el && selection) selection.selectAllChildren(el);
    say("沒辦法自動複製。文字已經選好了，可以請家人幫忙複製。");
  };

  return (
    <section className="flex flex-col gap-3">
      <ServiceAction
        onPress={() => setOpen(!open)}
        label={open ? "收起申請準備單" : "看申請準備單（可以傳給家人）"}
        row
        className="border-4 border-grayscale-800 bg-white text-text-primary"
      />
      {open && (
        <>
          <p ref={box} className="whitespace-pre-wrap rounded-xl bg-bg-dark p-4 text-elder-body text-text-primary select-text">
            {text}
          </p>
          <ServiceAction onPress={copy} label="複製準備單" row className="bg-elder-benefit text-on-elder-benefit" />
          {copyFailed && (
            <p className="text-elder-body font-bold text-text-primary">
              沒辦法自動複製。上面的文字已經選好了，可以請家人幫忙複製。
            </p>
          )}
        </>
      )}
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
