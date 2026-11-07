"use client";

import { useState } from "react";
import type { IconName } from "@/lib/elder/home";
import type { Action, Category, Service } from "@/lib/elder/services";
import { Icon } from "./Icon";
import { useElder } from "./ElderProvider";
import { useRunAction } from "./useRunAction";

/** 服務類別的顏色（elder-mode-spec.md §4.1）。className 要寫完整字串，Tailwind 才會產生 */
export const CATEGORY_STYLE: Record<Category, { className: string; icon: IconName }> = {
  health: { className: "bg-elder-health text-on-elder-health", icon: "health" },
  ride: { className: "bg-elder-ride text-on-elder-ride", icon: "ride" },
  benefit: { className: "bg-elder-benefit text-on-elder-benefit", icon: "benefit" },
  community: { className: "bg-elder-community text-on-elder-community", icon: "community" },
  family: { className: "bg-elder-family text-on-elder-family", icon: "family" },
  text: { className: "bg-elder-hearing text-on-elder-hearing", icon: "text" },
  help: { className: "bg-grayscale-800 text-white", icon: "phone" },
  vision: { className: "bg-grayscale-800 text-white", icon: "eye" },
};

const BUTTON =
  "flex min-h-[4.5rem] w-full items-center justify-center gap-3 rounded-2xl px-5 py-3 text-center text-elder-button font-bold " +
  "outline-offset-2 active:outline active:outline-[6px] active:outline-grayscale-900 focus-visible:outline focus-visible:outline-[6px] focus-visible:outline-grayscale-900";

function iconFor(action: Action): IconName {
  switch (action.type) {
    case "phone_call":
    case "1999agree":
      return "phone";
    case "page":
      return "search";
    default:
      return "text";
  }
}

function defaultLabel(service: Service, action: Action): string {
  if (action.label) return action.label;
  if (action.type === "page") return `打開「${service.title}」`;
  return service.title;
}

/**
 * 一筆服務的大字卡片：名稱、一句話說明、主要按鈕、備援與文字管道、出處。
 * 聽不清楚模式：文字管道排在最前面；只能用講的服務會明白說出來。
 */
export function ServiceCard({ service, headingLevel = 2 }: { service: Service; headingLevel?: 2 | 3 }) {
  const { mode, announce, say } = useElder();
  const run = useRunAction();
  const [failed, setFailed] = useState(false);
  const hearing = mode === "hearing";
  const style = CATEGORY_STYLE[service.category];
  const Heading = headingLevel === 2 ? "h2" : "h3";

  const isVoiceOnly = (a: Action) => a.type === "phone_call" || a.type === "1999agree";
  const alts = service.alt_channels ?? [];

  const press = async (action: Action, label: string) => {
    announce(label);
    const ok = await run(service, action);
    setFailed(!ok);
    if (!ok) say("打不開。請試試其他方式，或請家人幫忙。");
  };

  type Item = { action: Action; label: string; primary: boolean };
  const main: Item = { action: service.action, label: defaultLabel(service, service.action), primary: true };
  const others: Item[] = [
    ...(service.fallback ? [{ action: service.fallback, label: defaultLabel(service, service.fallback), primary: false }] : []),
    ...alts.map((a) => ({ action: a as Action, label: a.label, primary: false })),
  ];
  // 聽不清楚模式：不用講話的管道排前面
  const items = hearing
    ? [main, ...others].sort((a, b) => Number(isVoiceOnly(a.action)) - Number(isVoiceOnly(b.action)))
    : [main, ...others];
  const voiceOnly = isVoiceOnly(service.action) && alts.length === 0;

  return (
    <article className="flex flex-col gap-3 rounded-2xl border-4 border-divider bg-white p-4">
      <Heading className="flex items-center gap-3 text-elder-button font-bold text-text-primary">
        <Icon name={style.icon} className="size-9 shrink-0" />
        {service.title}
      </Heading>
      <p className="text-elder-body text-text-second">{service.description}</p>

      {hearing && voiceOnly && (
        <p className="rounded-xl bg-bg-dark p-3 text-elder-body text-text-primary">
          這項服務目前只能用講的。可以請家人代打，或改用文字問 1999。
        </p>
      )}

      <div className="flex flex-col gap-3">
        {items.map((item, i) => (
          <button
            key={`${item.action.type}-${i}`}
            type="button"
            onClick={() => press(item.action, item.label)}
            className={`${BUTTON} ${
              i === 0 ? style.className : "border-4 border-grayscale-800 bg-white text-text-primary"
            }`}
          >
            <Icon name={iconFor(item.action)} className="size-8 shrink-0" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* 不加 role="alert"：上面已經 say() 過，加了會被報讀軟體唸兩次 */}
      {failed && (
        <p className="text-elder-body font-bold text-alarm">
          打不開。請試試下面其他的方式，或請家人幫忙。
        </p>
      )}

      <p className="text-h3 text-text-second">
        {service.owner}・
        <a href={service.source} className="underline underline-offset-2">
          官方說明
        </a>
        （{service.verified} 查證）
      </p>
    </article>
  );
}
