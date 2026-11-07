"use client";

import { useRef, useState } from "react";
import { getA11yState, haptic, openExternal, speak, startListening, type ListenSession } from "@/lib/townpass/elder";

/**
 * 長輩模式 App 能力（M0）的實機測試。需要安裝了長輩模式 Handler 的城市通 App。
 * 舊版 App 沒有這些 Handler：讀取無障礙狀態會回傳預設值，其他按鈕會逾時。
 */
export function ElderBridgeDemo() {
  const [result, setResult] = useState("尚未執行");
  const [listening, setListening] = useState(false);
  const session = useRef<ListenSession | null>(null);

  const run = async (label: string, task: () => Promise<unknown>) => {
    setResult(`${label}：執行中…`);
    try {
      setResult(`${label}：\n${JSON.stringify(await task(), null, 2)}`);
    } catch (error) {
      setResult(`${label}失敗：${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const toggleListening = () => {
    if (session.current) {
      session.current.stop();
      session.current = null;
      setResult("語音辨識：辨識中…");
      return;
    }
    setListening(true);
    session.current = startListening({
      onListening: () => setResult("語音辨識：正在聽，說完再按一次「結束」"),
      onText: (text) => {
        session.current = null;
        setListening(false);
        setResult(`語音辨識結果：\n${text}`);
      },
      onError: (code) => {
        session.current = null;
        setListening(false);
        setResult(`語音辨識失敗：${code}`);
      },
    });
  };

  return (
    <section aria-labelledby="elder-demo-heading" className="flex flex-col gap-4">
      <h2 id="elder-demo-heading" className="text-h3 font-semibold text-text-primary">
        長輩模式 App 能力測試
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <DemoButton onClick={() => run("無障礙狀態", () => getA11yState())}>讀取無障礙狀態</DemoButton>
        <DemoButton onClick={() => run("唸出", () => speak("我要叫車"))}>唸出「我要叫車」</DemoButton>
        <DemoButton
          onClick={() => {
            haptic("medium");
            setResult("已送出震動（手機應該會震一下）");
          }}
        >
          震動
        </DemoButton>
        <DemoButton onClick={() => run("開啟撥號畫面", () => openExternal("tel:1999"))}>
          開啟撥號畫面（不會撥出）
        </DemoButton>
        <DemoButton onClick={() => run("外部瀏覽器", () => openExternal("https://www.gov.taipei/"))}>
          用外部瀏覽器開市府網站
        </DemoButton>
        <DemoButton onClick={toggleListening}>{listening ? "結束說話" : "開始說話（離線辨識）"}</DemoButton>
      </div>

      <pre
        aria-live="polite"
        className="min-h-24 overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-bg-dark p-3 text-caption text-text-primary"
      >
        {result}
      </pre>
    </section>
  );
}

function DemoButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-12 rounded-md bg-primary-500 px-3 text-body font-semibold text-white active:bg-primary-600"
    >
      {children}
    </button>
  );
}
