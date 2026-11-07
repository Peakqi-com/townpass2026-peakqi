"use client";

import { useRouter } from "next/navigation";
import { useOffline } from "next/offline";
import { useEffect } from "react";
import { offlineRoutes } from "@/lib/elder/routes";

/**
 * 斷網時還能用（評審可能關掉網路測試）。
 *
 * 1. 一打開服務、有網路時，就把所有頁面預載起來（lib/elder/routes.ts）。
 *    Next.js 平常只預載畫面上看得到的連結，第二層的頁面斷網後會開不了。
 * 2. next.config.ts 開了 experimental.useOffline：斷網時點到沒預載的頁面不會跳到瀏覽器的錯誤頁，
 *    而是停在原地，網路恢復後自動重試。
 * 3. 斷網時在頁首顯示提示，說明哪些東西暫時查不到。
 *
 * 限制：斷網後「重新打開」服務仍然開不了（要 Service Worker，iOS 的 WebView 不支援）。
 * Demo 時要先在有網路時打開服務，再關網路。
 */
export function OfflineSupport() {
  const router = useRouter();
  const offline = useOffline();

  useEffect(() => {
    // 等首頁畫完再預載，不和第一次載入搶網路
    const timer = setTimeout(() => {
      for (const route of offlineRoutes()) router.prefetch(route);
    }, 1500);
    return () => clearTimeout(timer);
  }, [router]);

  if (!offline) return null;
  return (
    <p role="status" className="border-b-4 border-secondary-700 bg-secondary-100 px-4 py-3 text-elder-body font-bold text-secondary-900">
      現在沒有網路。附近的據點和捷運資料暫時查不到，其他功能照常可以用。
    </p>
  );
}
