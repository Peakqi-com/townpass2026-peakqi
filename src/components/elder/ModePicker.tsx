"use client";

import { useRouter } from "next/navigation";
import type { IconName } from "@/lib/elder/home";
import { haptic, speak } from "@/lib/townpass/elder";
import { RATE_LABEL, RATE_VALUE, type ElderMode, type SpeechRate } from "@/lib/elder/profile";
import { Icon } from "./Icon";
import { useElder } from "./ElderProvider";
import { useFocusOnMount } from "./useFocusOnMount";

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
  const { mode: current, setMode, announce, rate, setRate, a11y } = useElder();
  const router = useRouter();
  const heading = useFocusOnMount<HTMLHeadingElement>();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-6">
      <h1 ref={heading} tabIndex={-1} className="text-elder-title font-bold text-text-primary focus:outline-none">
        先選一個最適合您的方式
      </h1>
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

      {current !== null && current !== "hearing" && (
        <section aria-labelledby="rate-heading" className="flex flex-col gap-3">
          <h2 id="rate-heading" className="text-elder-button font-bold text-text-primary">
            唸的速度
          </h2>
          <p className="text-elder-body text-text-second">
            {a11y.screenReader
              ? "您開著報讀軟體，會用報讀軟體自己的速度，這裡的設定不會影響。"
              : "按下去會用那個速度唸一句，聽聽看哪個適合。"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(RATE_LABEL) as SpeechRate[]).map((choice) => (
              <button
                key={choice}
                type="button"
                aria-pressed={choice === rate}
                onClick={() => {
                  setRate(choice);
                  haptic("light");
                  if (!a11y.screenReader) speak(`這是${RATE_LABEL[choice]}的速度`, RATE_VALUE[choice]).catch(() => {});
                }}
                className={`min-h-[4.5rem] rounded-2xl border-4 bg-white px-4 text-elder-button font-bold text-text-primary outline-offset-2 focus-visible:outline focus-visible:outline-[6px] focus-visible:outline-grayscale-900 active:outline active:outline-[6px] active:outline-grayscale-900 ${
                  choice === rate ? "border-grayscale-900" : "border-divider"
                }`}
              >
                {RATE_LABEL[choice]}
                {choice === rate && "（目前）"}
              </button>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
