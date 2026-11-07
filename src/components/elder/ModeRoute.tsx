"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { modeEntry, readEntryFlag, writeEntryFlag } from "@/lib/elder/entry";
import { useElder } from "./ElderProvider";
import { ModePicker } from "./ModePicker";

/**
 * /mode 頁。首頁剛把紀錄換成 /mode（flag = "forward"）時，馬上 push 回首頁，
 * 不顯示選模式畫面，也不搶報讀焦點；之後使用者按返回或點「換模式」進來，才顯示選模式畫面。
 * 詳見 lib/elder/entry.ts。
 *
 * 判斷寫在 effect 裡：Next.js 16 會保留離開過的頁面，按返回回到這頁時 state 還在，
 * 但 effect 會重新執行，這時 flag 已經是 "done"，就會顯示選模式畫面。
 */
export function ModeRoute() {
  const { ready, mode } = useElder();
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    // sessionStorage 是外部狀態：和 ElderProvider 讀帳號一樣，在 callback 裡更新 state
    queueMicrotask(() => {
      if (cancelled) return;
      if (modeEntry({ mode, flag: readEntryFlag() }) === "forward") {
        writeEntryFlag("done");
        router.push("/");
        return;
      }
      setShow(true);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, mode, router]);

  if (!show) return <p className="p-6 text-elder-body text-text-second">載入中…</p>;
  return <ModePicker afterSelect="/" />;
}
