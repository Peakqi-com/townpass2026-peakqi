@AGENTS.md

# CLAUDE.md — townpass2026-peakqi

城市通微服務大黑客松（2026 臺北秋季程式設計節）的參賽作品：一個在城市通 App 的 WebView 裡執行的 Next.js 微服務，前端和後端（Route Handlers）都在這個專案裡。

回應一律使用繁體中文（台灣用語）。

完整規則與背景文件放在 App repo [Peakqi-com/TownPass](https://github.com/Peakqi-com/TownPass)：
- `CLAUDE.md` §0：技術棧允許清單與競賽規範（**以那份為準**）
- `docs/townpass/adding-a-service.md`：雙向溝通協定、內建 Handler、WebView 的坑
- `docs/townpass/design-system.md`：Figma UI Kit、token、無障礙
- `docs/townpass/deployment.md`：Next.js + Vercel 的條件

本機如果已經 clone 了 TownPass（`../TownPass`），直接讀那份；沒有的話到 GitHub 上讀。

---

## 0. 不可違反的規則

1. **技術棧不得超出允許清單**。這個專案的允許範圍是：Next.js（App Router）、React、TypeScript、Tailwind CSS v4、Leaflet／MapLibre（地圖，搭配 OpenStreetMap 或國土測繪中心圖資）。**其他任何套件、服務、資料庫都要先問使用者**。
2. 套件必須開源、免費，授權為 MIT／BSD／Apache-2.0。新增套件後，要在 README §6 補上名稱與授權。
3. **執行時不能呼叫雲端 AI**（OpenAI、Anthropic、Gemini、Vercel AI SDK 接雲端模型都不行）。AI 推論只能在裝置端（App 端的 Handler）完成。禁用大陸廠牌的 AI 工具與模型。
4. **地圖禁用** Google Maps、Mapbox。
5. **不使用 Vercel 專屬服務**（KV、Blob、Postgres、Edge Config），必須維持可用 `Dockerfile` 移轉到其他平台。
6. 核心資料必須是合法開放資料（data.taipei 優先，其次 data.gov.tw、TDX），並寫進 README §5。**API 網址、資料集名稱、欄位要實際打開來源確認，不能憑印象寫。**
7. 金鑰只放在 server 端的環境變數，不加 `NEXT_PUBLIC_` 前綴，也不 commit `.env.local`。
8. 授權 AGPL-3.0（`LICENSE`）。

## 1. 指令

```bash
npm run dev     # http://localhost:3000
npm run build   # 會產生 .next/standalone
npm run lint
docker build -t townpass2026-peakqi . && docker run -p 8080:8080 townpass2026-peakqi
```

## 2. 結構

```
src/
├─ app/
│  ├─ layout.tsx        metadata.title = App AppBar 顯示的服務名稱
│  ├─ page.tsx          首頁（目前是連線測試的示範頁）
│  ├─ globals.css       城市通設計 token（Tailwind v4 @theme）
│  └─ api/**/route.ts   後端 API
├─ components/
└─ lib/townpass/
   ├─ bridge.ts         與 App 雙向溝通（getUserInfo、getLocation、notify、openLink…）
   ├─ types.ts          App 回傳資料的型別
   └─ mock.ts           一般瀏覽器開發時使用的假資料
```

## 3. 和城市通 App 溝通

- **一律透過 `src/lib/townpass/bridge.ts`**，不要在元件裡直接碰 `window.flutterObject`。
- 只能在 `'use client'` 元件的事件 handler 或 `useEffect` 裡呼叫，server component 和 SSR 階段沒有 `window`。
- 判斷「是否在 App 內」要用 `useSyncExternalStore(subscribe, isInTownPass, () => false)`，避免 hydration 不一致。
- `cacheComponents` 開啟時，Next.js 會用 `<Activity>` 保留已離開的頁面。effect 會被清除再重建，所以監聽器一定要在 cleanup 移除（`callApp` 已經處理好）。
- 不要用 `window.open`、`target="_blank"`、`alert`、`confirm`：App 的 WebView 不支援。要開連結改用 `openLink()`，提示訊息用自己做的 Dialog。
- 雙向溝通只能在 App 內驗證，一般瀏覽器會自動改用 `mock.ts`。

## 4. UI 規範

- 視覺照 Figma「Town Pass UI Kit」。
- 顏色只能用 `globals.css` 定義的 token（`primary`、`secondary`、`grayscale`、`red`、`orange` 的 50～950，加上 `white`、`black`）。Tailwind 內建色盤已經清空，`bg-blue-500` 之類的 class 不會生效。
- 字級使用 `text-h1`／`text-h2`／`text-title`／`text-h3`／`text-body`／`text-caption`。
- App 已經有 AppBar（顯示 `<title>`），頁面內**不要再做重複的標題列**。
- 無障礙：觸控目標至少 48×48（`min-h-12`）、圖示要有 `aria-label`、字級用 rem、不禁止縮放、不使用閃爍效果。
- 以手機寬度 360～430px 為主，版面寬度上限 `max-w-md`。

## 5. Next.js 16 注意事項

- 這版的 Next.js 和訓練資料中的版本有差異，寫程式前先看 `node_modules/next/dist/docs/`（見 AGENTS.md）。
- `cacheComponents: true`：資料預設是動態的，要快取就用 `'use cache'` 搭配 `cacheLife`。GET Route Handler 沒有存取動態資料時，會在 build 時預先渲染；要每次請求都重新執行，就呼叫 `await connection()`。
- 不要寫 `export const runtime`（Cache Components 不支援）。
