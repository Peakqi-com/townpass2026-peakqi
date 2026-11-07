"use client";

import Link from "next/link";
import { Icon } from "./Icon";
import { useElder } from "./ElderProvider";
import { useFocusOnMount } from "./useFocusOnMount";

/**
 * 長輩模式的內頁：左上只有一個「回首頁」，沒有多層返回（elder-mode-spec.md §4）。
 * 每頁一個 h1。
 */
export function PageShell({ title, children }: { title: string; children: React.ReactNode }) {
  const { announce } = useElder();
  const heading = useFocusOnMount<HTMLHeadingElement>();
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pb-10 pt-4">
      <Link
        href="/"
        onClick={() => announce("回首頁")}
        className="flex min-h-14 items-center gap-2 self-start rounded-xl border-4 border-grayscale-800 bg-white px-4 text-elder-body font-bold text-text-primary outline-offset-2 focus-visible:outline focus-visible:outline-[6px] focus-visible:outline-grayscale-900 active:outline active:outline-[6px] active:outline-grayscale-900"
      >
        <Icon name="home" className="size-7" />
        回首頁
      </Link>
      <h1 ref={heading} tabIndex={-1} className="text-elder-title font-bold text-text-primary focus:outline-none">
        {title}
      </h1>
      {children}
    </main>
  );
}
