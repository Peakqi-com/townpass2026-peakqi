"use client";

import type { Action, Service } from "@/lib/elder/services";
import { useElder } from "./ElderProvider";
import { ServiceAction, ServiceLink } from "./ServiceButton";
import { useRunAction } from "./useRunAction";

/**
 * 一組「怎麼申請」的按鈕（M6 我的權益、M12 補助小幫手共用）。
 * - link：站內頁面，例如撥號確認頁 /benefits/call/…、文字聯絡 /text
 * - run：服務清單的動作，一律交給 useRunAction（撥號確認、失敗提示才會一致）
 *
 * 只能用講的管道（撥號）旁邊一定有文字管道：沒有的話自動補上「用文字問 1999」。
 * 聽不清楚模式把不用講話的管道排在最前面。
 */
export type Channel =
  | { kind: "link"; href: string; label: string; speak?: string; voice?: boolean; text?: boolean }
  | { kind: "run"; service: Service; action: Action; label: string; speak?: string; text?: boolean };
// voice：撥號（只能用講的）。text：不用講話就能聯絡或申請的管道（例如 1957 線上文字諮詢、長照線上申請），
// 有了它就不再自動補「用文字問 1999」

const TEXT_1999: Channel = { kind: "link", href: "/text", label: "用文字問 1999", speak: "用文字問 1999" };

function isVoice(c: Channel): boolean {
  if (c.kind === "link") return Boolean(c.voice);
  return c.action.type === "phone_call" || c.action.type === "1999agree";
}

function isTextPage(c: Channel): boolean {
  return c.kind === "link" ? c.href === "/text" : c.action.type === "page" && c.action.target === "/text";
}

function isText(c: Channel): boolean {
  return isTextPage(c) || Boolean(c.text);
}

/** 顏色：撥號＝深灰、文字聯絡頁＝紫（聽不清楚）、其他（看說明、線上申請）＝綠（權益） */
function toneOf(c: Channel): string {
  if (isVoice(c)) return "bg-grayscale-800 text-white";
  if (isTextPage(c)) return "bg-elder-hearing text-on-elder-hearing";
  return "bg-elder-benefit text-on-elder-benefit";
}

export function ChannelButtons({ channels }: { channels: Channel[] }) {
  const { mode, say } = useElder();
  const run = useRunAction();

  const list = [...channels];
  if (list.some(isVoice) && !list.some(isText)) list.push(TEXT_1999);
  // 同一個文字頁只放一次
  const unique = list.filter((c, i) => !isTextPage(c) || list.findIndex(isTextPage) === i);
  const ordered = mode === "hearing" ? [...unique].sort((a, b) => Number(isVoice(a)) - Number(isVoice(b))) : unique;

  return (
    <div className="flex flex-col gap-3">
      {ordered.map((c, i) =>
        c.kind === "link" ? (
          <ServiceLink
            key={`${c.href}-${i}`}
            href={c.href}
            label={c.label}
            speak={c.speak}
            icon={c.voice ? "phone" : isText(c) ? "text" : undefined}
            row
            className={toneOf(c)}
          />
        ) : (
          <ServiceAction
            key={`${c.action.type}-${i}`}
            onPress={async () => {
              if (!(await run(c.service, c.action))) say("打不開。請試試其他方式，或請家人幫忙。");
            }}
            label={c.label}
            speak={c.speak}
            icon={isVoice(c) ? "phone" : isText(c) ? "text" : undefined}
            row
            className={toneOf(c)}
          />
        ),
      )}
    </div>
  );
}
