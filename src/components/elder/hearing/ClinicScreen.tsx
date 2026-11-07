"use client";

import { useState } from "react";
import { CLINIC_MAIN_CARD, CLINIC_QUESTIONS, TEXT_CHANNELS } from "@/lib/elder/hearing";
import { buildInterpreterRequest, dateInputValue, leadTimeNotice, smsUri, type InterpreterRequestInput } from "@/lib/elder/messages";
import { getService } from "@/lib/elder/services";
import { openExternal } from "@/lib/townpass/elder";
import { useElder } from "../ElderProvider";
import { FailNote, useFailNote } from "../FailNote";
import { PageShell } from "../PageShell";
import { ServiceAction } from "../ServiceButton";
import { useRunAction } from "../useRunAction";
import {
  CopyButton,
  FullScreenCard,
  INPUT,
  LABEL,
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
  SourceList,
  toggleClass,
  type BigCard,
} from "./parts";

/**
 * /card/clinic 看診溝通卡（M8）：
 * 1. 「我聽力不好，請面向我、說慢一點，或寫下來」大字卡，可以全螢幕給醫護看
 * 2. 常用問答卡：醫護或長輩點選答案，答案用大字集中顯示
 * 3. 預約手語翻譯：帶入姓名，選日期與地點，產生申請文字 → 複製／傳簡訊／線上申辦
 */
export function ClinicScreen() {
  const { user, announce } = useElder();
  const [card, setCard] = useState<BigCard | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const mainCard: BigCard = {
    text: CLINIC_MAIN_CARD,
    sub: user?.realName ? `我是 ${user.realName}` : undefined,
  };
  const answered = CLINIC_QUESTIONS.filter((q) => answers[q.id]);

  return (
    <PageShell title="看診溝通卡">
      <div className="flex flex-col gap-3 rounded-3xl border-8 border-grayscale-900 bg-white p-5 text-center">
        <p className="break-words text-elder-title font-bold text-grayscale-900">{CLINIC_MAIN_CARD}</p>
        {mainCard.sub && <p className="text-elder-button text-text-primary">{mainCard.sub}</p>}
      </div>
      <button
        type="button"
        onClick={() => {
          announce("全螢幕給醫護看");
          setCard(mainCard);
        }}
        className={`${PRIMARY_BUTTON} bg-elder-hearing text-on-elder-hearing`}
      >
        全螢幕給醫護看
      </button>

      <section aria-labelledby="qa-heading" className="flex flex-col gap-4">
        <h2 id="qa-heading" className="text-elder-button font-bold text-text-primary">
          常用問答
        </h2>
        <p className="text-elder-body text-text-second">醫護或您自己點選答案，答案會集中用大字顯示在下面。</p>

        {CLINIC_QUESTIONS.map((q) => (
          <fieldset key={q.id} className="flex flex-col gap-2">
            <legend className="mb-2 text-elder-button font-bold text-text-primary">{q.question}</legend>
            <div className="grid grid-cols-2 gap-2">
              {q.options.map((option) => {
                const pressed = answers[q.id] === option;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={pressed}
                    onClick={() => {
                      announce(option);
                      setAnswers((prev) => {
                        const next = { ...prev };
                        if (pressed) delete next[q.id];
                        else next[q.id] = option;
                        return next;
                      });
                    }}
                    className={toggleClass(pressed)}
                  >
                    {pressed && <span aria-hidden="true">✓</span>}
                    {option}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

        <div className="flex flex-col gap-3 rounded-2xl border-4 border-grayscale-800 bg-bg-dark p-4">
          <h3 className="text-elder-button font-bold text-text-primary">目前的回答</h3>
          {answered.length === 0 ? (
            <p className="text-elder-body text-text-second">還沒有選答案。</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {answered.map((q) => (
                <li key={q.id} className="text-elder-button text-text-primary">
                  {q.question}
                  <strong className="block text-elder-title">{answers[q.id]}</strong>
                </li>
              ))}
            </ul>
          )}
          {answered.length > 0 && (
            <button
              type="button"
              onClick={() => {
                announce("全部清除");
                setAnswers({});
              }}
              className={SECONDARY_BUTTON}
            >
              全部清除
            </button>
          )}
        </div>
      </section>

      <InterpreterRequest />

      <FullScreenCard card={card} onClose={() => setCard(null)} />
    </PageShell>
  );
}

const SIGN = TEXT_CHANNELS.find((c) => c.id === "sign-language");
const SIGN_SMS = "0963047723";

/** 一鍵預約手語翻譯或同步聽打：產生申請文字，送出由使用者自己按 */
function InterpreterRequest() {
  const { user, now, announce } = useElder();
  const note = useFailNote();
  const run = useRunAction();
  const signService = getService("sign-language");

  const [service, setService] = useState<InterpreterRequestInput["service"]>("手語翻譯");
  // null 表示還沒改過，沿用城市通帳號的姓名（帳號是非同步讀進來的）
  const [nameInput, setNameInput] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [place, setPlace] = useState("");
  const [purpose, setPurpose] = useState("看診");

  const name = nameInput ?? user?.realName ?? "";
  const text = buildInterpreterRequest({ service, name, phone: user?.phoneNo, date, time, place, purpose });
  const notice = now ? leadTimeNotice(date, now) : null;

  return (
    <section aria-labelledby="interpreter-heading" className="flex flex-col gap-4">
      <h2 id="interpreter-heading" className="text-elder-button font-bold text-text-primary">
        預約手語翻譯
      </h2>
      <p className="text-elder-body text-text-second">選好日期和地點，幫您寫好申請文字。原則上要 3 天前申請。</p>

      <fieldset className="flex flex-col gap-2">
        <legend className={`${LABEL} mb-2`}>要申請什麼？</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["手語翻譯", "同步聽打"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={service === s}
              onClick={() => {
                announce(s);
                setService(s);
              }}
              className={toggleClass(service === s)}
            >
              {service === s && <span aria-hidden="true">✓</span>}
              {s}
            </button>
          ))}
        </div>
      </fieldset>

      <Field id="req-name" label="姓名">
        <input id="req-name" value={name} onChange={(e) => setNameInput(e.target.value)} autoComplete="name" className={INPUT} />
      </Field>
      <Field id="req-date" label="日期">
        <input
          id="req-date"
          type="date"
          value={date}
          min={now ? dateInputValue(now) : undefined}
          onChange={(e) => setDate(e.target.value)}
          aria-describedby={notice ? "req-date-notice" : undefined}
          className={INPUT}
        />
      </Field>
      {notice && (
        <p id="req-date-notice" className="rounded-xl border-4 border-reminder bg-white p-3 text-elder-body font-bold text-text-primary">
          {notice}
        </p>
      )}
      <Field id="req-time" label="時間（可以不填）">
        <input id="req-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={INPUT} />
      </Field>
      <Field id="req-place" label="地點">
        <input
          id="req-place"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder="例如：哪一家醫院、哪一科"
          className={INPUT}
        />
      </Field>
      <Field id="req-purpose" label="事由">
        <input id="req-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} className={INPUT} />
      </Field>

      <div className="flex flex-col gap-2">
        <p className={LABEL}>申請文字</p>
        <p className="whitespace-pre-wrap break-words rounded-2xl border-4 border-grayscale-800 bg-bg-dark p-4 text-elder-body font-bold text-text-primary">
          {text}
        </p>
        <p className="text-h3 text-text-second">格式是我們整理的，承辦單位可能會再問您細節。送出前請再看一次。</p>
      </div>

      <CopyButton text={text} label="複製申請文字" done="複製好了，可以貼到 LINE，傳給 0963-047-723。" />
      <button
        type="button"
        onClick={async () => {
          announce("用簡訊傳給承辦單位");
          note.clear();
          if (!(await openExternal(smsUri(SIGN_SMS, text)))) note.fail("打不開簡訊。請複製後貼到 LINE。", "sms");
        }}
        className={SECONDARY_BUTTON}
      >
        用簡訊傳給 0963-047-723
      </button>
      <FailNote message={note.at("sms")} />
      {signService && (
        <ServiceAction
          onPress={async () => {
            note.clear();
            if (!(await run(signService, signService.action))) note.fail("打不開。請改用 LINE 或簡訊。", "online");
          }}
          label="線上申辦（要登入）"
          icon="text"
          row
          className="bg-elder-hearing text-on-elder-hearing"
        />
      )}
      <FailNote message={note.at("online")} />
      <p className="text-elder-body text-text-second">LINE ID 也是 0963-047-723。按簡訊只會打開簡訊 App，要您自己按送出。</p>
      {SIGN && <SourceList sources={SIGN.sources} owner={SIGN.owner} />}
    </section>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      {children}
    </div>
  );
}
