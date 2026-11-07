"use client";

import { useRouter } from "next/navigation";
import type { IconName } from "@/lib/elder/home";
import type { ElderMode } from "@/lib/elder/profile";
import { Icon } from "./Icon";
import { useElder } from "./ElderProvider";

const OPTIONS: { mode: ElderMode; title: string; detail: string; icon: IconName }[] = [
  { mode: "normal", title: "我看得到，也聽得到", detail: "按下按鈕時會震動，並唸出名稱。", icon: "smile" },
  { mode: "vision", title: "我看不清楚", detail: "字會再放大。有開報讀軟體也可以用。", icon: "eye" },
  { mode: "hearing", title: "我聽不清楚", detail: "不出聲音。每個電話旁邊都有「用文字」。", icon: "ear" },
];

/**
 * 第一次使用時選模式（M1）。模式只改變行為（唸不唸、字多大、電話旁有沒有文字管道），
 * 服務內容都一樣，所以一個入口就能照顧三類人。
 */
export function ModePicker({ afterSelect }: { afterSelect?: `/${string}` }) {
  const { mode: current, setMode, announce } = useElder();
  const router = useRouter();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-6">
      <h1 className="text-elder-title font-bold text-text-primary">先選一個最適合您的方式</h1>
      <p className="text-elder-body text-text-second">之後隨時可以換。</p>
      <ul className="flex flex-col gap-4">
        {OPTIONS.map((option) => {
          const selected = option.mode === current;
          return (
            <li key={option.mode}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setMode(option.mode);
                  announce(option.title);
                  if (afterSelect) router.push(afterSelect);
                }}
                className={`flex w-full items-center gap-4 rounded-2xl border-4 bg-white p-5 text-left outline-offset-2 focus-visible:outline focus-visible:outline-[6px] focus-visible:outline-grayscale-900 active:outline active:outline-[6px] active:outline-grayscale-900 ${
                  selected ? "border-grayscale-900" : "border-divider"
                }`}
              >
                <Icon name={option.icon} className="size-12 shrink-0 text-text-primary" />
                <span className="flex flex-col gap-1">
                  <span className="text-elder-button font-bold text-text-primary">
                    {option.title}
                    {selected && "（目前）"}
                  </span>
                  <span className="text-elder-body text-text-second">{option.detail}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
