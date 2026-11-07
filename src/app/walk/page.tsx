import { Suspense } from "react";
import { WalkScreen } from "@/components/elder/WalkScreen";

/** M16 延伸：帶我走到站牌（規格：docs/elder-mode-spec.md M16） */
export default function WalkPage() {
  // WalkScreen 用 useSearchParams 讀「第幾組公車」，要包 Suspense 才能預先產生頁面
  return (
    <Suspense>
      <WalkScreen />
    </Suspense>
  );
}
