"use client";

import { useEffect, useRef, useState } from "react";
import { haptic, startListening, type ListenSession } from "@/lib/townpass/elder";
import { findServices } from "@/lib/elder/match";
import { getService, SERVICES, type Category, type Service } from "@/lib/elder/services";
import { CATEGORY_STYLE, ServiceCard } from "./ServiceCard";
import { Icon } from "./Icon";
import { PageShell } from "./PageShell";
import { useElder } from "./ElderProvider";
import { FailNote, useFailNote } from "./FailNote";

/** 點選用的分類（不用說、也不用打字的路） */
const BROWSE: { category: Category; label: string }[] = [
  { category: "health", label: "看病" },
  { category: "ride", label: "交通" },
  { category: "benefit", label: "錢與福利" },
  { category: "community", label: "吃飯上課" },
  { category: "text", label: "聽不清楚" },
  { category: "vision", label: "看不清楚" },
  { category: "help", label: "求助與防詐" },
];

const LISTEN_ERRORS: Record<string, string> = {
  not_in_app: "說話功能要在台北通裡才能用。請改用打字或點選。",
  offline_unavailable: "這支手機不能在手機裡直接聽懂說話。請改用打字或點選。",
  permission_denied: "沒有麥克風權限。請改用打字或點選，或請家人幫忙打開權限。",
  forbidden: "說話功能暫時不能用。請改用打字或點選。",
};

type ListenState = "idle" | "starting" | "listening";

/**
 * M2 找服務：打字、說話、點選三條路，結果最多三個大卡片。
 * 不使用 AI 模型：說話由手機在裝置端轉成文字，再用關鍵字比對服務清單（src/lib/elder/match.ts）。
 */
export function FindScreen() {
  const { mode, say } = useElder();
  const note = useFailNote();
  const hearing = mode === "hearing";
  const [text, setText] = useState("");
  const [query, setQuery] = useState<string | null>(null);
  const [results, setResults] = useState<Service[]>([]);
  const [browse, setBrowse] = useState<Category | null>(null);
  const [listen, setListen] = useState<ListenState>("idle");
  const session = useRef<ListenSession | null>(null);

  // 離開頁面時取消收音
  useEffect(() => () => session.current?.cancel(), []);

  const search = (value: string) => {
    const q = value.trim();
    if (!q) return;
    const found = findServices(q, { mode });
    setQuery(q);
    setResults(found);
    setBrowse(null);
    say(found.length > 0 ? `找到 ${found.length} 個：${found.map((s) => s.title).join("、")}` : "找不到。可以換個說法，或問 1999。");
  };

  const toggleListening = () => {
    if (session.current) {
      // 停止說話：送出 stop，等手機回傳辨識結果
      haptic("light");
      session.current.stop();
      return;
    }
    // 開始收音前只震動、不出聲，避免把提示音或報讀軟體的聲音錄進去
    haptic("medium");
    note.clear();
    setListen("starting");
    session.current = startListening({
      onListening: () => setListen("listening"),
      onText: (heard) => {
        session.current = null;
        setListen("idle");
        setText(heard);
        search(heard);
      },
      onError: (code) => {
        session.current = null;
        setListen("idle");
        note.fail(LISTEN_ERRORS[code] ?? "沒有聽清楚。請再說一次，或改用打字。");
      },
    });
  };

  const fallback = getService(hearing ? "page-text" : "citizen-1999");
  const browseList = browse ? SERVICES.filter((s) => s.category === browse) : [];

  return (
    <PageShell title="找服務">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          search(text);
        }}
        className="flex flex-col gap-3"
      >
        <label htmlFor="find-input" className="text-elder-body font-bold text-text-primary">
          {hearing ? "想做什麼？用打的就可以" : "想做什麼？用打的或用說的"}
        </label>
        <div className="flex gap-3">
          <input
            id="find-input"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="例如：我要叫車"
            className="min-h-[4.5rem] min-w-0 flex-1 rounded-2xl border-4 border-grayscale-800 bg-white px-4 text-elder-button text-text-primary placeholder:text-text-second"
          />
          <button
            type="submit"
            className="min-h-[4.5rem] shrink-0 rounded-2xl bg-grayscale-800 px-6 text-elder-button font-bold text-white outline-offset-2 focus-visible:outline focus-visible:outline-[6px] focus-visible:outline-grayscale-900 active:outline active:outline-[6px] active:outline-grayscale-900"
          >
            找
          </button>
        </div>
      </form>

      {!hearing && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            aria-pressed={listen !== "idle"}
            onClick={toggleListening}
            className={`flex min-h-[5rem] items-center justify-center gap-3 rounded-2xl px-5 text-elder-button font-bold outline-offset-2 focus-visible:outline focus-visible:outline-[6px] focus-visible:outline-grayscale-900 active:outline active:outline-[6px] active:outline-grayscale-900 ${
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
          <FailNote message={note.at()} />
        </div>
      )}

      {query !== null && (
        <section aria-labelledby="result-heading" className="flex flex-col gap-4">
          <h2 id="result-heading" className="text-elder-button font-bold text-text-primary">
            {results.length > 0 ? `你是說：「${query}」？` : `找不到「${query}」`}
          </h2>
          {results.length === 0 && (
            <p className="text-elder-body text-text-second">可以換個說法，或直接問市政府。</p>
          )}
          {(results.length > 0 ? results : fallback ? [fallback] : []).map((service) => (
            <ServiceCard key={service.id} service={service} headingLevel={3} />
          ))}
        </section>
      )}

      <section aria-labelledby="browse-heading" className="flex flex-col gap-3">
        <h2 id="browse-heading" className="text-elder-button font-bold text-text-primary">
          或是用點的
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {BROWSE.map(({ category, label }) => (
            <button
              key={category}
              type="button"
              aria-pressed={browse === category}
              onClick={() => {
                setBrowse(category);
                setQuery(null);
                const count = SERVICES.filter((s) => s.category === category).length;
                say(`${label}，有 ${count} 項服務`);
              }}
              className={`flex min-h-[4.5rem] items-center justify-center gap-2 rounded-2xl px-3 text-elder-body font-bold outline-offset-2 focus-visible:outline focus-visible:outline-[6px] focus-visible:outline-grayscale-900 active:outline active:outline-[6px] active:outline-grayscale-900 ${CATEGORY_STYLE[category].className} ${
                browse === category ? "outline outline-[6px] outline-grayscale-900" : ""
              }`}
            >
              <Icon name={CATEGORY_STYLE[category].icon} className="size-7 shrink-0" />
              {label}
            </button>
          ))}
        </div>
        {browseList.map((service) => (
          <ServiceCard key={service.id} service={service} headingLevel={3} />
        ))}
      </section>
    </PageShell>
  );
}
