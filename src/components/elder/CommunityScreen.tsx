"use client";

import { COMMUNITY_CATEGORIES } from "@/lib/elder/community";
import { PlacesScreen } from "./PlacesScreen";

/** M9 附近吃飯上課：共餐、關懷據點、長青學苑、樂齡學習、老人服務中心 */
export function CommunityScreen() {
  return (
    <PlacesScreen
      title="附近吃飯、上課"
      categories={COMMUNITY_CATEGORIES}
      tone={{ className: "bg-elder-community text-on-elder-community", icon: "community" }}
    />
  );
}
