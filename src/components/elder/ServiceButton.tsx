"use client";

import Link from "next/link";
import type { IconName } from "@/lib/elder/home";
import { Icon } from "./Icon";
import { useElder } from "./ElderProvider";

/**
 * 長輩模式的大按鈕：圖示＋文字，按下時震動、唸出名稱、顯示大字。
 * 按下的狀態用粗框表示，不靠變色（色覺退化的長輩分不出顏色變化）。
 */
const BASE =
  "flex min-h-[4.5rem] flex-col items-center justify-center gap-2 rounded-2xl p-4 text-center text-elder-button font-bold " +
  "outline-offset-2 active:outline active:outline-[6px] active:outline-grayscale-900 focus-visible:outline focus-visible:outline-[6px] focus-visible:outline-grayscale-900";

interface CommonProps {
  label: string;
  /** 按下時唸出的話；省略時唸 label */
  speak?: string;
  icon?: IconName;
  className: string;
  /** 橫向排列（圖示在左），用在底部的常駐列 */
  row?: boolean;
}

function Content({ label, icon, row }: Pick<CommonProps, "label" | "icon" | "row">) {
  return (
    <>
      {icon && <Icon name={icon} className={row ? "size-8 shrink-0" : "size-12"} />}
      <span>{label}</span>
    </>
  );
}

/** 連到另一頁 */
export function ServiceLink({ href, label, speak, icon, className, row }: CommonProps & { href: string }) {
  const { announce } = useElder();
  return (
    <Link
      href={href}
      onClick={() => announce(speak ?? label)}
      className={`${BASE} ${row ? "flex-row" : ""} ${className}`}
    >
      <Content label={label} icon={icon} row={row} />
    </Link>
  );
}

/** 執行動作（撥號、開啟外部 App） */
export function ServiceAction({ onPress, label, speak, icon, className, row }: CommonProps & { onPress: () => void }) {
  const { announce } = useElder();
  return (
    <button
      type="button"
      onClick={() => {
        announce(speak ?? label);
        onPress();
      }}
      className={`${BASE} ${row ? "flex-row" : ""} ${className}`}
    >
      <Content label={label} icon={icon} row={row} />
    </button>
  );
}
