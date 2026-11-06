"use client";

import { useState, useSyncExternalStore } from "react";
import { getLocation, getUserInfo, isInTownPass, notify } from "@/lib/townpass/bridge";

const noopSubscribe = () => () => {};

/** 雙向溝通示範：確認在 App 內呼叫 userinfo、location、notify，以及後端 API 都正常 */
export function BridgeDemo() {
  // SSR 時一律回 false，hydration 後才讀取真正的值，避免畫面不一致
  const inApp = useSyncExternalStore(noopSubscribe, isInTownPass, () => false);
  const [result, setResult] = useState<string>("尚未執行");
  const [busy, setBusy] = useState(false);

  const run = async (label: string, task: () => Promise<unknown>) => {
    setBusy(true);
    setResult(`${label}：執行中…`);
    try {
      const data = await task();
      setResult(`${label}：\n${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      setResult(`${label}失敗：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="bridge-demo-heading" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="bridge-demo-heading" className="text-h3 font-semibold text-grayscale-900">
          城市通連線測試
        </h2>
        <span
          className={`rounded-full px-3 py-1 text-caption font-semibold ${
            inApp ? "bg-primary-100 text-primary-800" : "bg-secondary-100 text-secondary-800"
          }`}
        >
          {inApp ? "城市通 App 內" : "瀏覽器（使用 mock）"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <DemoButton disabled={busy} onClick={() => run("使用者資料", getUserInfo)}>
          取得使用者資料
        </DemoButton>
        <DemoButton disabled={busy} onClick={() => run("目前位置", getLocation)}>
          取得目前位置
        </DemoButton>
        <DemoButton
          disabled={busy}
          onClick={() => {
            notify("城市通連線測試", "這是一則測試通知");
            setResult("已送出通知（App 不會回覆，請查看手機通知列）");
          }}
        >
          發送測試通知
        </DemoButton>
        <DemoButton
          disabled={busy}
          onClick={() => run("後端 API", () => fetch("/api/health").then((r) => r.json()))}
        >
          呼叫後端 API
        </DemoButton>
      </div>

      <pre
        aria-live="polite"
        className="min-h-24 overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-grayscale-50 p-3 text-caption text-grayscale-800"
      >
        {result}
      </pre>
    </section>
  );
}

function DemoButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      // 觸控目標至少 48×48（無障礙 TS）
      className="min-h-12 rounded-md bg-primary-500 px-3 text-body font-semibold text-white active:bg-primary-600 disabled:bg-grayscale-200 disabled:text-grayscale-500"
    >
      {children}
    </button>
  );
}
