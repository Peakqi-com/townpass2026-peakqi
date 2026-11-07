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

### 文件同步規則

本 repo 的 `docs/` 是 TownPass `docs/townpass/` 的**複本**（規格、研究、架構圖與流程圖 SVG），兩邊必須一致。

- **唯一來源是 TownPass 的 `docs/townpass/`**。新增或修改文件一律在 TownPass 做，**不要直接改本 repo 的 `docs/`**，下次同步會被蓋掉。
- TownPass 的文件改完後，在本 repo 執行 `npm run docs:sync`（`scripts/sync-docs.mjs`，TownPass 預設在 `../TownPass`，其他位置用環境變數 `TOWNPASS_DIR`），再把兩個 repo 都 commit。
- commit 或 push 前執行 `npm run docs:check`，兩邊不一致時會列出差異並以 exit code 1 結束。
- 架構圖、流程圖由 TownPass 的 `docs/townpass/diagrams/build_diagrams.py` 產生；不要手改本 repo 的 SVG。
- 不同步、兩邊各自保留的檔案：`*.pdf`、`diagrams/build_diagrams.py`。
- README 引用了 `docs/diagrams/*.svg`、`docs/antifraud-research.md` 等檔案；在 TownPass 改檔名或刪檔時，要一起改 README。

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
npm test        # 單元測試（解析、座標轉換、查詢參數）
docker build -t townpass2026-peakqi . && docker run -p 8080:8080 townpass2026-peakqi
```

## 2. 結構

```
src/
├─ app/
│  ├─ layout.tsx        metadata.title = App AppBar 顯示的服務名稱
│  ├─ page.tsx          首頁（目前是連線測試的示範頁）
│  ├─ globals.css       城市通設計 token（Tailwind v4 @theme）
│  └─ api/
│     ├─ health/              健康檢查
│     └─ opendata/[source]/   開放資料代理
├─ components/
└─ lib/
   ├─ townpass/
   │  ├─ bridge.ts      與 App 雙向溝通（getUserInfo、getLocation、notify、openLink…）
   │  ├─ types.ts       App 回傳資料的型別
   │  └─ mock.ts        一般瀏覽器開發時使用的假資料
   └─ opendata/
      ├─ sources.ts     資料來源白名單（28 個，已驗證）
      ├─ client.ts      網頁端呼叫：getOpenData()
      ├─ parse.ts       Big5／CSV／XML 解析
      ├─ geo.ts         TWD97 → WGS84、距離計算
      ├─ query.ts       near／radius／limit／q 篩選
      └─ cache.ts       程序內快取
```

## 3. 和城市通 App 溝通

- **一律透過 `src/lib/townpass/bridge.ts`**，不要在元件裡直接碰 `window.flutterObject`。
- 只能在 `'use client'` 元件的事件 handler 或 `useEffect` 裡呼叫，server component 和 SSR 階段沒有 `window`。
- 判斷「是否在 App 內」要用 `useSyncExternalStore(subscribe, isInTownPass, () => false)`，避免 hydration 不一致。
- `cacheComponents` 開啟時，Next.js 會用 `<Activity>` 保留已離開的頁面。effect 會被清除再重建，所以監聽器一定要在 cleanup 移除（`callApp` 已經處理好）。
- 不要用 `window.open`、`target="_blank"`、`alert`、`confirm`：App 的 WebView 不支援。要開連結改用 `openLink()`，提示訊息用自己做的 Dialog。
- 雙向溝通只能在 App 內驗證，一般瀏覽器會自動改用 `mock.ts`。

## 3.5 開放資料（一律走代理）

- 網頁**不要直接 fetch data.taipei**：多數來源沒開 CORS、有的是 Big5、有的是 TWD97 座標。一律用 `src/lib/opendata/client.ts` 的 `getOpenData(id, { near, radius, limit, q })`，它會呼叫 `/api/opendata/<id>`。
- 可用來源：`GET /api/opendata` 會列出全部；定義在 `src/lib/opendata/sources.ts`（白名單）。
- CSV 來源保留**原始中文欄位名**（例如 `r["公廁名稱"]`），另外加上 `lat`／`lng`；用 `near` 查詢時還會附上 `distance`（公尺）。youbike、parking、construction 已經整理成英文欄位。
- **新增來源**：先實際下載確認格式、編碼、座標欄位，再加進 `sources.ts`（大多數 CSV 只要 `csvSource({...})` 一行），並在 README §5 補上出處。**不要把代理改成接受任意網址**（會變成 SSRF 跳板）。
- 各資料集的欄位、編碼、已知問題：TownPass repo 的 `docs/townpass/open-data.md`。
- 測試：`npm test`（Node 內建 test runner，`src/**/*.test.ts`）。座標轉換用河濱租借站資料當基準。

## 4. UI 規範

- 視覺照 Figma「Town Pass UI Kit」，設計基準寬度 375px。**元件的 node id 先查 TownPass repo 的 `docs/townpass/figma/inventory.md`**，不要直接呼叫 Figma MCP（Starter 方案每月只有約 6 次）。真的需要讀元件細節時，先問使用者，讀到的結果存回 `docs/townpass/figma/`。
- 顏色**優先用語意色**：`text-text-primary`／`text-text-second`／`text-text-description`、`bg-bg-light`／`bg-bg-dark`、`bg-disable`、`bg-alarm`（警示）、`bg-reminder`（提醒）、`border-divider`。沒有合適的語意色時，才用色階（`primary`、`secondary`、`grayscale`、`red`、`orange` 的 50～950）。Tailwind 內建色盤已經清空，`bg-blue-500` 之類的 class 不會生效。不要用 `red-400`（值待確認）。
- 按鈕照 UI Kit 的 5 種狀態：Primary（`bg-primary-500`）、Second、Alarm（`bg-alarm`）、Reminder（`bg-reminder`）、Disable（`bg-disable`）。尺寸 M 是 175×48，L 是 366×56。
- 字級使用 `text-h1`／`text-h2`／`text-title`／`text-h3`／`text-body`／`text-caption`。h1、h2、body 已經內建 Figma 的行高。
- App 已經有 AppBar（顯示 `<title>`），頁面內**不要再做重複的標題列**。
- 無障礙：觸控目標至少 48×48（`min-h-12`）、圖示要有 `aria-label`、字級用 rem、不禁止縮放、不使用閃爍效果。
- 以手機寬度 360～430px 為主，版面寬度上限 `max-w-md`。

## 4.5 長輩模式開發規範（M1～M12 一律遵守）

規格：TownPass repo 的 `docs/townpass/elder-mode-spec.md`（模組、介面規範 §4、色票 §4.1）。

**一定要用共用元件，不要自己重做**
- 頁面：`PageShell`（回首頁＋h1＋載入時焦點移到 h1）。首頁類畫面自己的 h1 要用 `useFocusOnMount`。
- 服務：資料只放在 `src/data/services.json`（M3），用 `ServiceCard` 顯示，用 `useRunAction` 執行動作。**不要在元件裡直接呼叫 bridge 的 phoneCall／openLink 等**，撥號確認、文字管道、失敗提示才會一致。
- 按鈕：`ServiceLink`／`ServiceAction`（`src/components/elder/ServiceButton.tsx`）。顏色用 `CATEGORY_STYLE` 或 `bg-elder-*`／`text-on-elder-*` token；紅色 `bg-elder-help` 只給「求助」。
- 字級：`text-elder-title`（32）、`text-elder-button`（28）、`text-elder-body`（20）；最小用 `text-h3`（16）。全部 rem。
- 狀態：`useElder()` 取得 `mode`、`user`、`now`、`textScale`、`rate`。日期一律用 `now`（不要在元件裡 `new Date()`，Cache Components 會擋）。

**回饋（VoiceOver／TalkBack 一定要能用）**
- 按下當下：`announce(按鈕名稱)`（震動＋大字＋唸；報讀軟體開著時只震動）。
- 操作結果：`say(結果)`，例如「找到 3 個」「打不開」「設定好了」。一律寫進 live region，報讀軟體會唸。
- 每個可互動元素都要有**可見文字**當名稱；圖示一律 `aria-hidden`（`Icon` 元件已處理）。狀態用 `aria-pressed`。
- DOM 順序＝視覺順序；每頁一個 h1；區塊用 h2／h3，讓視障者可以用標題跳讀。
- 只用單指點一下，不用長按、滑動、雙指。語音一律「點一下開始、再點一下停止」，開始收音時只震動不出聲（避免錄到報讀軟體的聲音）。
- **不要唸兩次**：
  - 換畫面時焦點移到新標題，報讀軟體會自己唸標題。這時寫成 `if (!a11y.screenReader) say(...)`。
  - 已經 `say()` 的訊息，畫面上的同一句不要再加 `role="alert"` 或 `aria-live`。
  - 不要從 App 端呼叫原生的無障礙通知：Android 已經棄用 `announceForAccessibility`（會打斷 TalkBack 正在唸的內容），官方建議改用 live region。我們的 live region 就是 `ElderProvider` 裡那一個 `role="status"`。

**報讀軟體機制：原生 App 和網頁的對照**（第三方報讀軟體走同一套系統無障礙 API，不需要個別支援）

| 機制 | Android | iOS | 網頁（我們的做法） |
|---|---|---|---|
| 無障礙標籤 | `contentDescription` | `accessibilityLabel` | 按鈕上的可見文字；必要時 `aria-label`；`img` 一定要有 `alt` |
| 添加焦點 | `importantForAccessibility` | `isAccessibilityElement` | 只用原生的 `<button>`、`<a>`、`<input>`；裝飾圖示 `aria-hidden`；不要在 `div` 上綁 `onClick` |
| 焦點順序 | `nextFocusForward` | `accessibilityElements` | DOM 順序＝視覺順序；不用正數 `tabindex`；不用 CSS `order` 改變順序 |
| 無障礙通知 | `announceForAccessibility`（已棄用） | `UIAccessibilityPostNotification` | `say()`／`announce()` 寫進 live region（`role="status"`） |
| 偵測報讀軟體 | 觸控探索開啟（含第三方報讀軟體） | VoiceOver 開啟 | App 的 `a11y_state` Handler 回傳 `screenReader` |

**檢查**：每完成一頁，用 `scripts/a11y-check.js` 在三種模式下各跑一次（貼到 Chrome DevTools 的 Console，用法寫在檔案開頭）；最後仍要用實機開 VoiceOver／TalkBack 聽一次。

**內容**
- 視障者用報讀軟體時習慣 3～5 倍速聆聽、會跳著聽：**重點放在標題和第一句**，不要開場白。自己唸（TTS）的速度用 `rate`，不要寫死。
- 聽不清楚模式：每個只能用講的動作旁邊都要有文字管道（`alt_channels`）；沒有就明白寫「只能用講的，可以請家人代打」。
- 電話、網址、金額、資格只能用 TownPass `docs/townpass/` 研究文件裡標 ✅ 的資料，附 `source` 與 `verified`。查不到就不要寫。
- 只說「可能可以申請」，不說「符合」；最後以主責機關審核為準。
- Demo 絕對不能真的送出 119／110 簡訊或撥號。

**測試**：純邏輯（資格判斷、比對、資料轉換）放 `src/lib/elder/*.ts`，先寫 `*.test.ts`（`node --test`）。完成前跑 `npm test`、`npm run lint`、`npx tsc --noEmit`、`npm run build`。

## 5. Next.js 16 注意事項

- 這版的 Next.js 和訓練資料中的版本有差異，寫程式前先看 `node_modules/next/dist/docs/`（見 AGENTS.md）。
- `cacheComponents: true`：資料預設是動態的，要快取就用 `'use cache'` 搭配 `cacheLife`。GET Route Handler 沒有存取動態資料時，會在 build 時預先渲染；要每次請求都重新執行，就呼叫 `await connection()`。
- 不要寫 `export const runtime`（Cache Components 不支援）。
