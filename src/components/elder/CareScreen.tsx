"use client";

import { CARE_CATEGORIES } from "@/lib/elder/community";
import { PlacesScreen } from "./PlacesScreen";

/** 照顧家人：失智症篩檢醫院、喘息服務單位、家庭照顧者服務中心、健康服務中心（data.taipei） */
export function CareScreen() {
  return (
    <PlacesScreen
      title="照顧家人"
      categories={CARE_CATEGORIES}
      tone={{ className: "bg-elder-family text-on-elder-family", icon: "family" }}
    />
  );
}
