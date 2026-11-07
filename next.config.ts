import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 輸出可獨立執行的 .next/standalone（含 server.js），供 Dockerfile 使用。
  // 這是「可移轉、可維運」規則的要求：資訊局可以不用 Vercel，自行部署到 Cloud Run 等容器環境。
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // 斷網時點到還沒預載的頁面，不跳瀏覽器錯誤頁，停在原地、網路恢復後自動重試；並提供 useOffline()
    // （node_modules/next/dist/docs/01-app/02-guides/offline-support.md）
    useOffline: true,
    // 預載的頁面在用戶端保留 1 天（預設 5 分鐘）。頁面本身是靜態的，資料另外由 /api/opendata 取得，
    // 保留久一點不會看到過期資料；這樣打開服務一段時間後斷網，仍然可以在各頁之間切換。
    staleTimes: { static: 86400 },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
