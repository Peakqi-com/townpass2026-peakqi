"use client";

import { HEALTH_PLACE_CATEGORIES } from "@/lib/elder/community";
import { PlacesScreen } from "./PlacesScreen";

/** 打疫苗、做篩檢：公費流感、肺炎鏈球菌疫苗與癌症篩檢的合約院所、健康服務中心（data.taipei） */
export function HealthPlacesScreen() {
  return (
    <PlacesScreen
      title="打疫苗、做篩檢"
      categories={HEALTH_PLACE_CATEGORIES}
      tone={{ className: "bg-elder-health text-on-elder-health", icon: "health" }}
    />
  );
}
