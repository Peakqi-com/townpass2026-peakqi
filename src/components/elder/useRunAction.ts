"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { call1999, openLink, phoneCall } from "@/lib/townpass/bridge";
import { openExternal } from "@/lib/townpass/elder";
import type { Action, Service } from "@/lib/elder/services";

/**
 * 執行服務清單裡的動作。所有模組（M2、M4～M12）都用這個，不要自己呼叫 bridge，
 * 才能保證「撥號前確認」等規則一致。
 * 回傳 false 表示 App 開不了（例如手機沒有 LINE），畫面應該提示改用 fallback 或 alt_channels。
 */
export function useRunAction(): (service: Service, action: Action) => Promise<boolean> {
  const router = useRouter();

  return useCallback(
    async (service, action) => {
      switch (action.type) {
        case "phone_call":
          // 需要確認的電話先到大字確認頁；確認頁本身呼叫 phoneCall
          if (service.confirm) {
            router.push(`/call/${service.id}`);
            return true;
          }
          return phoneCall(action.target);
        case "1999agree":
          call1999();
          return true;
        case "open_link":
          openLink(action.target);
          return true;
        case "open_external":
          return openExternal(action.target);
        case "page":
          router.push(action.target);
          return true;
      }
    },
    [router],
  );
}
