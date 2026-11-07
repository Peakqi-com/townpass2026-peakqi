"use client";

import { useEffect, useRef, useState } from "react";
import { haptic, startListening, type ListenSession } from "@/lib/townpass/elder";
import { judge, resultFor, SCAMS, STEPS, type AntifraudResult } from "@/lib/elder/antifraud";
import { getService } from "@/lib/elder/services";
import { FamilyCallConfirm } from "./FamilyScreen";
import { Icon } from "./Icon";
import { PageShell } from "./PageShell";
import { useElder } from "./ElderProvider";
import { ServiceAction, ServiceLink } from "./ServiceButton";
import { ServiceCard } from "./ServiceCard";
import { useFamilyConfig } from "./useFamilyConfig";
import { FOCUS, INPUT, LABEL, SECONDARY_BUTTON } from "./hearing/parts";

const LISTEN_ERRORS: Record<string, string> = {
  not_in_app: "說話功能要在台北通裡才能用。請改用打字或點選。",
  offline_unavailable: "這支手機不能在手機裡直接聽懂說話。請改用打字或點選。",
  permission_denied: "沒有麥克風權限。請改用打字或點選，或請家人幫忙打開權限。",
  forbidden: "說話功能暫時不能用。請改用打字或點選。",
};

const SOURCE_OWNER = "內政部警政署 165 全民防騙網";

type ListenState = "idle" | "starting" | "listening";

interface Asked {
  result: AntifraudResult;
  /** 長輩打的字或說的話；點按鈕時是 null */
  text: string | null;
  /** 每問一次加一，讓結果畫面重新掛載、焦點移到新的 h1 */
  round: number;
}

/**
 * M11 防詐先問一下：點選或打出「對方說了什麼」→ 在手機裡比對常見詐騙說法（src/lib/elder/antifraud.ts）
 * → 「這很像〇〇詐騙」＋官方提醒 → 先掛電話 → 打給家人 → 打 165。
 * 不用 AI 模型、不呼叫網路。**永遠不說「這不是詐騙」「安全」**。
 */
export function AntifraudScreen() {
  const { a11y, say } = useElder();
  const { config } = useFamilyConfig();
  const [asked, setAsked] = useState<Asked | null>(null);
  const [calling, setCalling] = useState<number | null>(null);
  const round = useRef(0);
  const contacts = config?.contacts ?? [];
  const contact = calling === null ? undefined : contacts[calling];

  const show = (result: AntifraudResult, text: string | null) => {
    round.current += 1;
    setCalling(null);
    setAsked({ result, text, round: round.current });
    // 結果畫面掛載時焦點會移到標題，報讀軟體會自己唸；開著報讀軟體時不再 say，免得唸兩次
    if (!a11y.screenReader) say(result.speech);
  };

  if (contact) {
    return <FamilyCallConfirm key={`call-${calling}`} contact={contact} onCancel={() => setCalling(null)} />;
  }
  if (asked) {
    return (
      <ResultView
        key={`result-${asked.round}`}
        asked={asked}
        onCall={setCalling}
        // 按鈕本身已經唸過「再問一次」，回到第一個畫面時焦點移到標題，不再另外 say
        onAgain={() => setAsked(null)}
      />
    );
  }
  return <AskView key="ask" onResult={show} />;
}

/** 第一個畫面：對方說了什麼？點選、打字或說話 */
function AskView({ onResult }: { onResult: (result: AntifraudResult, text: string | null) => void }) {
  const { mode, say } = useElder();
  const hearing = mode === "hearing";
  const [text, setText] = useState("");
  const [listen, setListen] = useState<ListenState>("idle");
  const session = useRef<ListenSession | null>(null);

  // 離開畫面時取消收音
  useEffect(() => () => session.current?.cancel(), []);

  const ask = (value: string) => {
    const q = value.trim();
    if (!q) {
      say("請先打字，或點上面的按鈕。");
      return;
    }
    onResult(judge(q), q);
  };

  const toggleListening = () => {
    if (session.current) {
      haptic("light");
      session.current.stop();
      return;
    }
    // 開始收音前只震動、不出聲，避免把提示音或報讀軟體的聲音錄進去
    haptic("medium");
    setListen("starting");
    session.current = startListening({
      onListening: () => setListen("listening"),
      onText: (heard) => {
        session.current = null;
        setListen("idle");
        setText(heard);
        ask(heard);
      },
      onError: (code) => {
        session.current = null;
        setListen("idle");
        say(LISTEN_ERRORS[code] ?? "沒有聽清楚。請再說一次，或改用打字。");
      },
    });
  };

  return (
    <PageShell title="先問一下：這是不是詐騙？">
      <p className="text-elder-body text-text-primary">
        接到奇怪的電話或訊息，先別照著做。點一個最像對方說的話。
      </p>

      <section aria-labelledby="choices-heading" className="flex flex-col gap-3">
        <h2 id="choices-heading" className="text-elder-button font-bold text-text-primary">
          對方說了什麼？
        </h2>
        <div className="flex flex-col gap-3">
          {SCAMS.map((scam) => (
            <button
              key={scam.id}
              type="button"
              onClick={() => {
                // 結果會馬上唸出來（第一句就是標題），這裡只震動，避免連唸兩句
                haptic("light");
                onResult(resultFor(scam.id), null);
              }}
              className={SECONDARY_BUTTON}
            >
              {scam.choice}
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="type-heading" className="flex flex-col gap-3">
        <h2 id="type-heading" className="text-elder-button font-bold text-text-primary">
          {hearing ? "或是用打的" : "或是用打的、用說的"}
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(text);
          }}
          className="flex flex-col gap-3"
        >
          <label htmlFor="antifraud-input" className={LABEL}>
            對方說了什麼
          </label>
          <div className="flex gap-3">
            <input
              id="antifraud-input"
              type="text"
              enterKeyHint="send"
              autoComplete="off"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="例如：說我的帳戶涉及洗錢"
              className={`${INPUT} flex-1`}
            />
            <button
              type="submit"
              className={`min-h-[4.5rem] shrink-0 rounded-2xl bg-grayscale-800 px-6 text-elder-button font-bold text-white ${FOCUS}`}
            >
              問
            </button>
          </div>
        </form>

        {!hearing && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              aria-pressed={listen !== "idle"}
              onClick={toggleListening}
              className={`flex min-h-[5rem] items-center justify-center gap-3 rounded-2xl px-5 text-elder-button font-bold ${FOCUS} ${
                listen === "idle" ? "border-4 border-grayscale-800 bg-white text-text-primary" : "bg-elder-help text-on-elder-help"
              }`}
            >
              <Icon name={listen === "idle" ? "search" : "help"} className="size-9 shrink-0" />
              {listen === "idle" ? "開始說話" : "停止說話"}
            </button>
            <p className="text-elder-body text-text-second">
              {listen === "listening"
                ? "正在聽。說完再按一次「停止說話」。"
                : listen === "starting"
                  ? "準備中…"
                  : "按一下開始，說完再按一次停止。聲音只在手機裡辨識，不會上傳。"}
            </p>
          </div>
        )}
      </section>

      <p className="text-elder-body text-text-second">
        只在這支手機裡比對，不會上傳。這裡只是先幫您看看，有疑問就問家人或 165。
      </p>
    </PageShell>
  );
}

/** 結果畫面：像哪一種詐騙＋官方提醒 → 先這樣做 → 問家人 → 問 165 */
function ResultView({ asked, onCall, onAgain }: { asked: Asked; onCall: (index: number) => void; onAgain: () => void }) {
  const { mode } = useElder();
  const { config } = useFamilyConfig();
  const hearing = mode === "hearing";
  const contacts = config?.contacts ?? [];
  const antifraud = getService("antifraud-165");
  const { result, text } = asked;

  return (
    <PageShell title={result.headline}>
      {text && <p className="text-elder-body text-text-second">您說：「{text}」</p>}

      <div className="flex flex-col gap-3">
        {result.lines.map((line) => (
          <p key={line} className="text-elder-button font-bold text-text-primary">
            {line}
          </p>
        ))}
        {result.scams.map((scam) => (
          <p key={scam.id} className="text-h3 text-text-second">
            {scam.name}：{SOURCE_OWNER}・
            <a href={scam.source} className="underline underline-offset-2">
              官方說明
            </a>
            （{scam.verified} 查證）
          </p>
        ))}
      </div>

      <section aria-labelledby="steps-heading" className="flex flex-col gap-3 rounded-2xl border-4 border-alarm bg-white p-4">
        <h2 id="steps-heading" className="text-elder-button font-bold text-text-primary">
          現在先這樣做
        </h2>
        <ol className="flex list-decimal flex-col gap-2 pl-8 text-elder-body font-bold text-text-primary">
          {STEPS.map((step) => (
            <li key={step.id}>{step.text}</li>
          ))}
        </ol>
        <p className="text-h3 text-text-second">
          {SOURCE_OWNER}・
          <a href={STEPS[0].source} className="underline underline-offset-2">
            官方說明
          </a>
          （{STEPS[0].verified} 查證）
        </p>
      </section>

      <section aria-labelledby="family-heading" className="flex flex-col gap-3">
        <h2 id="family-heading" className="text-elder-button font-bold text-text-primary">
          問家人
        </h2>
        {contacts.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {contacts.map((c, i) => (
              <li key={`${c.phone}-${i}`}>
                <ServiceAction
                  onPress={() => onCall(i)}
                  label={hearing ? `傳簡訊或打給${c.name}` : `打給${c.name}`}
                  icon={hearing ? "text" : "phone"}
                  row
                  className="bg-elder-family text-on-elder-family"
                />
              </li>
            ))}
          </ul>
        ) : (
          <>
            <p className="text-elder-body text-text-second">
              還沒有設定家人的電話。請家人幫您設定，下次就能直接按按鈕打給家人。
            </p>
            <ServiceLink href="/family" label="請家人幫我設定" icon="family" row className="bg-elder-family text-on-elder-family" />
          </>
        )}
      </section>

      <section aria-labelledby="call165-heading" className="flex flex-col gap-3">
        <h2 id="call165-heading" className="text-elder-button font-bold text-text-primary">
          問 165
        </h2>
        {hearing && (
          <p className="rounded-2xl bg-bg-dark p-4 text-elder-body text-text-primary">
            165 專線只能用講的，可以請家人代打。165 的 LINE 官方帳號可以查網址有沒有被通報。
          </p>
        )}
        {antifraud && <ServiceCard service={antifraud} headingLevel={3} />}
      </section>

      <ServiceAction
        onPress={onAgain}
        label="再問一次"
        icon="search"
        row
        className="border-4 border-grayscale-800 bg-white text-text-primary"
      />
    </PageShell>
  );
}
