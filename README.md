# TODO：服務名稱

> 2026 臺北秋季程式設計節 · 城市通微服務大黑客松　參賽作品
> 一句話說明：TODO（例如「5 秒告訴你，現在適不適合騎 YouBike」）

- 微服務網頁：TODO：https://xxx.vercel.app/
- 修改後的城市通 App：[Peakqi-com/TownPass](https://github.com/Peakqi-com/TownPass)

---

## 1. 要解決的問題

- **誰**：TODO（主要使用者，例如通勤族、長者、家長）
- **在什麼時候**：TODO
- **遇到什麼困難**：TODO

## 2. 主要功能

1. TODO
2. TODO
3. TODO

## 3. 系統架構

```
城市通 App（Flutter, WebView）
   │  flutterObject 雙向溝通：userinfo、location、notify…
   ▼
Next.js（本 repo）
 ├─ 前端頁面  src/app/**/page.tsx
 └─ 後端 API  src/app/api/**/route.ts ──► 開放資料（data.taipei、TDX…）
```

### 開放資料代理

data.taipei 多數資料沒有開放 CORS，且部分為 Big5 編碼、TWD97 座標，因此由後端代理：

```
GET /api/opendata                                    列出可用來源
GET /api/opendata/<id>?near=緯度,經度&radius=500&limit=20&q=關鍵字
```

- 只代理 `src/lib/opendata/sources.ts` 登記的來源（白名單），不接受任意網址
- 統一轉成 JSON，TWD97 座標換算為 WGS84，並可依位置篩選附近的點（附 `distance` 公尺）
- 依來源更新頻率設定 CDN 快取（`s-maxage`），上游暫時失敗時回傳最近一次的資料（`stale: true`）

TODO：如果有自訂 App Handler，在這裡說明它的 name、輸入與輸出。

## 4. 執行方式

需求：Node.js 24 以上。

```bash
npm ci
cp .env.example .env.local   # 填入需要的金鑰
npm run dev                  # http://localhost:3000（一般瀏覽器會自動使用 mock 資料）
```

在城市通 App 內測試：

1. 部署到 HTTPS 網址（App 的 WebView 無法開啟 http），或用 ngrok 對外提供本機服務
2. 在 TownPass 的 `lib/page/city_service/model/my_service_model.dart` 新增服務，`destinationUrl` 填入上面的網址
3. `fvm flutter run`，到「服務 › 更多」加入服務

### 部署

**Vercel**（目前使用）：匯入本 repo 即可。Function 區域設定在 `vercel.json`（`hnd1` 東京）。

**容器（Cloud Run 或其他）**：本 repo 附 `Dockerfile`（Next.js standalone 輸出），可以不依賴 Vercel 自行部署：

```bash
gcloud run deploy townpass2026-peakqi --source . --region asia-east1
# 或在本機執行
docker build -t townpass2026-peakqi . && docker run -p 8080:8080 --env-file .env.local townpass2026-peakqi
```

### 環境變數

| 名稱 | 用途 | 取得方式 |
|---|---|---|
| `TDX_CLIENT_ID`／`TDX_CLIENT_SECRET` | TODO（有用到才填） | [TDX](https://tdx.transportdata.tw/) 免費註冊 |

## 5. 資料來源

| 資料集 | 提供機關 | 連結 | 用途 | 類型 |
|---|---|---|---|---|
| TODO | TODO | TODO | TODO | 開放資料／模擬資料 |

> 核心資料使用合法開放資料；標示「模擬資料」的部分是非核心資料。

## 6. 第三方套件

| 套件 | 授權 |
|---|---|
| next | MIT |
| react、react-dom | MIT |
| tailwindcss、@tailwindcss/turbopack | MIT |
| typescript | Apache-2.0 |
| eslint、eslint-config-next | MIT |

TODO：新增套件時，在這裡補上名稱與授權。

## 7. AI 使用聲明

- **開發階段**：TODO（例如「使用 Claude Code 協助撰寫程式、除錯與起草 README，所有程式碼皆經隊員閱讀確認」）
- **執行階段**：TODO（「本作品執行時不使用任何 AI 推論」，或者填寫下表）

| 項目 | 內容 |
|---|---|
| 模型名稱 | TODO |
| 版本 | TODO |
| 量化格式 | TODO |
| 推論框架 | TODO（例如 flutter_edge_ai、llamadart） |
| 來源 | TODO |

> 依競賽規範，執行時的推論都在裝置端完成，不使用雲端 API 或遠端模型。

## 8. 評估面向對照

| 面向 | 本作品的做法 |
|---|---|
| 安全（個資保護、防攻擊、能被監督） | TODO |
| 創新（新想法、能持續改） | TODO |
| 有感（解決需求、可擴充） | TODO |
| 參與（方便表達意見、參與社區） | TODO |
| 便利（數位歸戶、無縫接軌、主動推薦） | TODO |
| 透明（用語淺白、即時更新、指引清楚） | TODO |

## 9. 維運說明

- 資料由誰更新：TODO
- 問題由誰處理：TODO

## 授權

本專案採 [GNU AGPL-3.0](LICENSE) 授權。

TODO：附上主辦單位指定的授權聲明。
