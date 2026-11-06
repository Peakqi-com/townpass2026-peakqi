import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 輸出可獨立執行的 .next/standalone（含 server.js），供 Dockerfile 使用。
  // 這是「可移轉、可維運」規則的要求：資訊局可以不用 Vercel，自行部署到 Cloud Run 等容器環境。
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
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
