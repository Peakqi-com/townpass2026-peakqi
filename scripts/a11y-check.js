/*
 * 長輩模式：報讀軟體檢查（貼到 Chrome DevTools 的 Console 執行）
 *
 * 用法
 *   - 電腦：npm run dev 或 npm start，打開頁面，F12 → Console，貼上整段，按 Enter。
 *   - App 裡：Android 手機接上電腦，Chrome 打開 chrome://inspect，找到城市通的 WebView → inspect，
 *     在 Console 貼上。（iOS 用 Mac 的 Safari「開發」選單，Web 檢閱器的主控台一樣可以貼。）
 *   - 每一頁、每一種模式（都還好／看不清楚／聽不清楚）都要跑一次。
 *
 * 檢查項目（對應原生 App 的無障礙機制）
 *   - 無障礙標籤（contentDescription／accessibilityLabel）：每個可互動元素都有名稱；img 有 alt；svg 有隱藏
 *   - 添加焦點（importantForAccessibility／isAccessibilityElement）：沒有正數 tabindex
 *   - 焦點順序（nextFocusForward／accessibilityElements）：DOM 順序和畫面上下順序一致
 *   - 無障礙通知（announceForAccessibility）：頁面上有 live region（role="status"）
 *   - 其他：每頁一個 h1、id 不重複、觸控範圍 ≥ 48×48（被 <label> 包住的勾選框以 label 計算）
 *
 * 這支腳本只做結構檢查，最後仍要用實機開 VoiceOver／TalkBack 聽一次。
 */
(() => {
  const issues = [];
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
  };
  const nameOf = (el) => {
    const label = el.getAttribute("aria-label");
    if (label) return label.trim();
    const by = el.getAttribute("aria-labelledby");
    if (by) return by.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ").trim();
    if (el.labels?.length) return [...el.labels].map((l) => l.textContent).join(" ").trim();
    if (el.tagName === "IMG") return (el.getAttribute("alt") ?? "").trim();
    return (el.innerText || el.textContent || el.getAttribute("title") || "").trim();
  };

  const focusables = [...document.querySelectorAll("a[href],button,input,select,textarea,summary,[tabindex]")].filter(
    (el) => !el.disabled && el.getAttribute("tabindex") !== "-1" && visible(el) && !el.closest('[aria-hidden="true"]'),
  );

  let previous = null;
  for (const el of focusables) {
    const name = nameOf(el);
    if (!name) issues.push(["標籤", "沒有名稱", el.outerHTML.slice(0, 100)]);
    if (parseInt(el.getAttribute("tabindex") ?? "0", 10) > 0) issues.push(["焦點", "正數 tabindex", name]);

    const target = el.closest("label") ?? el;
    const rect = target.getBoundingClientRect();
    const inlineLink = el.tagName === "A" && getComputedStyle(el).display === "inline";
    if (!inlineLink && (rect.width < 47.5 || rect.height < 47.5)) {
      issues.push(["觸控", `小於 48（${Math.round(rect.width)}×${Math.round(rect.height)}）`, name]);
    }

    const y = el.getBoundingClientRect().top + window.scrollY;
    if (previous && y < previous.y - 24) issues.push(["順序", "焦點往回跳", `${previous.name} → ${name}`]);
    previous = { name: name.slice(0, 16), y };
  }

  const h1 = document.querySelectorAll("h1").length;
  if (h1 !== 1) issues.push(["結構", `h1 有 ${h1} 個`, "每頁只能一個"]);
  const ids = [...document.querySelectorAll("[id]")].map((e) => e.id);
  const dup = [...new Set(ids.filter((v, i) => ids.indexOf(v) !== i))];
  if (dup.length) issues.push(["結構", "id 重複", dup.join(", ")]);
  document.querySelectorAll("svg").forEach((s) => {
    if (s.getAttribute("aria-hidden") !== "true" && !s.getAttribute("aria-label") && !s.getAttribute("role")) {
      issues.push(["標籤", "svg 沒有隱藏也沒有名稱", s.outerHTML.slice(0, 80)]);
    }
  });
  document.querySelectorAll("img:not([alt])").forEach((img) => issues.push(["標籤", "img 沒有 alt", img.src.slice(0, 80)]));
  if (!document.querySelector('[role="status"],[aria-live]')) issues.push(["通知", "沒有 live region", "say()／announce() 會沒有聲音"]);

  console.log(`%c報讀檢查：${location.pathname}，可聚焦元素 ${focusables.length} 個，焦點在 ${document.activeElement?.tagName}`, "font-weight:bold");
  if (issues.length) console.table(issues.map(([類別, 問題, 位置]) => ({ 類別, 問題, 位置 })));
  else console.log("%c沒有發現問題 ✓", "color:green");
})();
