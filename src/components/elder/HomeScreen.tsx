"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { homeEntry, readEntryFlag, writeEntryFlag } from "@/lib/elder/entry";
import { call1999 } from "@/lib/townpass/bridge";
import { familyButtons } from "@/lib/elder/familyConfig";
import { GIFT_TITLE, giftAmountLine } from "@/lib/elder/giftCopy";
import { doubleNinthGift, greetingFor, MODE_NAME, type GiftInfo } from "@/lib/elder/profile";
import { useElder } from "./ElderProvider";
import { BusCard } from "./BusCard";
import { ServiceAction, ServiceLink } from "./ServiceButton";
import { useFamilyConfig } from "./useFamilyConfig";
import { useFocusOnMount } from "./useFocusOnMount";

/** M1 首頁：問候、權益提醒、6 個大按鈕、找服務、固定的 1999／1966／求助 */
export function HomeScreen() {
  const { mode, ready, now, user, textScale } = useElder();
  // 家人代設定過（M7）就用家人挑的按鈕，沒有就用預設的 6 個
  const { config: family } = useFamilyConfig();
  const router = useRouter();

  // 城市通 AppBar 的返回鍵只在 WebView 有上一頁時才出現（見 lib/elder/entry.ts）。
  // - 還沒選模式（pick）：換成 /mode，選完 push 回首頁
  // - 選過模式、剛打開服務（seed）：先換成 /mode，/mode 會馬上 push 回首頁，
  //   紀錄變成 [/mode, /]，按返回就回到選模式的頁面
  // 判斷寫在 effect 裡：Next.js 16 會保留離開過的頁面（不拆掉），回到這頁時 state 還在，
  // 但 effect 會重新執行，所以每次顯示都會用當下的瀏覽紀錄重新判斷。
  const [stay, setStay] = useState(false);
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    // 瀏覽紀錄和 sessionStorage 是外部狀態：和 ElderProvider 讀帳號一樣，在 callback 裡更新 state
    queueMicrotask(() => {
      if (cancelled) return;
      const step = homeEntry({ mode, flag: readEntryFlag(), historyLength: window.history.length });
      if (step === "stay") {
        setStay(true);
        return;
      }
      writeEntryFlag(step === "seed" ? "forward" : "done");
      router.replace("/mode");
    });
    return () => {
      cancelled = true;
    };
  }, [ready, mode, router]);

  if (!ready || !now || mode === null || !stay) return <p className="p-6 text-elder-body text-text-second">載入中…</p>;

  const gift = user
    ? doubleNinthGift({ birthday: user.birthday, citizen: user.citizen, nativePeople: user.nativePeople }, now)
    : null;
  // 字放大到 1.25 倍以上，四個字的標籤在兩欄會斷行：改成單欄、圖示在左，
  // 底部的電話與求助也改放在頁面最下方，不固定在畫面上（避免擋住三分之一的螢幕）
  const large = textScale >= 1.25;
  const hearing = mode === "hearing";

  return (
    <main className={`mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pt-5 ${large ? "pb-6" : "pb-44"}`}>
      <Greeting text={`${greetingFor(now)}${user?.realName ? `，${user.realName}` : ""}`} />

      {gift && <GiftCard gift={gift} />}

      {family?.buses && family.buses.length > 0 && <BusCard buses={family.buses} />}

      <nav aria-label="常用服務">
        <ul className={`grid gap-4 ${large ? "grid-cols-1" : "grid-cols-2"}`}>
          {familyButtons(family).map((button) => (
            <li key={button.id} className="grid">
              <ServiceLink
                href={button.href}
                label={button.label}
                speak={button.speak}
                icon={button.icon}
                row={large}
                className={`${large ? "min-h-[5rem] justify-start px-6" : "min-h-[9rem]"} ${button.className}`}
              />
            </li>
          ))}
        </ul>
      </nav>

      <ServiceLink
        href="/find"
        label={hearing ? "打字找服務" : "說話或打字找服務"}
        icon="search"
        row
        className={`border-4 border-grayscale-800 bg-white text-text-primary ${large ? "justify-start px-6 text-left" : ""}`}
      />

      <ServiceLink
        href="/mode"
        label={`換模式：${MODE_NAME[mode]}`}
        speak={`換模式。現在是${MODE_NAME[mode]}`}
        icon="switch"
        row
        className={`border-4 border-grayscale-800 bg-white text-text-primary ${large ? "justify-start px-6 text-left" : ""}`}
      />

      {/* 電話與求助：每一頁同樣的位置與順序，長輩不用找（WCAG 3.2.6） */}
      <nav
        aria-label="電話與求助"
        className={
          large
            ? ""
            : "fixed inset-x-0 bottom-0 z-40 border-t border-divider bg-white/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"
        }
      >
        <div className={`mx-auto grid max-w-md gap-3 ${large ? "grid-cols-2" : "grid-cols-3"}`}>
          {hearing ? (
            <ServiceLink href="/text" label="1999 文字" speak="1999 文字服務" icon="text" className="bg-grayscale-800 text-white" />
          ) : (
            <ServiceAction onPress={call1999} label="1999" speak="打給 1999 市民熱線" icon="phone" className="bg-grayscale-800 text-white" />
          )}
          <ServiceLink href="/call/ltc-1966" label="1966" speak="1966 長照專線" icon="phone" className="bg-grayscale-800 text-white" />
          <ServiceLink
            href="/help"
            label="求助"
            speak="求助"
            icon="help"
            row={large}
            className={`bg-elder-help text-on-elder-help ${large ? "col-span-2" : ""}`}
          />
        </div>
      </nav>
    </main>
  );
}

/** 首頁標題；載入時把焦點移過來，報讀軟體從問候開始唸 */
function Greeting({ text }: { text: string }) {
  const heading = useFocusOnMount<HTMLHeadingElement>();
  return (
    <h1 ref={heading} tabIndex={-1} className="text-elder-title font-bold text-text-primary focus:outline-none">
      {text}
    </h1>
  );
}

function GiftCard({ gift }: { gift: GiftInfo }) {
  const deadline =
    gift.phase === "apply"
      ? gift.daysLeft === 0
        ? "今天（11/13）截止申請"
        : `還有 ${gift.daysLeft} 天截止（11/13）`
      : `申請期已過，12/31 前可以申請補發`;

  return (
    <section
      aria-labelledby="gift-heading"
      className="flex flex-col gap-3 rounded-2xl border-4 border-elder-benefit bg-white p-4"
    >
      <h2 id="gift-heading" className="text-elder-button font-bold text-text-primary">
        {GIFT_TITLE}
      </h2>
      <p className="text-elder-body text-text-second">
        {giftAmountLine(gift)}
        {deadline}。最後以社會局審核為準。
      </p>
      <ServiceLink
        href="/benefits"
        label="看怎麼申請"
        speak="重陽禮金，看怎麼申請"
        className="bg-elder-benefit text-on-elder-benefit"
      />
    </section>
  );
}
