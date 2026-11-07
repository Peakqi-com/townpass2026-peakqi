# 使用流程的情境與設計依據

這份文件把「用得了」每一條使用流程的情境、政策依據、UX 依據、背景數據、內容設計、程式位置和參考 commit 放在一起。給決選評審問「為什麼這樣設計」時查依據，也給隊友改功能前對照。數字、電話、資格只取自 `docs/` 的研究文件，這份文件沒有另外查證。

流程圖見 [README 第 5 節](../README.md#5-主要流程)。

**標記**

- ✅：研究文件寫明已打開原始頁面、原檔或原始碼查證。
- ⚠️：未查證、只看到搜尋摘要（研究文件裡標 🔍 的也算），或官方來源互相矛盾。**⚠️ 的內容不能說成「研究指出」。**
- [`research-basis.md`](research-basis.md) 只在查不到的地方標 ⚠️，其餘都用 Crossref 或原檔核對過；本文引用它沒標 ⚠️ 的項目時標 ✅。
- 沒有另外寫日期的，查證日都是 2026-11-07。

**示範長輩：金大森**

App 的測試帳號 [`townpass/assets/mock_data/account.json`](../townpass/assets/mock_data/account.json)：金大森，1940/03/01 生（今年底滿 86 歲），住臺北市中山區正得里，臺北市民，不是原住民。下面的範例句子，是用這個帳號和 2026-11-07 這一天代入程式算出來的；`{ }` 是程式會換掉的部分。

## 總表

| 流程 | 情境一句話 | 主要政策依據 | 主要 UX 依據 | 文件連結 |
|---|---|---|---|---|
| flow-1 開啟「用得了」 | 打開服務，第一眼看到問候和自己可能領得到的錢 | 老人福利法第 2 條；重陽敬老禮金自治條例第 3 條 | 原則 2、6；WCAG 1.4.4、3.2.6；能力導向設計 | [§1](#1-開啟用得了flow-1) |
| flow-2 按一顆大按鈕 | 按「1966」，先震動、唸出來、大字確認，才撥號 | 身權法第 52 條；CRPD 第 21 條 | 原則 1、3、4、5；WCAG 4.1.3、2.2.1 | [§2](#2-按一顆大按鈕flow-2) |
| flow-3 找服務 | 不知道歸哪個局處，用說的、打的或點的找 | 競賽須知伍、二、(四)（推論在裝置端） | 原則 2；WCAG 2.5.1、4.1.3；Rodrigues 2015 | [§3](#3-找服務flow-3m2) |
| flow-4 附近據點 | 不用輸入地址，直接列出同一區的共餐、疫苗院所 | 老人福利法第 16、27、31 條 | 原則 1、5；服務層原則 S7；WCAG 3.3.7 | [§4](#4-附近據點flow-4m9m14m15) |
| flow-5 家人代設定 | 女兒用自己的手機做設定碼，長輩掃一下就好 | 個資法第 51 條；老人福利法第 31 條 | 原則 2、7；warm experts（Bakardjieva 2005） | [§5](#5-家人代設定flow-5m7) |
| flow-6 權益提醒 | 還沒領重陽禮金，按「提醒我申請」 | 重陽敬老禮金自治條例第 3–6 條；CRPD 第 21 條 (a) | 原則 6、8；Bhargava 2015、Daigneault 2025 | [§6](#6-權益提醒flow-6m6) |
| flow-7 看完醫生之後 | 回診前一晚 7 點跳通知，也傳給家人 | 個資法第 6 條（健康資料不上傳） | 原則 3、6、7 | [§7](#7-看完醫生之後flow-7m4) |
| flow-8 公車還有幾分鐘到 | 首頁直接看到常坐的公車還有幾分鐘 | 身權法第 52 條；公運處開放資料 | 原則 3、7；服務層原則 S7；Azenkot 2011 | [§8](#8-公車還有幾分鐘到flow-8m16) |
| flow-9 帶我走到站牌 | 斷網也能一步一步用語音帶到站牌 | 交工處有聲號誌；CRPD 第 9 條 | 原則 3；Kane 2011；李森光 2012 | [§9](#9-帶我走到站牌flow-9m16-延伸) |
| M5 叫車分流 | 以為能叫復康巴士，兩題分流到對的車 | 公運處、社會局三種車的資格（長輩研究 B.3） | 原則 2、4、5 | [§10](#10-叫車分流m5) |
| M12 補助小幫手 | 想幫太太看能領什麼補助 | 中低收入老人生活津貼等（補助研究 A.1–A.6） | 原則 4、6、7；Finkelstein 2019 | [§11](#11-補助小幫手m12) |
| 其他模組 | M8 聽不清楚、M10 視障出門、M11 防詐、M13 避難 | 身權法第 61 條；詐欺犯罪危害防制條例 | 原則 4、8、9 | [§12](#12-其他模組) |

設計原則編號（原則 1～9）指 [README 第 2 節](../README.md#2-設計原則)；服務層原則 S1～S8 指 [視障聽障研究 A.4](taipei-disability-services.md#a4-服務層的設計原則介面層原則見-accessibility-researchmd-4)。

---

## 1. 開啟「用得了」（flow-1）

流程圖：[`diagrams/flow-1-open.svg`](diagrams/flow-1-open.svg)

### 情境

金大森 86 歲，住中山區。孫子幫他在台北通「我的服務」找到「用得了」。他想知道市政府有什麼能幫他，但官方網站要先知道「這件事歸哪個局處」，字也太小。

- 第一次打開：先到「選模式」頁，選一次就好。
- 視障長輩開著 VoiceOver，需要焦點落在標題、不要被自製語音打斷。
- 聽障長輩不需要聲音，需要每個電話旁邊都有文字路。

卡在：入口散在各局處；字小；不知道自己有什麼權益。

### 政策與制度依據

| 依據 | 內容 | 出處 |
|---|---|---|
| 老人福利法第 2 條 | 「本法所稱老人，指年滿六十五歲以上之人」→ 用生日算年齡門檻 | ✅ [依據總表 §2.2](research-basis.md#22-國內法規) |
| 臺北市重陽敬老禮金致送自治條例第 3 條 | 設籍滿三個月、當年 12/31 滿 65 歲（原住民 55 歲） | ✅ [依據總表 §2.3](research-basis.md#23-臺北市法規) |
| 重陽敬老禮金發放金額標準第 3 條 | 65～84 歲 1,500 元、85～98 歲 3,000 元、99 歲以上 1 萬元 | ✅ 同上；社會局 115 年公告 ✅ [長輩研究 B.7](taipei-elderly-services.md#b7-照護補助與安全) |
| 身權法第 52 條第 1 項第 3 款 | 主管機關應辦理「公共資訊無障礙」 | ✅ [依據總表 §2.2](research-basis.md#22-國內法規) |
| CRPD 第 9 條第 2 項 (g)(h) | 「於早期階段設計、開發」無障礙資訊與通信技術 → 一開始就支援報讀軟體 | ✅ 同上 |
| 個資法第 5 條 | 蒐集不得逾越特定目的之必要範圍 → 只取生日和行政區，不上傳 | ✅ 同上 |

主責機關：重陽禮金是臺北市政府社會局。

### UX 依據

- **原則 2 選項要少**：首頁 6 個大按鈕。W3C WAI-AGE 文獻回顧轉述「淺層的資訊階層對高齡使用者效果較好」（✅ [無障礙研究 §1.1](accessibility-research.md#11-高齡者)，2008 年的桌面網頁研究）。
- **原則 6 主動告訴**：一打開就用生日算出禮金級距。
- **能力導向設計**：模式用「看不清楚／聽不清楚」描述能力，不用障別命名（✅ Wobbrock 2011，[依據總表 §1.5](research-basis.md#15-能力導向設計通用設計m1)）。模式只改行為，服務內容同一份。
- **WCAG 1.4.4 文字放大**：城市通的 WebView 把 Android 字級寫死 `textZoom=100`，iOS 不跟隨 Dynamic Type（✅ 原始碼與 WebKit Bug 187013，[無障礙研究 §5.2](accessibility-research.md#52-系統字體放大)）。所以改由 App 的 `a11y_state` 回傳字級，網頁全站用 `rem`。
- **WCAG 1.4.10 Reflow**：字級 1.25 倍以上改成單欄、圖示在左。
- **WCAG 3.2.6 Consistent Help**：1999、1966、求助固定在底部同一個位置（✅ WCAG 標題已核對，[無障礙研究 §2.1](accessibility-research.md#21-wcag-22-中與三類客群最相關的成功準則)）。
- **焦點**：載入後焦點移到問候的 h1，報讀軟體從問候開始唸。

### 背景數據

- 全國聽障者 76.3%、視障者 59.4% 年滿 65 歲（衛福部 2026-06 底）✅；臺北市第 2 類（眼、耳）身障者 73.2% 年滿 65 歲（2025 年底）✅。[視障聽障研究 A.0](taipei-disability-services.md#a0-人數與年齡和長輩的重疊程度)
- 臺北市 65 歲以上占 24.86%（內政部，2026-09 底）✅ [無障礙研究 §1.0b](accessibility-research.md#10b-人數總表官方統計全部打開原始頁面或原檔確認-)；114 年 9 月底 23.9%、約 58.4 萬人（主計處統計週報第 1355 號）✅ [長輩研究 B.7](taipei-elderly-services.md#b7-照護補助與安全)。兩個數字時點和機關不同，引用時要寫時點。
- 75 歲以上上網率只有 41.4%（數發部 114 年）✅ [長輩研究 A.1](taipei-elderly-services.md#a1-手機與上網率)。
- 65 歲以上 98.4% 知道重陽禮金、95.0% 已領（T113）✅ [依據總表 §0.2](research-basis.md#長輩最擔心最困擾的事依調查排序)。

### 內容設計

**第一次使用**（[`ModePicker.tsx`](../src/components/elder/ModePicker.tsx)）：標題「先選一個最適合您的方式」，下面一句「之後隨時可以換。」

| 選項 | 說明文字 | 模式 |
|---|---|---|
| 我看得到，也聽得到 | 按下按鈕時會震動，並唸出名稱。 | 都還好 |
| 我看不清楚 | 字會再放大。有開報讀軟體也可以用。 | 看不清楚 |
| 我聽不清楚 | 不出聲音。每個電話旁邊都有「用文字」。 | 聽不清楚 |

選項用「我看不清楚」這種第一人稱、描述能力的說法，不問「您是不是視障者」。

**首頁**（[`HomeScreen.tsx`](../src/components/elder/HomeScreen.tsx)）

- 問候：「午安，金大森」。05–10 點早安、11–17 點午安、18 點以後晚安（[`profile.ts`](../src/lib/elder/profile.ts) `greetingFor`）。
- 禮金卡：標題「還沒收到重陽禮金嗎？」，內文「您今年可能可以領 3,000 元。還有 6 天截止（11/13）。最後以社會局審核為準。」按鈕「看怎麼申請」，唸「重陽禮金，看怎麼申請」（[`giftCopy.ts`](../src/lib/elder/giftCopy.ts)）。
  - 寫給「還沒收到」的人：98.4% 已經知道，不寫成新消息。
  - 只說「可能可以領」：設籍滿三個月這類條件 App 判斷不了。
  - 規則只寫 115 年。其他年份不顯示，避免出現過期金額。
- 6 顆大按鈕（[`home.ts`](../src/lib/elder/home.ts)）：按鈕上的字短，唸出來的話完整。

| 按鈕上的字 | 唸出來的話 |
|---|---|
| 看醫生 | 看醫生 |
| 叫車 | 叫車 |
| 我的權益 | 我的權益 |
| 吃飯上課 | 附近吃飯、上課的地方 |
| 打給家人 | 打給家人 |
| 文字聯絡 | 用文字聯絡市政府 |

- 按鈕顏色跟著服務類別固定，家人換了按鈕，「叫車」永遠是黃色；紅色只給「求助」（[規格 §4.1](elder-mode-spec.md#41-色彩給辨色能力退化的長輩)）。
- 其他入口：「說話或打字找服務」（聽不清楚模式改成「打字找服務」）、「換模式：都還好」（唸「換模式。現在是都還好」）、「我是家人，幫長輩設定」。
- 底部固定列：「1999」（唸「打給 1999 市民熱線」）、「1966」（唸「1966 長照專線」）、「求助」。

**三種模式的差異**（[README 第 3 節「三種模式」](../README.md#三種模式)）

| | 都還好 | 看不清楚 | 聽不清楚 |
|---|---|---|---|
| 按下按鈕 | 震動＋大字＋唸 | 同左 | 震動＋大字，不出聲 |
| 字級 | 跟手機設定 | 至少 1.3 倍 | 跟手機設定 |
| 唸的速度預設 | 慢（0.4） | 正常（0.5） | 不唸 |
| 底部 1999 | 直接撥號 | 直接撥號 | 改成「1999 文字」 |

報讀軟體開著時，三種模式都不自己唸。

**斷網**（[`OfflineSupport.tsx`](../src/components/elder/OfflineSupport.tsx)）：頁首顯示「現在沒有網路。附近的據點和捷運資料暫時查不到，其他功能照常可以用。」打開時就預載全部頁面（[`routes.ts`](../src/lib/elder/routes.ts)）。

### 程式位置

- [`src/components/elder/HomeScreen.tsx`](../src/components/elder/HomeScreen.tsx)：首頁
- [`src/components/elder/ElderProvider.tsx`](../src/components/elder/ElderProvider.tsx)：讀 `userinfo`、`a11y_state`、模式、語速
- [`src/components/elder/ModePicker.tsx`](../src/components/elder/ModePicker.tsx)、[`ModeRoute.tsx`](../src/components/elder/ModeRoute.tsx)、[`src/lib/elder/entry.ts`](../src/lib/elder/entry.ts)：選模式，以及用返回鍵回到選模式頁
- [`src/lib/elder/profile.ts`](../src/lib/elder/profile.ts)：年齡、問候、重陽禮金規則（有單元測試）
- [`src/lib/elder/home.ts`](../src/lib/elder/home.ts)、[`giftCopy.ts`](../src/lib/elder/giftCopy.ts)
- [`src/components/elder/OfflineSupport.tsx`](../src/components/elder/OfflineSupport.tsx)、[`src/lib/elder/routes.ts`](../src/lib/elder/routes.ts)：斷網
- App 端：[`townpass/lib/util/web_message_handler/elder_mode_message_handlers.dart`](../townpass/lib/util/web_message_handler/elder_mode_message_handlers.dart)（`a11y_state`）

### 參考 commit

| 短 sha | 訊息 | 連結 |
|---|---|---|
| `ebdf93e` | feat: 長輩模式首頁與模式選擇（M1） | [ebdf93e](https://github.com/Peakqi-com/townpass2026-peakqi/commit/ebdf93e6fe842ce2629c711e50d8a390bd5e0483) |
| `5b9b912` | feat: 新增長輩模式 App 端橋接（M0）與補助、配色規格 | [5b9b912](https://github.com/Peakqi-com/townpass2026-peakqi/commit/5b9b91209469ba809a488e90be2adce4f25cbef0) |
| `1824950` | fix: 打開服務時也能用城市通的返回鍵換模式；換模式改成大按鈕；README 更新 | [1824950](https://github.com/Peakqi-com/townpass2026-peakqi/commit/182495077546a73712ff9a3c785946e8ee422a98) |
| `f759fa5` | feat: 斷網支援；mock 帳號改成 86 歲 | [f759fa5](https://github.com/Peakqi-com/townpass2026-peakqi/commit/f759fa5aa20cba326f3096499256605b3c292f40) |
| `891cff2` | chore: 測試帳號生日改成 1940/03/01（86 歲），Demo 可示範重陽禮金 3,000 元；規格補上斷網 Demo 步驟 | [891cff2](https://github.com/Peakqi-com/townpass2026-peakqi/commit/891cff28d6c4fa75a5f26c8835177dc71f3da013) |

### 限制與未查證

- ⚠️ 還沒用實機開 VoiceOver／TalkBack 完整實測（README 第 3 節）。
- ⚠️ 模式和家人設定存在 `localStorage`，WebView 重啟後會不會保留，要實機確認（[規格 §10](elder-mode-spec.md#10-風險與待確認)）。
- 偵測報讀軟體用 Flutter 的 `accessibleNavigation`：已查 Flutter 3.47.6 引擎原始碼 ✅（Android 看「觸控探索」，iOS 看 VoiceOver）；⚠️ 實機行為還要確認。
- 斷網後「重新打開」服務會打不開：要 Service Worker，iOS 的 WebView 不支援。Demo 要先開服務再關網路。
- 禮金只用年齡和市民身分判斷，設籍時間判斷不了，所以只說「可能可以領」。

---

## 2. 按一顆大按鈕（flow-2）

流程圖：[`diagrams/flow-2-press.svg`](diagrams/flow-2-press.svg)

### 情境

金大森的太太最近走路變慢。他想問長照，按了首頁底部的「1966」。

- 手機震動，唸出「1966 長照專線」，畫面上方出現同一句大字。
- 進到確認頁「打給 1966 長照」，再按大字「撥打 1966」才撥出。
- 如果是聽障長輩，「線上申請長照」排在撥號前面。
- 如果開著 VoiceOver，手機只震動，按鈕名稱交給 VoiceOver 唸。

卡在：怕按錯就撥出去；聽障者打不了電話；自製語音和報讀軟體搶著講話。

### 政策與制度依據

| 依據 | 內容 | 出處 |
|---|---|---|
| 1966 長照專線 | 衛生局、臺北市長期照顧管理中心；週一至週五 8:30–12:00、13:30–17:30；也可以線上申請 `ltc.health.gov.taipei/tplcPublic/` | ✅ [長輩研究 B.2](taipei-elderly-services.md#b2-長照-20-與-1966衛生局臺北市長期照顧管理中心) |
| 身權法第 52 條第 1 項第 3 款、第 3 項 | 對視、聽、語障礙者提供「無障礙閱讀、觀看、轉接或傳送等輔助」 | ✅ [依據總表 §2.2](research-basis.md#22-國內法規) |
| CRPD 第 21 條 (b) | 接受「輔助與替代性傳播及身心障礙者選用之其他所有無障礙傳播方法」→ 電話旁的文字管道 | ✅ 同上 |
| 開發規範 | 電話、網址只能用研究文件標 ✅ 的資料，附 `source` 與 `verified` | CLAUDE.md §5.4 |

### UX 依據

- **原則 1 動作要熟**：按鈕的結果只有撥電話、開 LINE、開一頁大字說明。
- **原則 3 至少兩種感官**：`announce()`＝震動＋大字＋唸；報讀軟體開著時只震動，避免唸兩次（[無障礙研究 §6.2 R4](accessibility-research.md#62-風險與缺口)）。
- **原則 4 文字路**：只能用講的服務，旁邊一定有文字管道；沒有就明白寫出來。
- **原則 5 按錯不怕**：撥號前有確認頁；不自動逾時、不自動跳頁（WCAG 2.2.1）。
- **WCAG 4.1.3 Status Messages**：結果寫進一開始就存在的 `role="status"`（✅ MDN Live regions，[無障礙研究 §5.5](accessibility-research.md#55-talkbackvoiceover-讀-webview)）。`role="alert"` 再加 `aria-live` 時，iOS VoiceOver 會唸兩次 ✅，所以已經 `say()` 的訊息不加 `role="alert"`。
- **不從 App 呼叫原生播報**：Flutter 3.47.6 的 `SemanticsService` 說明寫 Android 已棄用 announcement 事件 ✅（[規格 §4.0](elder-mode-spec.md#40-報讀軟體voiceovertalkback與語速)）。
- **WCAG 2.5.5／2.5.8 觸控目標**：按鈕最小高度 4.5rem（72px）。高齡者按鍵小於 14 mm 時正確率顯著下降（✅ Leitão & Silva 2012，[無障礙研究 §1.1](accessibility-research.md#11-高齡者)）。
- **WCAG 1.4.1**：按下的狀態用粗框，不靠變色。
- **WCAG 1.1.1**：圖示 `aria-hidden`，按鈕一定有可見文字。5,753 個 Android App 中 45.9% 的 App 只有不到 1 成的圖片按鈕有標籤（✅ Ross 2018，[無障礙研究 §1.2](accessibility-research.md#12-視障者)）。
- **失敗訊息留著**：`say()` 的大字 4 秒後消失，聽不清楚模式沒有聲音，大字是唯一管道。所以失敗訊息留在按鈕下方，直到下一次操作（WCAG 2.2.1）。

### 背景數據

- 撥打電話有困難：聽障者 41.16%、視障者 49.42%（衛福部 110 年身障者調查表 78）✅ [依據總表 §0.2](research-basis.md#長輩最擔心最困擾的事依調查排序)
- 聽障者「主要困境為無法接聽電話、無法語音溝通」（✅ 摘要，邱曉萍 2009，[無障礙研究 §1.3](accessibility-research.md#13-聽障者)）
- 65 歲以上網路族 95.1% 用即時通訊或網路電話（數發部 114 年）✅ [長輩研究 A.2](taipei-elderly-services.md#a2-最常用的功能)
- 身障網路族用政府 App 時，「操作流程有時間限制」每百人 2.4 人 ✅ [視障聽障研究 A.3](taipei-disability-services.md#a3-使用政府數位服務遇到的具體困難)

### 內容設計

**按下當下**（[`ServiceButton.tsx`](../src/components/elder/ServiceButton.tsx)、[`ElderProvider.tsx`](../src/components/elder/ElderProvider.tsx)）

| 模式 | 震動 | 大字 | 唸出來 |
|---|---|---|---|
| 都還好、看不清楚 | ✓ | ✓ | ✓（用設定的語速） |
| 聽不清楚 | ✓ | ✓ | ✗ |
| 報讀軟體開著 | ✓ | ✗ | ✗（報讀軟體已經唸過按鈕名稱） |

**確認頁**（[`CallConfirm.tsx`](../src/components/elder/CallConfirm.tsx)，資料來自 [`services.json`](../src/data/services.json) 的 `ltc-1966`）

- 標題：「打給 1966 長照」
- 說明：「申請長期照顧：居家照顧、交通接送、輔具、喘息服務。也可以線上申請。」
- 主按鈕：「撥打 1966」，唸「撥打 1966 長照」
- 文字管道：「線上申請長照」。聽不清楚模式排在撥號前面。
- 沒有文字管道時（聽不清楚模式）：「這支電話目前只能用講的。可以請家人代打，或改用文字問 1999。」
- 最下面：「臺北市政府衛生局、臺北市長期照顧管理中心・官方說明（2026-11-07 查證）」→ 原則 8。

**失敗時**：一句話說原因、一句話說下一步，不出現錯誤代碼。

- 「這支手機不能撥電話。請改用其他方式，或請家人幫忙。」
- 「打不開。請試試其他方式，或請家人幫忙。」

**其他規則**

- 1999 走 App 內建的 `1999agree`，App 自己會跳確認對話框，不另做確認頁。
- 撥號確認頁 `/call/{id}` 只接受 `services.json` 登記的號碼，網址帶其他號碼一律 404，避免被帶到假號碼。
- 各模組不直接呼叫 bridge，一律用 `useRunAction`，確認頁、文字管道、失敗提示才會一致。

### 程式位置

- [`src/components/elder/ServiceButton.tsx`](../src/components/elder/ServiceButton.tsx)：大按鈕
- [`src/components/elder/ElderProvider.tsx`](../src/components/elder/ElderProvider.tsx)：`announce()`、`say()`、live region
- [`src/components/elder/useRunAction.ts`](../src/components/elder/useRunAction.ts)：執行 `phone_call`／`1999agree`／`open_link`／`open_external`／換頁
- [`src/components/elder/CallConfirm.tsx`](../src/components/elder/CallConfirm.tsx)、[`src/app/call/[id]/page.tsx`](../src/app/call/%5Bid%5D/page.tsx)：撥號確認
- [`src/components/elder/ServiceCard.tsx`](../src/components/elder/ServiceCard.tsx)：服務卡片（聽不清楚模式重排管道）
- [`src/components/elder/FailNote.tsx`](../src/components/elder/FailNote.tsx)：失敗訊息
- [`src/data/services.json`](../src/data/services.json)、[`src/lib/elder/services.ts`](../src/lib/elder/services.ts)
- [`src/lib/townpass/bridge.ts`](../src/lib/townpass/bridge.ts)、[`src/lib/townpass/elder.ts`](../src/lib/townpass/elder.ts)：呼叫 App（`haptic`、`speak`）

### 參考 commit

| 短 sha | 訊息 | 連結 |
|---|---|---|
| `629a8c0` | feat: 新增長輩模式網頁端橋接（M0）與長輩辨色色票 | [629a8c0](https://github.com/Peakqi-com/townpass2026-peakqi/commit/629a8c0c03ef36250f70a28ece0fc44be0e6115c) |
| `aba81e0` | feat: 找服務（M2）、服務清單（M3）、報讀軟體支援與語速設定 | [aba81e0](https://github.com/Peakqi-com/townpass2026-peakqi/commit/aba81e040a01a088836071646e8e689dea1c46d7) |
| `0a8feef` | feat: speak 語速上限放寬到 1.0；規格補上報讀軟體與語速要求 | [0a8feef](https://github.com/Peakqi-com/townpass2026-peakqi/commit/0a8feefd41d4fb53187314c45a4e4982c5aec8b1) |
| `4799a69` | a11y: 修掉兩處會唸兩次的錯誤訊息；新增報讀檢查腳本與原生機制對照 | [4799a69](https://github.com/Peakqi-com/townpass2026-peakqi/commit/4799a69d8e3757b823cdb1145bfaecd714eaeb71) |
| `1570708` | a11y: 操作失敗的訊息留在按鈕下方，不再 4 秒後消失 | [1570708](https://github.com/Peakqi-com/townpass2026-peakqi/commit/1570708c41f83fd572f63f397bce805e1449efe3) |

### 限制與未查證

- ⚠️ 還沒用實機開 VoiceOver／TalkBack 完整實測；目前是用瀏覽器在三種模式下各跑一次 `scripts/a11y-check.js`（[規格 §4.0](elder-mode-spec.md#40-報讀軟體voiceovertalkback與語速)）。
- ⚠️ TTS 的中文語音包在飛航模式下能不能用，要實機測；iOS 的語速可能達不到 3 倍。
- ⚠️ 1966 的線上申請系統在 2026-11-07 用 curl 打開是「維護中」（[補助研究 A.6](taipei-subsidies.md#a6-長照-2030-的四包錢與喘息衛福部臺北市衛生局長照管理中心)）。

---

## 3. 找服務（flow-3，M2）

流程圖：[`diagrams/flow-3-find.svg`](diagrams/flow-3-find.svg)

### 情境

金大森想問敬老卡的事，不知道是社會局還是交通局管。他按「說話或打字找服務」，按「開始說話」，說「敬老卡」，再按「停止說話」。

- 手機聽成「敬老咖」，還是找得到「敬老卡」。
- 畫面先問「你是說：「敬老咖」？」，再列出最多三張大卡片。
- 聽障長輩只看到打字框；不想打字也不想說話，可以用點的。

卡在：市府服務依機關分類；長輩的聲音容易被聽錯；VoiceOver 使用者很難「按住說話」。

### 政策與制度依據

| 依據 | 內容 | 出處 |
|---|---|---|
| 競賽須知伍、二、(四) | 執行時 LLM 推論「必須完全在裝置端執行」；評審可以要求關閉網路驗證 | ✅ [依據總表 §2.1](research-basis.md#21-競賽須知1150827-版) |
| 資通安全管理法第 11 條；須知同條 | 不得使用「危害國家資通安全產品」（含大陸廠牌）→ 不採用 sherpa-onnx | ✅ [依據總表 §2.2](research-basis.md#22-國內法規)；[README 第 6 節](../README.md#6-設計取捨) |
| 個資法第 5 條 | 語音只在手機辨識，不上傳 | ✅ [依據總表 §2.2](research-basis.md#22-國內法規) |

這條流程沒有專屬的服務法規。核心依據是「依需求而不是依機關組織服務」的研究：Wimmer 2002、Scholta 2019、Linders 2018（臺灣主動式服務個案）✅ [依據總表 §1.2](research-basis.md#12-依需求而不是依機關組織服務one-stopno-stop主動式服務m1m2m6)。

### UX 依據

- **原則 2 選項要少**：首頁之外的服務，用說的或打字找。
- **三種輸入**：打字、說話、點選。以手語為母語的聾人不使用語音（✅ 摘要，邱曉萍 2009）；打字和說話一樣顯眼（[無障礙研究 §4.4](accessibility-research.md#44-聽障者)）。
- **點一下開始、再點一下停止**：VoiceOver 使用者很難「按住不放」。5 位新手盲人追蹤八週：「學會這些裝置是艱難而漫長的過程」（✅ Rodrigues 2015，[無障礙研究 §1.2](accessibility-research.md#12-視障者)）。對應 WCAG 2.5.1。
- **先確認再執行**：高齡語音的辨識錯誤率比一般成人高（✅ Vipperla 2008）；失智組辨識錯誤更多，作者建議讓使用者自己修正（✅ Cohn 2026，[依據總表 §1.4](research-basis.md#14-長輩與語音介面長者語音的辨識錯誤率m2)）。
- **最多三筆**：淺層資訊階層 ✅；語音助理答錯會失去信任（✅ Pradhan 2020，[無障礙研究 §1.1](accessibility-research.md#11-高齡者)）。
- **WCAG 4.1.3**：「找到 2 個：…」寫進 live region。
- **開始收音時只震動不出聲**：避免錄到提示音或報讀軟體的聲音（[規格 §4.0](elder-mode-spec.md#40-報讀軟體voiceovertalkback與語速)）。
- **不用網頁的語音 API**：Android WebView 不支援 `speechSynthesis` ✅；網頁語音辨識預設送到雲端 ✅（MDN 原文）→ 改走 App 端 `listen` Handler（[無障礙研究 §5.1](accessibility-research.md#51-web-speech-api)、[README 第 6 節](../README.md#6-設計取捨)）。

### 背景數據

- 沒考慮用健保快易通的原因，「不清楚有什麼服務」每百人 16.6 人（八縣市）、雙北 17 人（數發部 S111）✅ [長輩研究 A.4](taipei-elderly-services.md#a4-不用或放棄政府數位服務的原因)
- 身障網路族用政府網站遇到的第一名問題是「找不到相關內容」，每百人 14.2 人 ✅ [視障聽障研究 A.3](taipei-disability-services.md#a3-使用政府數位服務遇到的具體困難)
- 視障網路族用「聲控或語音輸入」每百人 55.9 人 ✅ [視障聽障研究 A.1](taipei-disability-services.md#a1-視障者)
- 高齡語音詞錯誤率 47.8%、一般成人 36.4%（✅ Vipperla 2008；語料是美國最高法院錄音、2008 年的系統）
- 商用語音介面辨識聾人說話的詞錯誤率約 78%、聽人約 18%（✅ Glasser 2017，[依據總表 §1.4](research-basis.md#14-長輩與語音介面長者語音的辨識錯誤率m2)）

### 內容設計

**畫面**（[`FindScreen.tsx`](../src/components/elder/FindScreen.tsx)）

- 標題「找服務」。說明「想做什麼？用打的或用說的」；聽不清楚模式改成「想做什麼？用打的就可以」。
- 打字框提示「例如：我要叫車」，按鈕「找」。
- 說話按鈕「開始說話」／「停止說話」（`aria-pressed` 跟著變）。說明：「按一下開始，說完再按一次停止。聲音只在手機裡辨識，不會上傳。」收音中：「正在聽。說完再按一次「停止說話」。」
- 聽不清楚模式沒有說話按鈕。
- 點選：「或是用點的」，7 類：看病、交通、錢與福利、吃飯上課、聽不清楚、看不清楚、求助與防詐。按下唸「{分類}，有 {N} 項服務」。

**結果**（[`match.ts`](../src/lib/elder/match.ts)，實際跑出來的結果）

| 輸入 | 結果 | 唸出來 |
|---|---|---|
| 敬老咖（聽錯） | 敬老卡、重陽禮金 | 找到 2 個：敬老卡、重陽禮金 |
| 我要去看醫生 | 聯醫掛號 | 找到 1 個：聯醫掛號 |
| 我要叫車 | 我要叫車 | 找到 1 個：我要叫車 |

- 結果標題：「你是說：「{輸入}」？」
- 找不到：標題「找不到「{輸入}」」，說明「可以換個說法，或直接問市政府。」下面直接放 1999 熱線卡（聽不清楚模式放「文字聯絡」卡）。唸「找不到。可以換個說法，或問 1999。」
- 同分時，看不清楚模式把視障相關服務排前面，聽不清楚模式把聽障可用的排前面。

**說話不能用時**：一句話說原因，給另一條路。

- 「這支手機不能在手機裡直接聽懂說話。請改用打字或點選。」
- 「沒有麥克風權限。請改用打字或點選，或請家人幫忙打開權限。」

**為什麼不用 AI 模型**：正規化（全形轉半形、臺→台）後比對 `services.json` 的長輩說法（`phrases`）；都沒有確切命中，才用兩字片段補救聽錯的字。完全離線、結果可以預期。各局處可以從 1999 來電紀錄補充 `phrases`。

### 程式位置

- [`src/components/elder/FindScreen.tsx`](../src/components/elder/FindScreen.tsx)：畫面
- [`src/lib/elder/match.ts`](../src/lib/elder/match.ts)：比對（有單元測試）
- [`src/data/services.json`](../src/data/services.json)：31 筆服務與長輩說法
- [`src/lib/townpass/elder.ts`](../src/lib/townpass/elder.ts)：`listen`
- App 端：[`elder_mode_message_handlers.dart`](../townpass/lib/util/web_message_handler/elder_mode_message_handlers.dart)、[`elder_mode_platform.dart`](../townpass/lib/util/web_message_handler/elder_mode_platform.dart)、[`elder_mode_config.dart`](../townpass/lib/util/elder_mode_config.dart)（`listen` 只開放信任網域）

### 參考 commit

| 短 sha | 訊息 | 連結 |
|---|---|---|
| `aba81e0` | feat: 找服務（M2）、服務清單（M3）、報讀軟體支援與語速設定 | [aba81e0](https://github.com/Peakqi-com/townpass2026-peakqi/commit/aba81e040a01a088836071646e8e689dea1c46d7) |
| `5b9b912` | feat: 新增長輩模式 App 端橋接（M0）與補助、配色規格 | [5b9b912](https://github.com/Peakqi-com/townpass2026-peakqi/commit/5b9b91209469ba809a488e90be2adce4f25cbef0) |
| `1570708` | a11y: 操作失敗的訊息留在按鈕下方，不再 4 秒後消失 | [1570708](https://github.com/Peakqi-com/townpass2026-peakqi/commit/1570708c41f83fd572f63f397bce805e1449efe3) |

### 限制與未查證

- ⚠️ 手機能不能離線辨識 zh-TW，要實機確認；不支援就提示改用打字。
- ⚠️ 系統的裝置端語音辨識算不算須知所說的「模型推論」，要問主辦單位（[規格 §10](elder-mode-spec.md#10-風險與待確認)）。
- ⚠️ speech_to_text 在 Android 無法離線時可能默默改用雲端，這是讀 GitHub main 分支的程式碼，沒有和 7.5.0 比對。App 先用 `isOnDeviceRecognitionAvailable` 檢查，不支援就回錯誤。
- ⚠️ Demo 手機不要用大陸廠牌：內建辨識引擎由手機廠商提供（[依據總表 §2.6](research-basis.md#26-待確認) 第 5 點）。
- 聽不清楚模式拿掉說話按鈕是取捨：聽障者 90.35% 用口語溝通 ✅，說話對多數人其實可用；但收音提示聽不到，聾人語音辨識錯誤高。還沒有找長輩實測。
- 查不到：臺灣長輩用華語語音助理的同儕審查研究；「依需求找服務」的使用者測試研究（[依據總表「證據缺口」](research-basis.md#證據缺口與矛盾)）。
- 不宣稱支援台語：台語微調後字錯誤率仍約 30%（✅ Breeze Taigi 2026）。

---

## 4. 附近據點（flow-4，M9、M14、M15）

流程圖：[`diagrams/flow-4-places.svg`](diagrams/flow-4-places.svg)

### 情境

金大森的太太想找附近可以一起吃飯的地方。金大森按「吃飯上課」。

- 畫面直接寫「您住在中山區」，不用輸入地址。
- 按「共餐」，列出中山區的共餐點；同一里（正得里）的排前面。
- 按電話，先出現大字確認頁才撥。

同一個畫面也用在「照顧家人」（失智篩檢、喘息服務、照顧者支持、健康服務中心）和「打疫苗、做篩檢」（流感、肺炎鏈球菌、癌症篩檢、假牙補助院所）。視障出門（M10）和避難（M13）走同一條資料路，見[§12](#12-其他模組)。

卡在：長輩服務的開放資料幾乎沒有經緯度；地圖對報讀軟體讀不到；長輩不想輸入地址。

### 政策與制度依據

| 依據 | 內容 | 出處 |
|---|---|---|
| 老人福利法第 16 條第 1 項、第 27 條 | 照顧服務依「社會參與」等原則規劃；主管機關辦理老人休閒、體育活動 → M9 | ✅ [依據總表 §2.2](research-basis.md#22-國內法規) |
| 老人福利法第 31 條第 1 項第 4 款 | 對家庭照顧者提供「資訊提供及協助照顧者獲得服務」→ M14 | ✅ 同上 |
| 社區照顧關懷據點、長青學苑、老人服務中心 | 社會局；長青學苑 1999 轉 1574；老人服務中心週一至週五 8:30–17:30，1999 轉 1667 | ✅ [長輩研究 B.6](taipei-elderly-services.md#b6-社區照顧與學習) |
| 樂齡學習中心／學堂 | 教育局，55 歲以上，12 所中心加 57 所學堂 | ✅ 同上 |
| 公費流感、肺炎鏈球菌疫苗 | 衛生局；流感 115/10/1 開打；肺鏈 115/8/10 起改用 20 價或 21 價 | ✅ [長輩研究 B.5](taipei-elderly-services.md#b5-預防保健長者健檢與疫苗衛生局) |
| 政府資料開放授權條款第 1 版 | 利用時要「明確標示原資料提供機關」→ 畫面寫出資料集名稱 | ✅ [依據總表 §2.2](research-basis.md#22-國內法規) |

### UX 依據

- **原則 1 動作要熟**：結果是大字電話；**原則 5**：撥號前確認。
- **服務層原則 S7**：交通、位置資訊用一句話說完，不只畫地圖。⚠️ 「地圖對報讀軟體幾乎讀不到」是一般技術判斷，沒有國內量化數據（[視障聽障研究 A.4](taipei-disability-services.md#a4-服務層的設計原則介面層原則見-accessibility-researchmd-4)）。
- **WCAG 3.3.7 Redundant Entry**：用台北通帳號的行政區和里，不要長輩再輸入地址。
- **一次只列 10 個**：長輩一次看太多會找不到，報讀軟體也比較好跳讀；按「再看 10 個」。
- **換區時焦點移到結果標題**；報讀軟體開著時不再 `say()`，避免唸兩次。

### 背景數據

- 長輩服務類 data.taipei 資料集幾乎都沒有經緯度，只有地址和行政區代碼（2026-11-07 實際下載 28 個）✅ [長輩研究 C.0](taipei-elderly-services.md#c0-長輩服務相關的-datataipei-資料集2026-11-07-實際下載確認)
- 筆數：共餐 440、社區照顧關懷據點 510、長青學苑 17、老人服務中心 14、樂齡學習 56 學堂＋12 中心 ✅ 同上
- 臺北 65 歲以上：知道社區關懷據點 46.2%、使用 4.3%；不用的原因之一是「沒有熟識的朋友一起」（T113）✅ [依據總表 §0.2](research-basis.md#長輩最擔心最困擾的事依調查排序)
- 臺灣全國樣本追蹤 18 年：持續或晚年才參與社會活動，都和較少的憂鬱症狀有關（✅ Chiao 2011，[依據總表 §1.11](research-basis.md#111-社會參與共餐對長輩健康的影響m9)）。這是相關，不是因果。
- 失智症家庭只有 8% 使用長照；56% 的照顧者不知道有家庭照顧者支持服務（✅ 施姵宇 2017，[依據總表 §1.3](research-basis.md#13-福利沒領到non-take-up行政負擔提醒m6m12)）→ M14

### 內容設計

**畫面**（[`PlacesScreen.tsx`](../src/components/elder/PlacesScreen.tsx)，分類與說明在 [`community.ts`](../src/lib/elder/community.ts)）

- 「您住在中山區」，下面一句「依台北通帳號的地址。想看別區，可以換。」帳號沒有臺北市地址時：「台北通帳號裡沒有臺北市的地址，請點一下您住的區。」
- 「要找哪一種？」分類按鈕的字短，唸的話完整：

| 按鈕 | 唸出來 | 說明 |
|---|---|---|
| 共餐 | 附近共餐的地方 | 和鄰居一起吃飯的地方。 |
| 關懷據點 | 社區照顧關懷據點 | 社區裡的關懷據點，有健康課程，有的也有共餐。 |
| 長青學苑 | 長青學苑，給長輩上課的地方 | 給長輩上課的地方。 |

- 結果標題依資料的範圍換說法：
  - 依行政區：「中山區有 {N} 個共餐」
  - 全市只有幾處：「失智篩檢全市有 {N} 個，在中山區的排前面」
  - 依服務範圍：「可以服務中山區的喘息服務有 {N} 個」
- 「跟您同一里（正得里）的排在最前面。按電話會先問您要不要打。」
- 確認頁：「打給{名稱}」「撥打 {電話}」；有分機時「接通後，請說要轉分機 {分機}。」；「不打了，回到列表」；最下面「電話來自政府開放資料〈{資料集}〉，可能已經改號，請以現場為準。」
- 「怎麼去」用 OpenStreetMap 搜尋地址。打不開時：「地圖打不開。可以把地址給家人或計程車司機看。」
- 讀不到資料：「資料暫時讀不到。請稍後再試，或打 1999 問問看。」
- 癌症篩檢的說明照衛生局的寫法：「前往檢查時，建議先電洽醫療院所確認看診時段，並請攜帶健保卡。」

**後端**：網頁不直接抓 data.taipei，一律走 `/api/opendata/{來源}`。代理只認白名單裡的來源（不接受任意網址，避免變成跳板），處理 Big5 轉碼、ODS 解析、TWD97 座標換算，再用記憶體和 CDN 快取。查詢只送行政區名稱，不送座標。

### 程式位置

- [`src/components/elder/PlacesScreen.tsx`](../src/components/elder/PlacesScreen.tsx)：共用畫面
- [`src/components/elder/CommunityScreen.tsx`](../src/components/elder/CommunityScreen.tsx)（M9）、[`CareScreen.tsx`](../src/components/elder/CareScreen.tsx)（M14）、[`HealthPlacesScreen.tsx`](../src/components/elder/HealthPlacesScreen.tsx)（M15）
- [`src/lib/elder/community.ts`](../src/lib/elder/community.ts)：分類、標題句型、同一里排序（有單元測試）
- [`src/lib/opendata/sources.ts`](../src/lib/opendata/sources.ts)：白名單
- [`src/app/api/opendata/[source]/route.ts`](../src/app/api/opendata/%5Bsource%5D/route.ts)、[`src/lib/opendata/cache.ts`](../src/lib/opendata/cache.ts)、[`client.ts`](../src/lib/opendata/client.ts)

### 參考 commit

| 短 sha | 訊息 | 連結 |
|---|---|---|
| `535ea9b` | feat: 新增開放資料代理 /api/opendata/[source] | [535ea9b](https://github.com/Peakqi-com/townpass2026-peakqi/commit/535ea9b6fbe14baf7b4dc12ab6a1c4f9b1afae9b) |
| `999b734` | feat: 附近吃飯上課（M9）與視障出門（M10），新增 7 個開放資料來源 | [999b734](https://github.com/Peakqi-com/townpass2026-peakqi/commit/999b73487ff403e4c2e3792f9acd0ea91e977534) |
| `14bbcaf` | feat: 颱風地震時去哪裡、照顧家人、打疫苗做篩檢（M13～M15），補助小幫手加假牙補助 | [14bbcaf](https://github.com/Peakqi-com/townpass2026-peakqi/commit/14bbcaf9fe34cc0ccf69fd9787086b230b55dae0) |
| `7b740e7` | feat: M9 加入老人服務中心；資料來源表移除重複與未使用的列 | [7b740e7](https://github.com/Peakqi-com/townpass2026-peakqi/commit/7b740e76cea1c1ff5a64bd1daf93ee13b82975fa) |

### 限制與未查證

- 電話來自開放資料，可能改號；畫面已寫「請以現場為準」。
- ⚠️ data.taipei 的流感疫苗院所名單可能是上一季；衛生局今年改放 Google 試算表。
- ⚠️ data.taipei 有「75 歲以上」肺鏈疫苗院所名單，衛生局現行頁面是 65 歲以上，兩者關係不清楚，以衛生局頁面為準。
- 斷網時讀不到，畫面會說明並給 1999。
- 後端不記錄查詢參數，但 Vercel 的請求紀錄可能留下查詢網址（只有行政區名稱，不含姓名、生日、座標）（[依據總表 §2.6](research-basis.md#26-待確認) 第 4 點）。
- 共餐、社會參與的研究都是觀察性研究，不能說共餐「造成」健康改善。

---

## 5. 家人代設定（flow-5，M7）

流程圖：[`diagrams/flow-5-family.svg`](diagrams/flow-5-family.svg)

### 情境

金大森的女兒週末回家。她在自己的手機打開「用得了」，按首頁的「我是家人，幫長輩設定」。

- 勾 4～6 顆首頁按鈕，填自己的電話，稱呼寫「大女兒」，選「中山區」，再加上爸爸常坐的公車。
- 手機出現一張設定碼。
- 金大森按「打給家人」→「家人幫我設定」，對準一掃，整頁出現「設定好了」。

卡在：長輩不會設定；家人不常在身邊；設定不該經過伺服器。

### 政策與制度依據

| 依據 | 內容 | 出處 |
|---|---|---|
| 個資法第 51 條第 1 項第 1 款 | 「自然人為單純個人或家庭活動之目的」蒐集、處理或利用個資，不適用本法 → 家人用 QR code 代設定，不經過伺服器 | ✅ [依據總表 §2.2](research-basis.md#22-國內法規) |
| 個資法第 2 條第 1 款 | 個資包括「聯絡方式」→ 家人電話只存在手機 | ✅ 同上 |
| 老人福利法第 31 條第 1 項第 4 款 | 對家庭照顧者提供「資訊提供及協助照顧者獲得服務」 | ✅ 同上 |
| CRPD 第 22 條第 2 項 | 保障個人資料的隱私 | ✅ 同上 |

### UX 依據

- **原則 7 家人是共同使用者**：設定由家人做，按鈕由長輩自己按。
- **原則 2 選項要少**：首頁 4～6 顆由家人挑。
- **溫暖專家**：身邊懂科技的親友，是新手學會上網的關鍵（✅ Bakardjieva 2005）。家人的協助常常不夠即時，長輩只能等（✅ Hunsaker 2019）→ 把協助縮短成一次掃描，之後長輩自己用。[依據總表 §1.8](research-basis.md#18-家人代理使用科技proxy-usewarm-expertsm7)
- **保護與監督的張力**：家人會從「保護」變成「監督」（✅ Tang 2022）→ 設定碼只放按鈕、電話、行政區、公車，不回報長輩的使用情形。
- **WCAG 3.3.7 Redundant Entry**：長輩不用輸入任何東西。
- **防假冒**：檢查格式、版本，擋掉控制字元和會讓文字反向顯示的格式字元（例如 U+202E），避免有人做出假冒稱呼的設定碼。

### 背景數據

- 用過健保快易通的 60 歲以上長輩，42.2% 靠別人幫忙操作；幫忙的人每百人有 79 位是子女（數發部 S111）✅ [長輩研究 A.3](taipei-elderly-services.md#a3-操作方式與求助對象)
- 60 歲以上網路族上網遇到問題，每百人 65 人找子女 ✅ 同上
- 臺北長輩不用扶老修繕補助的原因之一是「需要家人決定」（T113）✅ [依據總表 §0.2](research-basis.md#什麼會讓長輩願意下載繼續用)
- 美國 65 歲以上約四分之三表示「通常需要別人幫我設定或教我用」（✅ Pew 2017，同上）

### 內容設計

**家人的手機**（[`FamilySetup.tsx`](../src/components/elder/FamilySetup.tsx)）

- 標題「幫長輩設定」。第一句：「選好後會出現一張設定碼，用長輩的手機掃一下就完成。設定只放在設定碼裡，不會上傳。」
- 「1. 長輩首頁的按鈕（4～6 個）」，下面一句「已選 {N} 個。少一點，長輩比較好找。」；「打給家人」旁邊寫「（一定要有，長輩才打得到您）」。
- 「2. 家人的電話（1～3 位）」：「長輩怎麼叫您（最多 10 個字）」，提示「例如：大兒子」。
- 「3. 長輩住哪一區」；「4. 長輩常坐的公車（可以不設）」（見 [§8](#8-公車還有幾分鐘到flow-8m16)）。
- 按「產生設定碼」→ 唸「設定碼做好了，請用長輩的手機掃描」（報讀軟體開著時不唸，焦點移過去就會唸）。
- 設定碼下方：「用長輩的手機：用得了 →「打給家人」→「家人幫我設定」，對準這張碼。」

**長輩的手機**（[`FamilyScreen.tsx`](../src/components/elder/FamilyScreen.tsx)）

- 還沒設定時：「還沒有家人的電話」「請家人幫忙設定，只要掃一下就好：」，下面三步驟。
- 按鈕「家人幫我設定」，旁邊一句「設定只存在這支手機，不會上傳。」
- 掃描成功：整頁換成「設定好了」，列出首頁的按鈕、家人的電話、住的地方、常坐的公車；唸「設定好了。家人幫您設定的內容在畫面上」；按鈕「回首頁看看」。
- 設定碼不能用時說出原因：「這張設定碼不能用：{原因}。請家人重新做一張設定碼。」原因例如「版本不對，請兩邊都更新台北通」「首頁按鈕要選 4～6 個」「第 1 位聯絡人的電話要是 3～15 位數字」。

**打給家人**：按「打給大女兒」先到確認頁「撥打 {電話}」。聽不清楚模式：「聽不清楚的話，可以改傳 LINE 或簡訊給家人。」並有「傳簡訊給大女兒」。

**不做的**：「每日報平安，沒按就通知家人」要伺服器或簡訊，也有通報責任問題，列為下一階段（[README 第 6 節](../README.md#6-設計取捨)）。

### 程式位置

- [`src/components/elder/FamilySetup.tsx`](../src/components/elder/FamilySetup.tsx)：家人端，產生 QR code
- [`src/components/elder/FamilyScreen.tsx`](../src/components/elder/FamilyScreen.tsx)：長輩端，掃描、打給家人
- [`src/lib/elder/familyConfig.ts`](../src/lib/elder/familyConfig.ts)：設定碼格式與檢查（有單元測試）
- [`src/components/elder/useFamilyConfig.ts`](../src/components/elder/useFamilyConfig.ts)、[`src/components/elder/BusPicker.tsx`](../src/components/elder/BusPicker.tsx)
- [`src/lib/townpass/bridge.ts`](../src/lib/townpass/bridge.ts)：呼叫 App 內建的 `qr_code_scan`

### 參考 commit

| 短 sha | 訊息 | 連結 |
|---|---|---|
| `7a9c5bc` | feat: 家人（M7）：打給家人、家人用 QR code 代設定首頁按鈕 | [7a9c5bc](https://github.com/Peakqi-com/townpass2026-peakqi/commit/7a9c5bccdf9ab481de9c93eaa3352e4df946790d) |
| `cf26e79` | feat: 首頁加「我是家人，幫長輩設定」入口 | [cf26e79](https://github.com/Peakqi-com/townpass2026-peakqi/commit/cf26e79154a239eb7e45ec97a22910b3ec9a3728) |
| `ffe79c7` | feat: 掃完家人的設定碼後換成整頁「設定好了」 | [ffe79c7](https://github.com/Peakqi-com/townpass2026-peakqi/commit/ffe79c7f3e19d013dea88fbdaf58fb5e95f12c2b) |
| `4e37944` | fix: iOS 掃完設定碼沒反應——App 回覆的反斜線被吃掉 | [4e37944](https://github.com/Peakqi-com/townpass2026-peakqi/commit/4e3794417b78645042e8ab0d1a528f12c15f4d02) |
| `bc34670` | feat: 設定碼不能用時說出原因 | [bc34670](https://github.com/Peakqi-com/townpass2026-peakqi/commit/bc34670697118fd501999bc001a0546fb733333d) |

### 限制與未查證

- ⚠️ 設定存在 `localStorage`，WebView 重啟後是否保留要實機確認；換手機或清除資料就要重掃。
- ⚠️ iOS 掃碼的回覆問題已修（`4e37944`），兩個平台仍要實機再測一次。
- 「家人就是子女」不一定成立：代為上網的人從子孫轉向配偶（✅ Grošelj 2022）。
- 查不到臺灣「家人代理使用」的同儕審查研究（[依據總表 §1.8](research-basis.md#18-家人代理使用科技proxy-usewarm-expertsm7)）。

---

## 6. 權益提醒（flow-6，M6）

流程圖：[`diagrams/flow-6-benefit.svg`](diagrams/flow-6-benefit.svg)

### 情境

金大森打開「我的權益」。

- 最上面是「很多人不知道的權益」：老人健保費補助、長照交通接送、照顧家人。
- 接著是重陽禮金卡。他今年 86 歲，還沒領到 3,000 元。
- 他今天沒空申請，按「提醒我申請」。11/12 早上 9 點手機會跳通知，App 關掉、斷網也會跳。

卡在：不知道有哪些權益；知道了也會忘記截止日；線上申請入口不可靠。

### 政策與制度依據

| 權益 | 依據與重點 | 出處 |
|---|---|---|
| 重陽禮金 | 自治條例第 3–6 條：資格、匯款方式、12/31 前補發；發放金額標準第 3 條。社會局 115 年：85～98 歲 3,000 元（今年調高）、第二波 11/13 前申請、12/1 入帳 | ✅ [依據總表 §2.3](research-basis.md#23-臺北市法規)、[長輩研究 B.7](taipei-elderly-services.md#b7-照護補助與安全) |
| 重陽禮金線上申請 | `welfare.gov.taipei/olds/Home`，不用登入，只要身分證字號和電話 | ✅ [補助研究 B.1](taipei-subsidies.md#b1-線上申辦入口現況2026-11-07-實測)（⚠️ 頁面上的公告文字沒更新） |
| 老人健保自付額補助 | 社會局；每人每月最多 826 元，社會局主動審核；設籍滿 1 年、所得稅率未達 20% | ✅ [長輩研究 B.7](taipei-elderly-services.md#b7-照護補助與安全)、[補助研究總表](taipei-subsidies.md#補助總表) |
| 長照交通接送 | 社會局；長照 2 級以上；每月 1,680 元，一般戶自付 30% | ✅ [長輩研究 B.3](taipei-elderly-services.md#b3-交通復康巴士長照交通接送敬老愛心計程車-) |
| 敬老卡 | 敬老悠遊卡及愛心悠遊卡補助辦法第 3–5 條；115/7 起每月 600 點；聯醫掛號扣 50 點；計程車每趟最多 85 點；「600 點要到區公所辦」是謠言（市府 115/6/30 澄清） | ✅ [依據總表 §2.3](research-basis.md#23-臺北市法規)、[長輩研究 B.1](taipei-elderly-services.md#b1-敬老愛心卡社會局) |
| 老人健檢 | 老人健康檢查補助實施辦法第 3、6 條；115 年網路預約優先族群 1/15 起、一般長者 1/22 起 | ✅ [依據總表 §2.3](research-basis.md#23-臺北市法規)、[長輩研究 B.5](taipei-elderly-services.md#b5-預防保健長者健檢與疫苗衛生局) |

**「主動告知」的法源**：老人福利法沒有「主動告知福利」的明文。依據總表建議改引 CRPD 第 21 條 (a)（公眾資訊要「及時提供」）和人工智慧基本法第 4 條（「降低可能之數位落差」）✅ [依據總表 §2.6](research-basis.md#26-待確認) 第 9 點。

### UX 依據

- **原則 6 主動告訴**：用生日判斷資格，不等長輩來問。臺灣電子化政府從「等民眾申請」改成「主動推送」（✅ Linders 2018）。
- **原則 8**：每張卡片寫主責機關、官方說明連結、查證日期。
- **提醒要附申請方法**（[依據總表 §1.3](research-basis.md#13-福利沒領到non-take-up行政負擔提醒m6m12)）：
  - ✅ Bhargava 2015：收到信、內容簡化、金額寫清楚，申領就明顯增加。
  - ✅ Linos 2022（矛盾證據）：6 個實驗裡，提醒都沒有提高申領。
  - ✅ Daigneault 2025：最有效的是「把資訊給對、說清楚」和「協助申請」。
  - 所以卡片不只提醒，也寫要準備什麼、去哪裡辦。
- **依認知率排序**：認知率低的放最上面，大家都知道的往下放（[依據總表 §0.2 建議調整](research-basis.md#建議調整只是建議不要求現在做)）。

### 背景數據

- 臺北 65 歲以上：重陽禮金 98.4% 知道、95.0% 已領；敬老卡 99.1% 知道（T113）✅ [依據總表 §0.2](research-basis.md#長輩最擔心最困擾的事依調查排序)
- 臺北 65 歲以上：只有 50.5% 知道健保自付額補助；長照交通接送 58.5% 知道、4.5% 使用（T113）✅ 同上
- 「不清楚有什麼服務」每百人 16.6 人（S111）✅ [長輩研究 A.4](taipei-elderly-services.md#a4-不用或放棄政府數位服務的原因)
- 有長照資訊的家庭比較會使用長照（OR 1.76，✅ 施姵宇 2017）

### 內容設計

**畫面**（[`BenefitsScreen.tsx`](../src/components/elder/BenefitsScreen.tsx)）

- 開頭：「您今年 86 歲，下面是您可能可以用的權益。最後以主責機關審核為準。」
- 最上面的入口：「補助小幫手：看看能領什麼」（見 [§11](#11-補助小幫手m12)）。

**很多人不知道的權益**

- 「這些權益很多人沒聽過。看看您或家人用不用得到。」
- 「老人健保費補助：每人每月最多 826 元」，說明「社會局會主動審核，直接繳給健保署。被停補的人可以申請恢復。」→ 寫「不用申請」，避免長輩白跑區公所（[補助研究 C.2](taipei-subsidies.md#c2-容易寫錯的地方)）。
- 「想知道有沒有被停補、怎麼恢復，可以打 1999，接通後請說：「轉分機 6966～6968」。」
- 長照交通接送的服務卡；「照顧家人：失智篩檢、喘息服務」。

**重陽禮金**

- 標題「還沒收到重陽禮金嗎？」，「您今年可能可以領 3,000 元。」「還有 6 天截止（11/13），12 月 1 日入帳。」
- 「線上申請不用登入，要準備身分證字號、電話和銀行帳戶。也可以到區公所申請。」下面寫中山區公所社會課的地址。
- 按鈕：「線上申請匯款」「看怎麼申請」「提醒我申請」。
- 截止後改成「申請期已過，12 月 31 日前可以申請補發。」

**提醒我申請**（[`ReminderButton.tsx`](../src/components/elder/ReminderButton.tsx)、[`reminders.ts`](../src/lib/elder/reminders.ts)）

- 通知時間：截止前一天 11/12 早上 9 點；已經過了就改成 11/13 早上 9 點；都來不及就不顯示按鈕。
- 通知標題「重陽禮金明天截止」，內文「還沒申請的話，打開台北通的「用得了」就能線上申請匯款，也可以到區公所申請。」
- 設好後唸：「好了，11 月 12 日（星期四）早上 9 點會跳出通知提醒您。」畫面留著「已設定提醒：…會跳出手機通知。」和「取消提醒」。
- 沒有通知權限：「台北通沒有通知權限。請到手機的設定，打開台北通的通知，再按一次。」

**敬老卡**：標題「敬老卡：每個月 600 點」。條列掛號 50 點、計程車 85 點（手機撥 55850）、12 種交通工具與 71 處場館、當月沒用完不累積。另外一段「小心謠言：「600 點要到區公所辦」是假的。點數會在每月第一次刷卡時自動寫入，不用跑區公所。」查剩幾點目前請打 1999。

### 程式位置

- [`src/components/elder/BenefitsScreen.tsx`](../src/components/elder/BenefitsScreen.tsx)：畫面
- [`src/lib/elder/benefits.ts`](../src/lib/elder/benefits.ts)：依年齡、市民身分挑卡片（有單元測試）
- [`src/lib/elder/profile.ts`](../src/lib/elder/profile.ts)、[`giftCopy.ts`](../src/lib/elder/giftCopy.ts)：禮金規則與文字
- [`src/components/elder/ReminderButton.tsx`](../src/components/elder/ReminderButton.tsx)、[`src/lib/elder/reminders.ts`](../src/lib/elder/reminders.ts)：提醒
- [`src/components/elder/ChannelButtons.tsx`](../src/components/elder/ChannelButtons.tsx)：申請管道按鈕（撥號旁自動補「用文字問 1999」）
- [`src/data/subsidies.json`](../src/data/subsidies.json)、[`src/data/services.json`](../src/data/services.json)
- App 端：[`elder_mode_message_handlers.dart`](../townpass/lib/util/web_message_handler/elder_mode_message_handlers.dart)（`reminder`）

### 參考 commit

| 短 sha | 訊息 | 連結 |
|---|---|---|
| `0a25f3a` | feat: 我的權益（M6）與補助小幫手（M12） | [0a25f3a](https://github.com/Peakqi-com/townpass2026-peakqi/commit/0a25f3ad0c841fc41456a08aa236ca214008770b) |
| `1ef7d90` | feat(M6): 新增 reminder Handler，排程手機通知（App 關掉也會跳） | [1ef7d90](https://github.com/Peakqi-com/townpass2026-peakqi/commit/1ef7d9001d340f5546f69fd76a244b7ef5f0e7af) |
| `04c6851` | feat(M6): 重陽禮金「提醒我申請」，用 App 的 reminder Handler 排程手機通知 | [04c6851](https://github.com/Peakqi-com/townpass2026-peakqi/commit/04c68515a1576116766896d80cfc93b9ce49e826) |
| `7400258` | feat: 補助小幫手可以幫家人看、找不到時有退路、打電話的第一句話；我的權益主推少人知道的權益 | [7400258](https://github.com/Peakqi-com/townpass2026-peakqi/commit/7400258d73cf285a0445cb5e8a7952ec6de113b2) |

### 限制與未查證

- ⚠️ 老人健保自付額補助的 1999 分機：程式用老福科通用分機 6966～6968；長輩研究 B.7 寫 6967。兩份研究文件不一致。
- ⚠️ 「2024 年底只有約 6% 長輩用完敬老卡點數」出自新聞報導，沒有市府原文，沒有放進畫面（[規格 M6](elder-mode-spec.md#m6-我的權益現有服務延續服務)）。
- ⚠️ 敬老卡 12 種交通工具、71 處場館的完整清單查不到。
- ⚠️ 公費疫苗資格依疾管署年度計畫，法源沒有查（[依據總表 §2.6](research-basis.md#26-待確認) 第 10 點）。
- 敬老卡餘額要市府介接，目前只能打 1999 問。
- 只用年齡和市民身分判斷；設籍時間、所得稅率判斷不了，所以只說「可能可以」。
- 禮金規則只寫 115 年，明年要更新，否則卡片不顯示。
- Android 用不精確排程（不需要精確鬧鐘權限），通知時間可能稍晚；⚠️ 實際延遲沒有實測。

---

## 7. 看完醫生之後（flow-7，M4）

流程圖：[`diagrams/flow-7-followup.svg`](diagrams/flow-7-followup.svg)

### 情境

金大森在聯醫看完高血壓，醫生說 11 月 20 日回診。

- 他回到「看醫生」頁，按「看完醫生之後」→「回診」→ 選 11 月 20 日 →「提醒我回診」。
- 11 月 19 日晚上 7 點，手機跳出「明天要回診」。
- 他再按「傳給家人知道」。簡訊 App 打開、內文寫好了，他自己按送出。

卡在：慢性病要定期回診、領連續處方箋，很容易忘；家人想知道，但不在身邊。

### 政策與制度依據

| 依據 | 內容 | 出處 |
|---|---|---|
| 個資法第 6 條第 1 項 | 病歷、醫療、健康檢查個資原則上「不得蒐集、處理或利用」→ 回診日期只存在手機，不送到伺服器 | ✅ [依據總表 §2.2](research-basis.md#22-國內法規) |
| CRPD 第 22 條第 2 項 | 保障「個人、健康與復健資料之隱私」 | ✅ 同上 |
| 聯醫掛號（M4 看醫生頁） | 網路掛號；24 小時語音掛號 (02)2181-1995；115/1 起一般長者在 21 處聯醫門診刷敬老卡扣 50 點 | ✅ [長輩研究 B.4](taipei-elderly-services.md#b4-就醫臺北市立聯合醫院-)、[B.1](taipei-elderly-services.md#b1-敬老愛心卡社會局) |

回診提醒本身沒有直接的法規依據。它補的是依據總表「主線 A：身體不舒服，要去看醫生」第 4 步「看完之後」的缺口 ✅ [依據總表 §0.2 建議調整](research-basis.md#建議調整只是建議不要求現在做)。

### UX 依據

- **原則 3**：手機通知＋畫面大字；**原則 6**：主動提醒；**原則 7**：可以傳給家人。
- **長輩自己按送出**：只打開簡訊 App、帶好內文，不自動送出、不經過伺服器。對應家人「保護」和「監督」的張力（✅ Tang 2022）。
- **來不及就說明，不硬排**：前一天晚上 7 點已過就改當天早上 7 點；都過了就說「這一天已經過了，來不及提醒。」（原則 5）
- **不寫沒查證的規則**：內文只提醒要帶的東西，不寫健保的領藥期限。

### 背景數據

- 65 歲以上最在意的事，第 1 名是「自己的健康」49.23%（衛福部 111 年老人狀況調查）✅ [依據總表 §0.2](research-basis.md#長輩最擔心最困擾的事依調查排序)
- 臺北 65 歲以上有慢性病的占 71.7%（T113）✅ 同上
- 視障者吃藥有困難 38.60%（衛福部 110 年身障者調查）✅ [依據總表 §0.2 建議調整](research-basis.md#建議調整只是建議不要求現在做)
- 60 歲以上網路族遇到問題，每百人 65 人找子女（S111）✅ [長輩研究 A.3](taipei-elderly-services.md#a3-操作方式與求助對象)

### 內容設計

**看醫生頁**（[`HealthScreen.tsx`](../src/components/elder/HealthScreen.tsx)）

- 標題「看醫生」，第一句「掛號、叫車、找人照顧，都在這一頁。」
- 依序：聯醫掛號（掛號）→ 我要叫車（怎麼去）→ 1966 長照（找人照顧），跨聯醫、交通局、社會局、衛生局。
- 聯醫卡片下：「掛號費可以用敬老卡付：在聯醫門診刷敬老卡，每次扣 50 點。」
- 聽不清楚模式另外加「看診溝通卡」「用文字聯絡」和手語翻譯聽打。

**看完醫生之後**

- 「選下次回診或領藥的日子，前一天晚上 7 點手機會跳出通知提醒您。」
- 「要提醒什麼？」：「回診」或「領慢性病連續處方箋的藥」。「哪一天？」：最早明天，最晚 400 天後（App 的上限）。
- 按鈕「提醒我回診」／「提醒我領藥」。

| 項目 | 回診 | 領藥 |
|---|---|---|
| 通知標題 | 明天要回診 | 明天要領藥 |
| 通知內文 | 11 月 20 日（星期五）要回診，記得帶健保卡和藥袋。 | 11 月 20 日（星期五）要領藥，記得帶健保卡、慢性病連續處方箋和藥袋。 |
| 時間 | 11 月 19 日 19:00 | 同左 |

**傳給家人知道**（[`ShareToFamily.tsx`](../src/components/elder/ShareToFamily.tsx)、[`share.ts`](../src/lib/elder/share.ts)）

- 「會傳出這段文字（送出前可以再改）：」
- 內文用長輩自己的口氣：「我 11 月 20 日（星期五）要回診，記得提醒我帶健保卡。— 金大森」
- 每位家人一顆「傳簡訊給{稱呼}」。另外一直有「複製這段文字」→「複製好了，可以貼到 LINE 傳給家人。」
- 沒設定家人：「還沒設定家人。可以先複製，貼到 LINE；或請家人幫您設定，之後就能直接傳簡訊。」

### 程式位置

- [`src/components/elder/HealthScreen.tsx`](../src/components/elder/HealthScreen.tsx)：看醫生頁與「看完醫生之後」
- [`src/lib/elder/reminders.ts`](../src/lib/elder/reminders.ts)：提醒時間與文字（有單元測試）
- [`src/components/elder/ReminderButton.tsx`](../src/components/elder/ReminderButton.tsx)
- [`src/components/elder/ShareToFamily.tsx`](../src/components/elder/ShareToFamily.tsx)、[`src/lib/elder/share.ts`](../src/lib/elder/share.ts)：傳給家人
- App 端：[`elder_mode_message_handlers.dart`](../townpass/lib/util/web_message_handler/elder_mode_message_handlers.dart)（`reminder`、`open_external`）

### 參考 commit

| 短 sha | 訊息 | 連結 |
|---|---|---|
| `d8670bc` | feat: 我要看醫生（M4）與我要叫車（M5） | [d8670bc](https://github.com/Peakqi-com/townpass2026-peakqi/commit/d8670bc8f35a9fcd269134a4cb258132be89ca6b) |
| `1ef7d90` | feat(M6): 新增 reminder Handler，排程手機通知（App 關掉也會跳） | [1ef7d90](https://github.com/Peakqi-com/townpass2026-peakqi/commit/1ef7d9001d340f5546f69fd76a244b7ef5f0e7af) |
| `4c412bd` | feat: 共用「傳給家人知道」元件、原始碼連結、填入主辦指定的 AGPL 授權聲明 | [4c412bd](https://github.com/Peakqi-com/townpass2026-peakqi/commit/4c412bd293f0ae7194758ef9cb7bc3f209179c07) |
| `7ac5c43` | feat: 回診／領藥提醒、叫車退路、求助頁分兩條 | [7ac5c43](https://github.com/Peakqi-com/townpass2026-peakqi/commit/7ac5c43b1ede4ff345b9c0a1a06da742df35fe1d) |
| `9ef99e8` | fix: iOS 日期、時間欄超出畫面，整頁可以左右滑 | [9ef99e8](https://github.com/Peakqi-com/townpass2026-peakqi/commit/9ef99e82a5af5d79179818f2fcff4ee6f8ad377f) |

### 限制與未查證

- ⚠️ `sms:號碼?&body=` 能不能帶入內文，Android／iOS 要實機確認。
- ⚠️ 健保的領藥期限等規則沒有查證健保署官方頁面，所以不寫。
- ⚠️ 聯醫語音掛號可以掛門診日前 1～28 天的號，只在搜尋摘要看到。
- 傳給家人的內文只有日期和要帶的東西，沒有醫院和交通方式（依據總表建議的「幾點、哪家醫院、怎麼去」還沒做）。
- 提醒排在手機的 App 裡，換手機或重裝 App 就沒有了。

---

## 8. 公車還有幾分鐘到（flow-8，M16）

流程圖：[`diagrams/flow-8-bus.svg`](diagrams/flow-8-bus.svg)

### 情境

金大森每週二搭公車去上課。以前他站在站牌等，不知道還要等多久，看板的字也太小。

- 女兒在「幫長輩設定」時加了他常坐的公車和上車的站牌（規格的示範是「307 往撫遠街・南京三民路口」）。
- 現在首頁直接顯示「還有 7 分鐘」，畫面看得到時每 30 秒自動更新。
- 他按「再查一次」，手機會唸出來。

卡在：一般公車 App 要自己搜尋路線、選方向、找站；視障者看不到站牌的動態看板。

### 政策與制度依據

| 依據 | 內容 | 出處 |
|---|---|---|
| 公車預估到站資料 | 臺北市公共運輸處（新北市同格式）；data.taipei〈臺北市預估到站時間(公車)〉等，實際資料在公運處 blob；`EstimateTime` 特殊值依〈臺北市Data.Taipei平台API說明文件〉V6.3 | ✅ 2026-11-07 實測，[開放資料 §3.2](open-data.md#32-公車預估到站m162026-11-07-實測apibus) |
| 身權法第 52 條第 1 項第 3 款 | 公共資訊無障礙 → 到站時間要讓報讀軟體讀得到 | ✅ [依據總表 §2.2](research-basis.md#22-國內法規) |
| CRPD 第 9 條第 1 項 (b) | 無障礙範圍包括「資訊、通信及其他服務」 | ✅ 同上 |
| 市府現有措施 | 臺北好行 App 有視障介面與乘車通報（交通局）；公運處無障礙乘車諮詢只有電話 (02)2727-4168 | ✅ [視障聽障研究 B.2](taipei-disability-services.md#b2-視障者)、[B.1-6](taipei-disability-services.md#b1-6-交通捷運與公車) |

### UX 依據

- **原則 7**：路線、方向、站牌由家人設定，長輩只看。
- **原則 3**：按「再查一次」唸出來＋大字。自動更新不自己唸，避免打斷。
- **以「看」為主，不要求長輩輸入**：75 歲以上社群參與 87.3%，發文留言只有 20.0%（✅ [長輩研究 A.5](taipei-elderly-services.md#a5-由證據歸納的介面設計原則) P6）。
- **服務層原則 S7**：交通資訊用一句話說完。
- **視障者搭車需要公車與站牌資訊**：13 位盲人和盲聾者最在意「獨立」和「安全」（✅ Azenkot 2011）；臺北 5 位重度視障者對公車語音播報不滿意（✅ 李森光 2012）。[依據總表 §1.6](research-basis.md#16-視障者用手機螢幕閱讀器大眾運輸資訊需求m0m10)

### 背景數據

- 搭乘交通工具有困難：視障者 73.86%、聽障者 45.83%（衛福部 110 年身障者調查表 78）✅ [依據總表 §0.2](research-basis.md#長輩最擔心最困擾的事依調查排序)
- 65 歲以上日常生活「獨自外出」需要別人幫忙 16.16%（衛福部 111 年）✅ 同上
- 公運處的預估資料每 15～20 秒更新一次（實測）✅ [開放資料 §3.2](open-data.md#32-公車預估到站m162026-11-07-實測apibus)

### 內容設計

**長輩首頁**（[`BusCard.tsx`](../src/components/elder/BusCard.tsx)，時間文字在 [`bus.ts`](../src/lib/bus/bus.ts) `etaText`）

- 卡片標題「公車還有幾分鐘」。每一列是家人設定的名稱和時間。
- 時間的說法：

| 資料 | 畫面與唸出來 |
|---|---|
| 1 分鐘以上 | 還有 {N} 分鐘 |
| 不到 1 分鐘 | 快到了 |
| -1 尚未發車 | 還沒發車 |
| -2 交管不停靠 | 交通管制，這一站不停 |
| -3 末班車已過 | 末班車已經過了 |
| -4 今日未營運 | 今天沒有開 |

- 「{時間} 查的，每 30 秒自動更新。資料：（臺北市公共運輸處）」
- 「再查一次」→ 唸「307 往撫遠街・南京三民路口，還有 7 分鐘」。
- 查不到：唸「公車時間查不到。可能是沒有網路，請稍後再試。」畫面留「可能是沒有網路。有網路時再按一次「再查一次」。」路線名稱存在設定碼裡，斷網也看得到。
- 每一列下面有「帶我走到站牌」（見 [§9](#9-帶我走到站牌flow-9m16-延伸)）。

**家人設定**（[`BusPicker.tsx`](../src/components/elder/BusPicker.tsx)）

- 「4. 長輩常坐的公車（可以不設）」「設好後，長輩的首頁會顯示「還有幾分鐘到」。最多 2 組，臺北市、新北市的公車都可以。」
- 「路線，例如 307」→「找到 {N} 條路線，請選一條」→「307 要往哪個方向？」→「長輩在哪一站上車？可以打站名找」→「加好了：{名稱}」。
- 存的是站牌代號：一個代號就代表「這條路線、這個方向、這一站」。只用站名會分不清環狀路線的同名站。

### 程式位置

- [`src/components/elder/BusCard.tsx`](../src/components/elder/BusCard.tsx)：首頁卡片
- [`src/components/elder/BusPicker.tsx`](../src/components/elder/BusPicker.tsx)：家人選路線、方向、站牌
- [`src/lib/bus/bus.ts`](../src/lib/bus/bus.ts)、[`data.ts`](../src/lib/bus/data.ts)、[`client.ts`](../src/lib/bus/client.ts)：解析與時間文字（有單元測試）
- [`src/app/api/bus/`](../src/app/api/bus/)：`routes`、`stops`、`eta` 三支 API
- [`src/lib/elder/familyConfig.ts`](../src/lib/elder/familyConfig.ts)：公車編進設定碼

### 參考 commit

| 短 sha | 訊息 | 連結 |
|---|---|---|
| `ab6fc47` | feat: 公車還有幾分鐘到（M16） | [ab6fc47](https://github.com/Peakqi-com/townpass2026-peakqi/commit/ab6fc47175177fd2328b33cdf59e15fa88ceb162) |
| `8d7a23e` | feat: M16 延伸「帶我走到站牌」步行語音導航 | [8d7a23e](https://github.com/Peakqi-com/townpass2026-peakqi/commit/8d7a23ea7458731756c4443d635c36926cb79bb6) |
| `d8d1764` | fix: 「找路線」按鈕白底白字；掃完設定碼看不到「設定好了」 | [d8d1764](https://github.com/Peakqi-com/townpass2026-peakqi/commit/d8d17640311ed43423d7d78c5c5ed0d753b1eb8d) |

### 限制與未查證

- 到站時間一定要連網。
- ⚠️ 站牌裁撤後代號會消失（實測預估檔有 571 筆在站牌檔找不到）；查不到時要請家人重新設定。
- ⚠️ 臺北好行「乘車通報」在 2023 年後實際的路線數沒有查到。
- 只有家人設定的 2 組，沒有轉乘建議。

---

## 9. 帶我走到站牌（flow-9，M16 延伸）

流程圖：[`diagrams/flow-9-walk.svg`](diagrams/flow-9-walk.svg)

### 情境

金大森到天母找老朋友，要搭公車回家。女兒設定的站牌在天母。（步行路網目前只涵蓋會場周邊：天母、芝山、明德。）

- 他在首頁公車卡片按「帶我走到站牌」。
- 手機說：「走到站牌大約 6 分鐘，公車還有 9 分鐘，來得及，慢慢走就好。」
- 他按「開始帶我走」，手機拿在手上走。快到路口時手機說「直走 40 公尺，右轉進入天母東路」；到了路口震動並說「現在右轉」。
- 要過的路口有有聲號誌，就提醒「聽到嗶嗶聲再走」。
- 視障長輩不用看螢幕，聽語音、感覺震動就能走。

卡在：視障者外出常要人陪；一般導航 App 太複雜；斷網就不能用。

### 政策與制度依據

| 依據 | 內容 | 出處 |
|---|---|---|
| 有聲號誌（視覺功能障礙語音號誌） | 交通管制工程處；官網寫運作中 201 處；東西向鳥鳴、南北向布穀；洽詢 1999 或 2759-9741 | ✅ [視障聽障研究 B.2](taipei-disability-services.md#b2-視障者) |
| 有聲號誌開放資料 | data.taipei〈臺北市交通管制工程處無障礙設施設置資料〉191 筆，有 WGS84 座標 | ✅ [視障聽障研究 C.4](taipei-disability-services.md#c4-新服務市府目前沒有但有開放資料或-app-能力可以支撐) |
| CRPD 第 9 條；身權法第 52 條 | 資訊、通信及其他服務的無障礙 | ✅ [依據總表 §2.2](research-basis.md#22-國內法規) |
| 指引的地圖規範 | 只能用 Leaflet 或 MapLibre，搭配 OpenStreetMap 或國土測繪中心圖資 → 路網用 OSM，不用 Google Maps | ✅ [依據總表 §0.1](research-basis.md#01-主辦規則與本作品現況對照出處城市通入門指引2026-版) |
| 不呼叫路線規劃服務 | 路線規劃服務不在允許清單 → 開發時把 OSM 步行路網下載成 `public/walk/tianmu.json`，在手機上用 A* 算 | [無障礙研究 §5.7](accessibility-research.md#57-相機方向導引ar-帶我去可行性評估目前不做)；OSM 資料授權 ODbL |

沒有找到直接規範「步行導航」的法規。

### UX 依據

- **原則 3**：唸出來＋震動＋大字；指引寫進 live region，報讀軟體會唸。
- **不發明新手勢**：盲人做出的手勢和明眼人不同（✅ Kane 2011）→ 只用按鈕。
- **獨立與安全**（✅ Azenkot 2011）；有聲號誌效果不錯，但設的地方太少（✅ 李森光 2012）→ 有就提醒。[依據總表 §1.6](research-basis.md#16-視障者用手機螢幕閱讀器大眾運輸資訊需求m0m10)
- **走路時不看螢幕**：長輩邊走邊舉手機容易跌倒；GPS 不準時要說「就在附近」，不要假裝很精準。這兩點是隊伍評估時的判斷，不是研究結論（[無障礙研究 §5.7](accessibility-research.md#57-相機方向導引ar-帶我去可行性評估目前不做)）。
- **不叫長輩用跑的**：趕不上就說等下一班。這是設計選擇，沒有研究直接支持。

### 背景數據

- 視障者外出需要有人陪同 54.98%（所有障別 39.50%）；搭乘交通工具有困難 73.86%（衛福部 110 年身障者調查）✅ [依據總表 §0.2](research-basis.md#長輩最擔心最困擾的事依調查排序)
- 臺北 60 歲以上過去一年跌倒 14.0%；因為怕跌倒而減少活動 13.3%（T113）✅ 同上
- 臺灣 128 位視障者對 GPS 準確度最不滿意（✅ 盧冠甫 2023，[依據總表 §1.6](research-basis.md#16-視障者用手機螢幕閱讀器大眾運輸資訊需求m0m10)）
- ⚠️ 長輩步行速度用 0.8 公尺／秒估算，是保守值，**沒有查證出處**，不能說成研究數據。

### 內容設計

**畫面**（[`WalkScreen.tsx`](../src/components/elder/WalkScreen.tsx)，句子在 [`walk.ts`](../src/lib/elder/walk.ts)）

- 標題「走到站牌」。開始時：「正在找您現在的位置…」→「正在找路…」
- 摘要：走路時間和公車時間比一比。公車比走路多 1 分鐘以上才說來得及。
  - 來得及：「走到站牌大約 6 分鐘，公車還有 9 分鐘，來得及，慢慢走就好。」
  - 趕不上：「走到站牌大約 {X} 分鐘，公車還有 {Y} 分鐘，這一班可能趕不上，不要用跑的，等下一班。」
- 轉彎前 40 公尺先說：「直走 40 公尺，右轉進入天母東路」；到了震動並說：「現在右轉，進入天母東路」。
- 過馬路，三種說法：
  - 30 公尺內有有聲號誌：「要過馬路，這裡有有聲號誌，聽到嗶嗶聲再走」
  - 有號誌：「要過馬路，等綠燈再走」
  - 沒有號誌：「要過馬路，請走斑馬線，左右看清楚」
- 偏離路線超過 35 公尺、連續 2 次：「好像走偏了，重新找路。」再接下一步。
- 到了：「到了，站牌就在附近」。
- 提醒：「走路時手機拿在手上，螢幕不要關，聲音開大一點。」「路線只是參考。過馬路一定要看號誌、走斑馬線。」
- 範圍外：「這附近還沒有走路的路線資料（目前只有天母一帶）。站牌離您直線大約 {距離}。」
- 「模擬走一次」：位置沿路線自動前進（每秒 4 公尺，約長輩步行的 5 倍），桌上測試和決選舞台用，畫面標「（模擬中，速度加快）」。
- 樓梯的成本加重，路線盡量避開。

### 程式位置

- [`src/components/elder/WalkScreen.tsx`](../src/components/elder/WalkScreen.tsx)：畫面、定位、語音與震動
- [`src/lib/elder/walk.ts`](../src/lib/elder/walk.ts)：A* 路線、指引句子、偏離判斷（有單元測試）
- [`src/lib/elder/walkData.ts`](../src/lib/elder/walkData.ts)、[`public/walk/tianmu.json`](../public/walk/tianmu.json)：路網資料
- [`scripts/build-walk-graph.ts`](../scripts/build-walk-graph.ts)：開發時產生路網
- [`src/components/elder/BusCard.tsx`](../src/components/elder/BusCard.tsx)：入口；[`OfflineSupport.tsx`](../src/components/elder/OfflineSupport.tsx)：預先下載路網與有聲號誌

### 參考 commit

| 短 sha | 訊息 | 連結 |
|---|---|---|
| `54e433c` | docs: 補「相機＋方向導引」可行性評估（§5.7，目前不做） | [54e433c](https://github.com/Peakqi-com/townpass2026-peakqi/commit/54e433c6682846fcd80225cb2c7b8bbaf2811d53) |
| `8d7a23e` | feat: M16 延伸「帶我走到站牌」步行語音導航 | [8d7a23e](https://github.com/Peakqi-com/townpass2026-peakqi/commit/8d7a23ea7458731756c4443d635c36926cb79bb6) |
| `545f80d` | docs: README 與規格補上「帶我走到站牌」（流程 ⑨、架構、斷網、限制） | [545f80d](https://github.com/Peakqi-com/townpass2026-peakqi/commit/545f80d55a743abb56933eb81e3d8ca4b9c4eb5e) |

### 限制與未查證

- 路網只涵蓋天母、芝山、明德；範圍外只給直線距離。
- 螢幕關掉時 WebView 會暫停，所以畫面提醒螢幕不要關。
- OSM 的斑馬線資料不一定完整，路線只是參考。
- ⚠️ 步行速度 0.8 公尺／秒沒有查證出處。
- ⚠️ 有聲號誌：官網 201 處，開放資料只有 191 筆，可能少提醒幾個路口。
- ⚠️ 高樓之間 GPS 可能誤差十幾公尺，這是一般經驗，沒有實測。
- ⚠️ 還沒有實際帶視障者走過。
- 相機畫面＋方向箭頭（AR）評估後決定不做（[無障礙研究 §5.7](accessibility-research.md#57-相機方向導引ar-帶我去可行性評估目前不做)）。

---

## 10. 叫車分流（M5）

流程圖：[`diagrams/m5-ride.svg`](diagrams/m5-ride.svg)

### 情境

金大森腳不方便，下週要去聯醫。鄰居坐輪椅都叫復康巴士，他以為自己也能叫。

- 他按「叫車」。畫面第一句：「復康巴士只限有身障證明的人搭。」
- 第 1 題「您有身心障礙證明嗎？」他按「沒有」。
- 第 2 題「家裡有沒有申請過長照，等級 2 級以上？」他按「不知道」。
- 結果「先打 1966 問長照等級」，下面是「1966 長照」和「敬老計程車」。再往下是「訂不到車怎麼辦？」，最後一步是打給家人。

卡在：三種車的資格、主責機關、預約方式都不同；長輩常不知道自己的長照等級；訂不到車。

### 政策與制度依據

| 車種 | 主責 | 誰能用、怎麼叫 | 出處 |
|---|---|---|---|
| 小型復康巴士 | 交通局公運處 | 只限持身障證明者；網站可用台北通帳號登入；客服 0809-080650；語音訂車 0800-065165；8:00–17:00 受理 | ✅ [長輩研究 B.3](taipei-elderly-services.md#b3-交通復康巴士長照交通接送敬老愛心計程車-) |
| 長照交通接送 | 社會局 | 長照 2 級以上，就醫、復健、透析；1966、網站、LINE@；每月 1,680 元，一般戶自付 30% | ✅ 同上；《長期照顧服務申請及給付辦法》附表五 ✅ [補助研究 A.6](taipei-subsidies.md#a6-長照-2030-的四包錢與喘息衛福部臺北市衛生局長照管理中心) |
| 敬老愛心計程車 | 交通局公運處 | 有敬老卡的長輩；手機撥 55850，按 0；115/2/1 起每趟最多 85 點 | ✅ [長輩研究 B.3](taipei-elderly-services.md#b3-交通復康巴士長照交通接送敬老愛心計程車-) |
| 手語視訊轉譯（VRS） | 衛福部、數位部 | 2024-08-01 上線，可用於叫車等私人事務 | ✅ [視障聽障研究 B.1-7](taipei-disability-services.md#b1-7-近四年其他新增) |

### UX 依據

- **原則 2 選項要少**：最多兩題，大按鈕回答。
- **每題都有「不知道」**：不逼長輩答對。沒考慮用健保快易通的原因，「太複雜、怕弄錯、學不來」每百人 17.2 人（✅ S111）。
- **原則 4 文字路**：敬老計程車只能打電話。聽不清楚模式在結果和退路裡，敬老計程車後面加「手語視訊轉譯」。
- **原則 5 按錯不怕**：「回上一題」「重新回答」；不逾時。換題時焦點移到題目，報讀軟體開著時不重複唸（`97db8c6`）。
- **只說「可能可以」**：最後以主責機關審核為準。

### 背景數據

- 復康巴士使用者的主要抱怨是預訂不到（23.26%，衛福部 110 年身障者調查頁 49）✅ [依據總表 §0.2 建議調整](research-basis.md#建議調整只是建議不要求現在做)
- 臺北 65 歲以上：長照交通接送 58.5% 知道、4.5% 使用；沒使用的原因是「預訂不到交通車」（T113）✅ [依據總表 §0.2](research-basis.md#長輩最擔心最困擾的事依調查排序)
- 搭乘交通工具有困難：視障者 73.86%、聽障者 45.83% ✅ 同上
- 65 歲以上日常生活至少一項需要別人幫忙 18.41%，75 歲以上 36.72% ✅ 同上

### 內容設計

**題目**（[`ride.ts`](../src/lib/elder/ride.ts)、[`RideScreen.tsx`](../src/components/elder/RideScreen.tsx)）

| 題目 | 提示 | 選項 |
|---|---|---|
| 您有身心障礙證明嗎？ | 就是身心障礙手冊或證明。 | 有／沒有／不知道 |
| 家裡有沒有申請過長照，等級 2 級以上？ | 照管專員到家裡評估過，會告訴您長照等級。 | 是／不是／不知道 |

**結果**

| 回答 | 標題 | 補充 |
|---|---|---|
| 有身障證明 | 您可能可以搭復康巴士 | 早上 8 點到下午 5 點受理訂車。 |
| 沒有→長照是 | 您可能可以用長照交通接送 | 每月給付上限 1,680 元，一般戶自付 30%。 |
| 沒有→長照不是 | 建議您搭敬老計程車 | 打通以後按 0，就是敬老愛心車。 |
| 沒有→長照不知道 | 先打 1966 問長照等級 | 長照 2 級以上可以用長照交通接送。今天就要出門，可以先搭敬老計程車。 |

- 身障證明答「不知道」：「不知道有沒有身障證明，先當作沒有。復康巴士只限有身障證明的人搭。」
- 結果下面：「能不能用，最後以主責機關審核為準。」
- 金大森（沒有、不知道）的結果唸出來：「先打 1966 問長照等級。1966 長照、敬老計程車」。
- 敬老計程車卡片唸「敬老愛心計程車，每趟最多扣八十五點」。

**訂不到車怎麼辦？**「照順序試試看：」從自己的下一格往下退：

- 復康巴士 → 長照交通接送 → 敬老計程車 → 打給家人
- 長照交通接送 → 敬老計程車 → 打給家人
- 敬老計程車 → 打給家人：「叫不到車的話，打給家人，請家人來接您或幫您叫車。」
- 從復康巴士退到長照接送、但沒問過長照等級時，加一句：「沒問過您的長照等級：長照 2 級以上才能用長照交通接送。今天就要出門，可以直接叫敬老計程車。」

**為什麼原本的「叫復康巴士」按鈕改成「我要叫車」**：復康巴士只限持身障證明的人，很多長輩以為能叫（[README 第 6 節](../README.md#6-設計取捨)）。

### 程式位置

- [`src/components/elder/RideScreen.tsx`](../src/components/elder/RideScreen.tsx)：畫面
- [`src/lib/elder/ride.ts`](../src/lib/elder/ride.ts)：分流與退路（純函式，有單元測試）
- [`src/data/services.json`](../src/data/services.json)：`rehab-bus`、`ltc-ride`、`senior-taxi`、`ltc-1966`、`vrs`、`page-family`

### 參考 commit

| 短 sha | 訊息 | 連結 |
|---|---|---|
| `d8670bc` | feat: 我要看醫生（M4）與我要叫車（M5） | [d8670bc](https://github.com/Peakqi-com/townpass2026-peakqi/commit/d8670bc8f35a9fcd269134a4cb258132be89ca6b) |
| `97db8c6` | fix: 叫車換題時避免報讀軟體重複唸；移除 health、ride 佔位頁 | [97db8c6](https://github.com/Peakqi-com/townpass2026-peakqi/commit/97db8c609667c3b2913b800f9fca6aca5ce2fccb) |
| `7ac5c43` | feat: 回診／領藥提醒、叫車退路、求助頁分兩條 | [7ac5c43](https://github.com/Peakqi-com/townpass2026-peakqi/commit/7ac5c43b1ede4ff345b9c0a1a06da742df35fe1d) |

### 限制與未查證

- 「預訂不到車」是車輛供給問題，App 解決不了，只能給下一個選項。
- ⚠️ 復康巴士各等級可以提前幾天預約，官方頁面說法不一致。
- ⚠️ 市長 115/6/22 新聞稿提到「放寬復康巴士資格」，找不到實施公告。
- ⚠️ 復康巴士「可折抵 85 點」沒有查證，所以不寫（官方只確認計程車 85 點）。
- ⚠️ VRS 的服務時段沒有在官網確認。

---

## 11. 補助小幫手（M12）

流程圖：[`diagrams/m12-subsidy.svg`](diagrams/m12-subsidy.svg)

### 情境

金大森不知道自己能領什麼，也想幫 82 歲、最近走路要人扶的太太看看。他在「我的權益」按「補助小幫手：看看能領什麼」。

- 第一題「您是幫誰看？」：「幫我自己」就從台北通帶入年齡和行政區；「幫另一半或家人」就再問年紀。
- 接著三題：身障證明、家裡收入、需不需要人照顧。每題都可以選「不知道」。
- 結果每張卡片都寫要準備什麼、去哪裡辦、打電話時的第一句話，可以把準備單傳給女兒。

卡在：補助看全家收入，資格複雜；線上申辦連結壞了；長輩打電話不知道怎麼開口；最後要家人跑腿。

### 政策與制度依據

| 補助或管道 | 重點 | 出處 |
|---|---|---|
| 中低收入老人生活津貼 | 社會局救助科、戶籍地區公所社會課受理；65 歲以上、全家平均每人每月收入 ≤ 39,960 元；每月 8,329 元或 4,164 元；**不需要先有中低收入戶身分** | ✅ [補助研究 A.2](taipei-subsidies.md#a2-中低收入老人生活津貼社會局社會救助科區公所社會課受理) |
| 低收入戶、中低收入戶 | 115 年門檻 20,744 元／29,635 元（府社助字第 11431600601 號公告） | ✅ [補助研究 A.1](taipei-subsidies.md#a1-低收入戶中低收入戶資格社會局社會救助科受理窗口是戶籍地區公所社會課) |
| 長照四包錢與喘息 | 《長期照顧服務申請及給付辦法》；自付比例寫「第一類、第二類、第三類」，不寫「低收、中低收、一般戶」 | ✅ [補助研究 A.6](taipei-subsidies.md#a6-長照-2030-的四包錢與喘息衛福部臺北市衛生局長照管理中心) |
| 1957 福利諮詢專線 | 衛福部；每日 08:00–22:00，免付費；網頁線上文字諮詢 | ✅ [補助研究 B.2](taipei-subsidies.md#b2-衛福部-1957-福利諮詢專線-) |
| 家人代辦 | 低收、中低收、老人津貼、身障生活補助：附代申請人身分證明影本；停車證、愛心卡等要委託書 | ✅ [補助研究 B.3](taipei-subsidies.md#b3-家人代辦對照表) |
| 12 區公所社會課 | 民政局頁面，資料更新 114-12-04 | ✅ [補助研究 C.3](taipei-subsidies.md#c3-12-區公所社會課電話與地址-) |
| 個資法第 6 條 | 健康相關的回答只存在手機，不送到伺服器 | ✅ [依據總表 §2.2](research-basis.md#22-國內法規) |

### UX 依據

- **原則 6 主動告訴、原則 7 家人共同使用者、原則 4 文字路、原則 8 官方來源。**
- **降低行政負擔**：行政負擔分學習、心理、遵從三種成本（✅ Moynihan 2015）→ 準備單、打電話第一句話。
- **資訊加協助比只提醒有效**：只告知資格 11%，告知再加協助申請 18%（✅ Finkelstein 2019）；回顧 35 篇研究，最有效的是給對資訊和協助申請（✅ Daigneault 2025）。[依據總表 §1.3](research-basis.md#13-福利沒領到non-take-up行政負擔提醒m6m12)
- **年紀愈大愈需要福利，也愈難申請**（✅ Christensen 2020）。
- **找不到時不停在「沒有」**：最後固定給 1957、1966、文字聯絡（依據總表主線 B 第 2 步建議）。
- **WCAG 3.3.7**：幫自己時不再問年齡、行政區。

### 背景數據

- 65 歲以上最在意的事：第 2「自己生病時誰來照顧」21.58%、第 3「配偶的健康」21.05%、第 4「經濟來源」17.24%、第 5「配偶生病時的照顧」10.37%（衛福部 111 年）✅ [依據總表 §0.2](research-basis.md#長輩最擔心最困擾的事依調查排序)
- 臺北 60 歲以上僅與配偶同住 24.7%；12.4% 家中有需要長期照顧的家人（T113）✅ 同上
- 臺北 65 歲以上只有 50.5% 知道健保自付額補助；不使用服務的原因有「不清楚服務內容」「需要家人決定」（T113）✅ 同上
- 撥打電話有困難：聽障者 41.16%、視障者 49.42% ✅ 同上

### 內容設計

**題目**（[`SubsidyHelper.tsx`](../src/components/elder/SubsidyHelper.tsx)）

| 題目 | 提示 | 選項 |
|---|---|---|
| 您是幫誰看？ | 幫家人看的話，會再問他（她）的年紀。 | 幫我自己／幫另一半或家人 |
| 他（她）今年幾歲？（幫家人才問） | 選大概的範圍就好。 | 年齡級距／不知道 |
| 他（她）是原住民嗎？（選到會影響結果的級距才問） | 原住民的年齡門檻比較低，有些補助 55 歲就可以申請。 | 是／不是／不知道 |
| 您有身心障礙證明嗎？ | — | 有（再問看不清楚／聽不清楚／其他）／沒有／不知道 |
| 家裡有低收入戶或中低收入戶證明嗎？ | 沒有證明，但家裡收入不高，也可能可以申請。 | 有低收或中低收證明／沒有，但收入不高／不知道 |
| 家裡有人需要別人照顧嗎？ | 例如走路、洗澡、吃飯需要有人幫忙。也可以是您自己。 | 需要／不需要／不知道 |

- 幫家人時，主詞改成「他（她）」；行政區沿用長輩自己的，「當作家人和您住在同一戶」。
- 幫自己：「從台北通帶入：86 歲・中山區。」每頁都寫「您的回答只存在這支手機裡，不會上傳。」

**金大森的結果**（幫自己；身障證明「沒有」、收入「不知道」、照顧「不知道」，實際跑出來的結果）

- 「您可能可以申請 4 項」：老人生活津貼、低收中低收入戶、房子修繕補助、假牙補助，每張都標「要看家裡收入」。
- 「不用申請，會自動入帳或減免」：老人健保費補助。
- 答「不知道」的提示：「不確定家裡有沒有人需要照顧：如果有，可以打 1966 申請長照，家人也可以幫忙打。」

**卡片**（以老人生活津貼為例）

- 「大約金額：每月 8,329 元或 4,164 元（115 年）」「要注意：要看家裡收入」
- 「要準備什麼」勾選清單；「怎麼申請」：打給中山區公所社會課、打 1999 轉分機，旁邊一定有文字管道。
- 「打電話或用文字問時，可以先這樣說：」「您好，我想問「老人生活津貼」怎麼申請。我住在中山區，今年 86 歲。」幫家人時改成「您好，我想幫我家人問…」。
- 「家人可以代辦嗎」：寫要帶什麼；官方頁面沒寫的就寫「官方頁面沒有寫能不能代辦，請先打電話問。」
- 「看申請準備單（可以傳給家人）」：第一行「【申請準備單】老人生活津貼」，最後「最後由社會局審核，這裡只是幫您先看看。」

**最後固定一段**：「沒有找到適合的，或還是不確定？」「不知道可以領什麼，可以問 1957；家裡有人需要照顧，可以問 1966；不方便講電話，可以用文字聯絡。」一筆都沒有時，這一段移到最前面。

**為什麼只說「可能可以申請」**：App 看不到全家收入和財產，最後由社會局審核。說「符合」會讓長輩以為一定領得到。頁尾：「最後由社會局審核，這裡只是幫您先看看。…金額與資格每年調整，以各卡片上的查證日期為準。」

### 程式位置

- [`src/components/elder/SubsidyHelper.tsx`](../src/components/elder/SubsidyHelper.tsx)：題目、結果、卡片
- [`src/lib/elder/subsidy.ts`](../src/lib/elder/subsidy.ts)：資格篩選、打電話第一句話、準備單（有單元測試）
- [`src/data/subsidies.json`](../src/data/subsidies.json)：15 筆補助與 12 區公所社會課，每筆附出處與查證日期
- [`src/components/elder/ChannelButtons.tsx`](../src/components/elder/ChannelButtons.tsx)、[`ShareToFamily.tsx`](../src/components/elder/ShareToFamily.tsx)
- [`src/app/benefits/call/[id]/page.tsx`](../src/app/benefits/call/%5Bid%5D/page.tsx)：區公所社會課撥號確認

### 參考 commit

| 短 sha | 訊息 | 連結 |
|---|---|---|
| `0a25f3a` | feat: 我的權益（M6）與補助小幫手（M12） | [0a25f3a](https://github.com/Peakqi-com/townpass2026-peakqi/commit/0a25f3ad0c841fc41456a08aa236ca214008770b) |
| `14bbcaf` | feat: 颱風地震時去哪裡、照顧家人、打疫苗做篩檢（M13～M15），補助小幫手加假牙補助 | [14bbcaf](https://github.com/Peakqi-com/townpass2026-peakqi/commit/14bbcaf9fe34cc0ccf69fd9787086b230b55dae0) |
| `7400258` | feat: 補助小幫手可以幫家人看、找不到時有退路、打電話的第一句話；我的權益主推少人知道的權益 | [7400258](https://github.com/Peakqi-com/townpass2026-peakqi/commit/7400258d73cf285a0445cb5e8a7952ec6de113b2) |
| `d5a6318` | fix: ShareToFamily 支援 h4；補助卡裡的準備單用 h4 | [d5a6318](https://github.com/Peakqi-com/townpass2026-peakqi/commit/d5a63188a291d5546c2262b27c1b973ffd8c8695) |

### 限制與未查證

- ⚠️ 老人津貼 8,329／4,164 元只在臺北市社會局頁面看到，沒找到衛福部的定案公告。
- ⚠️ 社會局頁面連到的台北服務通案件頁，2026-11-07 實測是 404，所以不當主要管道；長照線上申請當天顯示「維護中」。
- ⚠️ 1957 的 LINE 文字客服只有 QR Code 圖片，LINE ID 沒確認。
- ⚠️ 假牙補助的 1999 分機有四種寫法，程式用洽辦資訊頁的 1576、1676。
- ⚠️ 委託書：頁面沒寫的，實務上會不會另外要，要先問區公所。
- 特別照顧津貼、緊急救援的費用、扶老修繕有矛盾或沒有 115 年資料，第一版不列或寫「請洽 1999」。
- 幫家人時當作和長輩住同一戶；不同戶的家人，結果可能不準。
- 查不到臺灣重陽禮金、敬老補助這類現金福利的 non-take-up 研究。

---

## 12. 其他模組

沒有獨立流程圖的模組。格式相同，內容精簡。

### M8 聽不清楚（`/text`、`/help`、`/card/clinic`）

- **情境**：金大森的聽力愈來愈差。看診聽不到護理師叫名字；在路上不舒服，打不了 119。
- **政策與制度依據**
  - 1999：LINE `taipeicity1999`，文字全年 24 小時；手語視訊週一至週六 9:00–18:00（研考會）✅ [視障聽障研究 B.1-1](taipei-disability-services.md#b1-1-1999-市民當家熱線文字與手語視訊研考會主責)
  - 手語翻譯、同步聽打（社會局；中華民國聽障人協會承辦到 2026-12-31）：簡訊、LINE 都是 0963-047-723；原則上 3 日前申請 ✅ [B.1-3](taipei-disability-services.md#b1-3-手語翻譯與同步聽打社會局主責)
  - 身權法第 61 條：直轄市「應設置申請手語翻譯服務窗口」✅ [依據總表 §2.2](research-basis.md#22-國內法規)
  - ⚠️ 119 簡訊號碼有兩個官方版本：0911-511-902（臺北市消防局宣導單、消防署網頁）和 0932-299-702、備用 0963-330-119（消防署開放資料 2025-12）。畫面兩個都列，標「待確認」。110 簡訊 0911-510-914 ✅ [B.1-2](taipei-disability-services.md#b1-2-119110-簡訊報案消防局消防署警政署)
- **UX 依據**：原則 4、8、9。聽障者就醫時，讀唇、筆談、手語翻譯各有問題（✅ Iezzoni 2004）；臺灣醫護戴口罩看不到嘴型（✅ 游政諺 2015）[依據總表 §1.7](research-basis.md#17-聽障者就醫與緊急求助的溝通障礙m8)。文字要短、用常用字（✅ 劉秀丹 2006）。
- **背景數據**：聽障者撥打電話有困難 41.16% ✅；主要溝通方式口語 90.35%、手語 1.28% ✅；臺北市手語翻譯 2025 年 2,484 案、5,623 人次 ✅ [視障聽障研究 A.2](taipei-disability-services.md#a2-聽障者)。
- **內容設計**
  - 求助卡（全螢幕大字，轉給旁人看）：「我聽不到，請用寫的。」「請幫我叫救護車。」「請面向我，說慢一點。」
  - 看診溝通卡：「我聽力不好，請面向我、說慢一點，或寫下來。」
  - 求助頁分兩條：「現在有危險」（「很緊急就打 119。聽不到的話，用下面的求助卡或簡訊。」）和「接到可疑電話」（接到防詐）。
  - 119 簡訊範本：「照臺北市消防局的範本寫好了，按下面的按鈕會打開簡訊，您自己按送出。」Demo 絕不送出。
  - 讓家人知道：「我是金大森，現在需要幫忙，請盡快打電話給我。」
- **程式位置**：[`hearing/TextScreen.tsx`](../src/components/elder/hearing/TextScreen.tsx)、[`hearing/HelpScreen.tsx`](../src/components/elder/hearing/HelpScreen.tsx)、[`hearing/ClinicScreen.tsx`](../src/components/elder/hearing/ClinicScreen.tsx)、[`src/lib/elder/hearing.ts`](../src/lib/elder/hearing.ts)、[`messages.ts`](../src/lib/elder/messages.ts)

| 短 sha | 訊息 | 連結 |
|---|---|---|
| `1368ab4` | feat: 聽不清楚（M8）文字聯絡、求助、看診溝通卡 | [1368ab4](https://github.com/Peakqi-com/townpass2026-peakqi/commit/1368ab4c92fe1981cff4a31d9e2621f563e26f61) |
| `7ac5c43` | feat: 回診／領藥提醒、叫車退路、求助頁分兩條 | [7ac5c43](https://github.com/Peakqi-com/townpass2026-peakqi/commit/7ac5c43b1ede4ff345b9c0a1a06da742df35fe1d) |
| `04e32c6` | fix: ShareToFamily 加標題層級參數；求助頁裡改用 h3，字級對齊各頁的 h2 | [04e32c6](https://github.com/Peakqi-com/townpass2026-peakqi/commit/04e32c6f65edc280a940ef110aa3be8b99033ce1) |

- **限制與未查證**：⚠️ 119 號碼要打電話向臺北市消防局確認；⚠️ 簡訊能否帶入內文要實機確認；⚠️ VRS 時段沒有官網確認；手語翻譯承辦單位 2027 年可能改變；119 簡訊、溝通卡的使用效果研究查不到。

### M10 視障出門（`/vision`）

- **情境**：視障長輩要搭捷運去看醫生，想知道電梯在哪個出口、附近哪個路口有有聲號誌。
- **政策與制度依據**：北捷站內無障礙設施（電梯有點字和語音；2008 年後通車的車站取消連續導盲磚；詢問處有視障旅客引導）✅；有聲號誌（交工處）✅ [視障聽障研究 B.2](taipei-disability-services.md#b2-視障者)；身權法第 52 條 ✅。
- **UX 依據**：服務層原則 S7「電梯在 2 號出口」這種一句話，不只畫地圖；WCAG 4.1.3 結果寫進 live region；沿用系統報讀軟體，不發明手勢（✅ Kane 2011）。
- **背景數據**：視障者搭乘交通工具有困難 73.86%、外出要人陪 54.98% ✅；視障網路族每百人 30.7 人用 VoiceOver、18.2 人用 TalkBack ✅ [視障聽障研究 A.1](taipei-disability-services.md#a1-視障者)。
- **內容設計**：標題「捷運電梯、有聲號誌」。句型（[`places.ts`](../src/lib/elder/places.ts)）：「電梯在{出口}。」「導盲磚從{起點}，接到{終點}。」「視障優先候車在{位置}。」「詢問處在{位置}，可以請站務人員引導。」「目前沒有無障礙設施異常公告。」；「附近的有聲號誌路口」「{路口}，約 {距離}（{行政區}）」。按鈕「再唸一次」「選別的車站」「用我的位置找」。「距離是直線距離，實際走的路可能比較遠。」整份資料在手機上算最近的站，位置不送後端。
- **程式位置**：[`VisionScreen.tsx`](../src/components/elder/VisionScreen.tsx)、[`src/lib/elder/places.ts`](../src/lib/elder/places.ts)、[`src/lib/opendata/sources.ts`](../src/lib/opendata/sources.ts)

| 短 sha | 訊息 | 連結 |
|---|---|---|
| `999b734` | feat: 附近吃飯上課（M9）與視障出門（M10），新增 7 個開放資料來源 | [999b734](https://github.com/Peakqi-com/townpass2026-peakqi/commit/999b73487ff403e4c2e3792f9acd0ea91e977534) |
| `4799a69` | a11y: 修掉兩處會唸兩次的錯誤訊息；新增報讀檢查腳本與原生機制對照 | [4799a69](https://github.com/Peakqi-com/townpass2026-peakqi/commit/4799a69d8e3757b823cdb1145bfaecd714eaeb71) |

- **限制與未查證**：⚠️ 有聲號誌官網 201 處、開放資料 191 筆；⚠️ 視障優先椅官網寫 29 站、開放資料 24 站有值；只涵蓋捷運電梯和有聲號誌；斷網時讀不到。

### M11 防詐先問一下（`/antifraud`）

- **情境**：金大森接到電話，對方說他「帳戶涉及洗錢，要監管帳戶」。他不確定，打開「先問一下」。
- **政策與制度依據**：詐欺犯罪危害防制條例第 3 條第 2 項、第 5 條（預防宣導）、第 51 條（24 小時報案專線）✅ [依據總表 §2.2](research-basis.md#22-國內法規)；6 種手法的提醒文字都來自 165 全民防騙網原文 ✅ [防詐查證 §1](antifraud-research.md#1-來源清單)；引用官方文字依警政署的政府網站資料開放宣告 ✅ [依據總表 §2.5](research-basis.md#25-引用官方文字的著作權判斷)。
- **UX 依據**：永遠不說「安全」（[防詐查證 §5](antifraud-research.md#5-文案原則)）；事前提醒能降低上當，但同一種提醒效果會變弱，所以要隨時能用（✅ Scheibe 2014）；銀行行員常是攔下詐騙的旁觀者，手機扮演這個角色（✅ 黃于玲 2020）[依據總表 §1.9](research-basis.md#19-長輩受詐騙的盛行率易受害因素事前提醒m11)；原則 4：165 只能用講的就明講。
- **背景數據**：65 歲以上把人身安全列為最擔心的只有 1.01%，過去一年實際遭遇 1.13% ✅ → 比較像家人在擔心；假檢警詐騙 114 年上半年 2,713 件、財損 53 億餘元，50 歲以上女性約 5 成 2（刑事局）✅ [防詐查證 §2.1](antifraud-research.md#21-假檢警假冒公務員詐騙)。
- **內容設計**：標題「先問一下：這是不是詐騙？」比對到：「這很像假檢警詐騙」＋官方提醒＋「先掛電話，不要轉帳。」比對不到：「我們不確定，請先停下來」「我們不確定這是哪一種。但遇到要錢、要帳號密碼，就先停下來，先問家人或 165。」「只在這支手機裡比對，不會上傳。」聽不清楚模式：「165 專線只能用講的，可以請家人代打。165 的 LINE 官方帳號可以查網址有沒有被通報。」
- **程式位置**：[`AntifraudScreen.tsx`](../src/components/elder/AntifraudScreen.tsx)、[`src/lib/elder/antifraud.ts`](../src/lib/elder/antifraud.ts)、[`src/data/antifraud.json`](../src/data/antifraud.json)

| 短 sha | 訊息 | 連結 |
|---|---|---|
| `be4839c` | feat: M11 防詐先問一下（/antifraud） | [be4839c](https://github.com/Peakqi-com/townpass2026-peakqi/commit/be4839c3049ed43ccef2f99826102765f42fd7c6) |
| `7ac5c43` | feat: 回診／領藥提醒、叫車退路、求助頁分兩條 | [7ac5c43](https://github.com/Peakqi-com/townpass2026-peakqi/commit/7ac5c43b1ede4ff345b9c0a1a06da742df35fe1d) |

- **限制與未查證**：「說很像、不說安全」的效果研究查不到，目前依 Scheibe 2014 推論；⚠️ 沒查到 165 可以用 LINE 向真人諮詢，所以只寫「查網址」；⚠️ 165 全民防騙網自己的開放宣告沒抓到；關鍵字比對，新話術比對不到時一律說「先停下來」。

### M13 颱風、地震時去哪裡（`/shelter`）

- **情境**：颱風夜，金大森想知道正得里要去哪裡避難，但不知道地址怎麼查。
- **政策與制度依據**：data.taipei〈臺北市可供避難收容處所一覽表〉，419 處，「服務里別」列出每一處負責哪些里（2026-11-07 實際下載）[開放資料 §3.1](open-data.md#31-長輩服務避難照顧家人打疫苗做篩檢2026-11-07-實際下載已接進代理)；CRPD 第 9 條第 1 項 (b) 無障礙範圍包括「緊急服務」✅ [依據總表 §2.2](research-basis.md#22-國內法規)。
- **UX 依據**：WCAG 3.3.7 不用輸入地址（用台北通帳號的「里」）；有無障礙設施的排前面；聽障者在災難前後常被忽略（✅ Engelman 2013）。
- **背景數據**：臺北長輩獨居 9.8%、僅與配偶同住 24.7%（T113）✅ [依據總表 §0.2 建議調整](research-basis.md#建議調整只是建議不要求現在做)。
- **內容設計**：標題「颱風、地震時去哪裡」，第一句「市政府登記的避難收容處所。真的要去之前，請以市政府當時的公告為準。」「遇到什麼狀況？」選颱風淹水或地震；唸「{狀況}，可以去{名稱}，{地址}」；「負責您住的正得里」；「負責正得里的有 {N} 處，有無障礙設施的排在前面。」「水災」「震災」的值照原文顯示「是／否／備用」，不自己解釋「備用」。
- **程式位置**：[`ShelterScreen.tsx`](../src/components/elder/ShelterScreen.tsx)、[`src/lib/elder/shelter.ts`](../src/lib/elder/shelter.ts)、[`src/lib/opendata/sources.ts`](../src/lib/opendata/sources.ts)

| 短 sha | 訊息 | 連結 |
|---|---|---|
| `14bbcaf` | feat: 颱風地震時去哪裡、照顧家人、打疫苗做篩檢（M13～M15），補助小幫手加假牙補助 | [14bbcaf](https://github.com/Peakqi-com/townpass2026-peakqi/commit/14bbcaf9fe34cc0ccf69fd9787086b230b55dae0) |

- **限制與未查證**：實際開設哪幾處以市府當時公告為準；原始資料有聯絡人姓名與電話，代理不傳給前端；「備用」的意思沒有查；斷網時讀不到。
