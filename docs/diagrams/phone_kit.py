"""「用得了」情境手機的繪圖工具：動畫時間軸＋手機畫面（只用 Python 標準函式庫）。

給 build_flow_motion.py（流程圖旁的情境手機）和 docs/readme/build_readme_art.py（三種模式圖）共用。

動畫時間軸（Motion）
- 每個會動的東西拿到一個 class，class 對應一組 CSS @keyframes，整張圖用同一個循環長度 T 秒。
- 動畫只負責強調：疊上去的強調層（亮框、光點、手指、漣漪、大字提示…）一律加 opacity="0"，
  沒有動畫（減少動態效果、或瀏覽器不跑動畫）時看不到，靜止畫面仍然完整。
- CSS transform 動畫會蓋掉元素自己的 transform 屬性，所以要動的東西包一層沒有 transform 屬性的 <g>，
  定位交給外層的 <g transform="translate(…)">；縮放一律 transform-box: fill-box; transform-origin: center。

手機畫面（Screen）
- 畫面上的字一律照 src/ 的程式（components/elder/*.tsx、lib/elder/*.ts、data/*.json）；查不到的不畫。
- 尺寸照程式的 CSS px 寫，再乘上 S（設計寬 375px → 這裡的螢幕寬 276）。
  看不清楚模式整頁放大 1.3 倍：程式是放大根字級，rem 寫的字、間距、按鈕高度都跟著變大。
- 座標是手機區域座標（300×600，螢幕在 12,12 起的 276×576），手機外框、圖示、色票沿用 build_readme_art.py。
"""

from __future__ import annotations

import os
import random
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "readme"))
from build_readme_art import ELDER, HOME, TP, R, T, text_width  # noqa: E402

REDUCED = "@media (prefers-reduced-motion: reduce){*{animation:none!important}}"
CENTER = "transform-box:fill-box;transform-origin:center"


class Motion:
    def __init__(self, total: float):
        self.T = float(total)
        self._cache: dict = {}
        self._css: list[str] = []

    # ---- 基本：任意關鍵影格 ----
    def _pct(self, t: float) -> str:
        t = min(max(t, 0.0), self.T)
        return f"{t / self.T * 100:.3f}".rstrip("0").rstrip(".") + "%"

    def track(self, pts, style: str = "", timing: str = "linear") -> str:
        """pts：[(秒, 'CSS 宣告')]，依時間排序。前後自動補 0% 與 100%，回傳 class 名稱。"""
        pts = sorted(((min(max(t, 0.0), self.T), d) for t, d in pts), key=lambda p: p[0])
        key = (tuple(pts), style, timing)
        if key in self._cache:
            return self._cache[key]
        name = f"a{len(self._cache)}"
        self._cache[key] = name
        frames = list(pts)
        if frames[0][0] > 0:
            frames.insert(0, (0.0, frames[0][1]))
        if frames[-1][0] < self.T:
            frames.append((self.T, frames[-1][1]))
        # 同一個百分比只留最後一個（避免重複的影格）
        body, seen = [], {}
        for t, decl in frames:
            seen[self._pct(t)] = decl
        for pct, decl in seen.items():
            body.append(f"{pct}{{{decl}}}")
        extra = f";{style}" if style else ""
        self._css.append(f"@keyframes {name}{{{''.join(body)}}}"
                         f".{name}{{animation:{name} {self.T:g}s {timing} infinite{extra}}}")
        return name

    # ---- 出現／消失 ----
    def show(self, windows, fade: float = 0.25) -> str:
        """windows：[(開始秒, 結束秒)]。開始時淡入、結束前淡出；從 0 開始或到 T 結束的，循環時接得起來。"""
        ws = sorted((max(a, 0.0), min(b, self.T)) for a, b in windows if b > a)
        merged: list[list[float]] = []
        for a, b in ws:
            if merged and a <= merged[-1][1]:
                merged[-1][1] = max(merged[-1][1], b)
            else:
                merged.append([a, b])
        pts = []
        for a, b in merged:
            f = min(fade, (b - a) / 3)
            if a <= 0:
                pts.append((0.0, "opacity:1"))
            else:
                pts += [(a, "opacity:0"), (a + f, "opacity:1")]
            if b >= self.T:
                pts.append((self.T, "opacity:1"))
            else:
                pts += [(b - f, "opacity:1"), (b, "opacity:0")]
        if not pts or pts[0][0] > 0:
            pts.insert(0, (0.0, "opacity:0"))
        if pts[-1][0] < self.T:
            pts.append((self.T, "opacity:0"))
        return self.track(pts)

    # ---- 按下、漣漪 ----
    def press(self, t: float) -> str:
        return self.track([(t - 0.06, "transform:none"), (t + 0.06, "transform:scale(.93)"),
                           (t + 0.32, "transform:none")], CENTER)

    def ripple(self, t: float) -> str:
        return self.track([(t - 0.02, "opacity:0;transform:scale(.3)"), (t + 0.06, "opacity:.5;transform:scale(.55)"),
                           (t + 0.7, "opacity:0;transform:scale(1.8)")], CENTER)

    def pop(self, t: float, until: float) -> str:
        """從小彈出來，停到 until 再淡出（大字卡、通知、打勾）。"""
        return self.track([(t - 0.01, "opacity:0;transform:scale(.85)"), (t + 0.22, "opacity:1;transform:scale(1.03)"),
                           (t + 0.34, "opacity:1;transform:none"), (until - 0.25, "opacity:1;transform:none"),
                           (until, "opacity:0;transform:none")], CENTER)

    def slide(self, t: float, until: float, dy: float = -40) -> str:
        """由上往下滑進來（手機通知）。"""
        return self.track([(t - 0.01, f"opacity:0;transform:translateY({dy}px)"), (t + 0.35, "opacity:1;transform:none"),
                           (until - 0.3, "opacity:1;transform:none"), (until, f"opacity:0;transform:translateY({dy}px)")])

    def buzz(self, times, dur: float = 0.7) -> str:
        """手機震動的鋸齒線：出現、左右抖、消失。"""
        pts = [(0.0, "opacity:0;transform:none")]
        for t in times:
            pts.append((t - 0.01, "opacity:0;transform:none"))
            n = 6
            for i in range(n):
                dx = -3 if i % 2 == 0 else 3
                pts.append((t + dur * 0.8 * i / n, f"opacity:1;transform:translateX({dx}px)"))
            pts.append((t + dur * 0.8, "opacity:1;transform:none"))
            pts.append((t + dur, "opacity:0;transform:none"))
        return self.track(pts)

    def typing(self, t0: float, t1: float, n: int) -> str:
        """一個字一個字打出來：蓋住文字的白色方塊從左邊一格一格縮掉（steps）。"""
        return self.track([(t0, f"opacity:1;transform:scaleX(1);animation-timing-function:steps({n},end)"),
                           (t1, "opacity:1;transform:scaleX(0)")],
                          "transform-box:fill-box;transform-origin:100% 50%")

    def move(self, pts, timing: str = "ease-in-out") -> str:
        """pts：[(秒, x, y)]，相對於外層定位點的位移。"""
        return self.track([(t, f"transform:translate({x:.1f}px,{y:.1f}px)") for t, x, y in pts], timing=timing)

    # ---- 流程圖的線 ----
    def draw(self, t0: float, t1: float) -> str:
        """線從頭描到尾（pathLength=100、dasharray 100 100），步驟結束時淡掉。"""
        return self.track([(t0, "opacity:0;stroke-dashoffset:100"), (t0 + 0.05, "opacity:1;stroke-dashoffset:100"),
                           (t0 + 0.7, "opacity:1;stroke-dashoffset:0"), (t1 - 0.25, "opacity:1;stroke-dashoffset:0"),
                           (t1, "opacity:0;stroke-dashoffset:0")])

    def dot(self, t0: float, dur: float = 0.8) -> str:
        """光點沿著線跑一次（dasharray 0 200 的圓頭線段）。"""
        return self.track([(t0, "opacity:0;stroke-dashoffset:0"), (t0 + 0.05, "opacity:1;stroke-dashoffset:0"),
                           (t0 + dur, "opacity:1;stroke-dashoffset:-100"), (t0 + dur + 0.12, "opacity:0;stroke-dashoffset:-100")])

    def css(self, extra: str = "") -> str:
        return extra + "".join(self._css) + REDUCED


def finger_track(m: Motion, taps) -> str:
    """手指：taps＝[(秒, x, y)]。按之前從右下方移過來，按下時縮一下；兩次點按間隔短就直接移過去。"""
    pts = [(0.0, "opacity:0;transform:translate(60px,90px)")]
    taps = sorted(taps)
    for i, (t, x, y) in enumerate(taps):
        prev = taps[i - 1] if i else None
        if not prev or t - prev[0] > 1.7:
            pts.append((t - 0.6, f"opacity:0;transform:translate({x + 34:.1f}px,{y + 60:.1f}px)"))
        pts.append((t - 0.14, f"opacity:1;transform:translate({x:.1f}px,{y:.1f}px)"))
        pts.append((t, f"opacity:1;transform:translate({x:.1f}px,{y:.1f}px) scale(.9)"))
        pts.append((t + 0.2, f"opacity:1;transform:translate({x:.1f}px,{y:.1f}px)"))
        nxt = taps[i + 1] if i + 1 < len(taps) else None
        if not nxt or nxt[0] - t > 1.7:
            pts.append((t + 0.55, f"opacity:0;transform:translate({x + 34:.1f}px,{y + 60:.1f}px)"))
    return m.track(pts, timing="ease-in-out")


# =====================================================================
# 手機畫面
# =====================================================================
S = 276 / 375
SX, SY, SW, SH = 12, 12, 276, 576
INK, INK2 = TP["gray800"], TP["gray600"]
DIVIDER, BGDARK, DARK = TP["gray200"], TP["gray50"], TP["gray800"]
ALARM = "#D45251"
SKIN, SKIN_LINE = "#F6CDA8", "#C98E6B"

# src/components/elder/Icon.tsx 的圖示（24×24，線寬 2.5）
APP_ICONS = {
    "health": '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
    "ride": '<path d="M4 16V11l2-5h12l2 5v5z"/><path d="M4 11h16"/><circle cx="7.5" cy="16.5" r="1.8"/><circle cx="16.5" cy="16.5" r="1.8"/>',
    "benefit": '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v10M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4"/>',
    "community": '<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M8 7c0-1.5 1-2 1-3M12 7c0-1.5 1-2 1-3M16 7c0-1.5 1-2 1-3"/>',
    "family": '<circle cx="8.5" cy="8" r="3"/><circle cx="16.5" cy="9" r="2.5"/><path d="M2.5 20a6 6 0 0 1 12 0M14 20a4.5 4.5 0 0 1 7.5-3.5"/>',
    "text": '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
    "phone": '<path d="M6 3h3l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v3a3 3 0 0 1-3 3A16 16 0 0 1 3 6a3 3 0 0 1 3-3z"/>',
    "help": '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/>',
    "search": '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/>',
    "home": '<path d="M3 11 12 4l9 7"/><path d="M5.5 9.5V20h13V9.5"/>',
    "eye": '<path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    "ear": '<path d="M7 9a5 5 0 0 1 10 0c0 3-3 4-3 7a3 3 0 0 1-6 0"/><path d="M10 9.5a2 2 0 0 1 4 0"/>',
    "smile": '<circle cx="12" cy="12" r="9"/><path d="M8 14a5 5 0 0 0 8 0M9 9.5v.5M15 9.5v.5"/>',
    "switch": '<path d="M4 8h14l-4-4M20 16H6l4 4"/>',
    "bell": '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2ZM10 21h4"/>',
}
# ServiceCard 的類別色與圖示（src/components/elder/ServiceCard.tsx 的 CATEGORY_STYLE）
CATEGORY = {"health": ("health", "health"), "ride": ("ride", "ride"), "benefit": ("benefit", "benefit"),
            "community": ("community", "community"), "family": ("family", "family"), "text": ("hearing", "text"),
            "help": ("dark", "phone"), "vision": ("dark", "eye")}
# 首頁 6 顆按鈕的圖示（src/lib/elder/home.ts）
HOME_ICON = {"health": "health", "ride": "ride", "benefit": "benefit", "community": "community",
             "family": "family", "hearing": "text"}


def app_icon(name: str, x: float, y: float, size: float, color: str) -> str:
    s = size / 24
    return (f'<g transform="translate({x:.1f},{y:.1f}) scale({s:.4f})" fill="none" stroke="{color}" stroke-width="2.5" '
            f'stroke-linecap="round" stroke-linejoin="round">{APP_ICONS[name]}</g>')


# ---- 斷行 ----
NO_START = set("，。、：；！？）」』》〉…,.:;!?)%")
TOKEN = re.compile(r"[A-Za-z0-9.,:/()\-+%#@'_]+|\s+|.")


def wrap(text: str, size: float, maxw: float) -> list[str]:
    """中文逐字斷行、英數字整串不拆；標點不放行首（放不下也掛在行尾）。"""
    lines: list[str] = []
    for para in text.split("\n"):
        cur = ""
        for tok in TOKEN.findall(para):
            if not cur and tok.isspace():
                continue
            if text_width(cur + tok, size) <= maxw or not cur or tok in NO_START:
                cur += tok
            else:
                lines.append(cur.rstrip())
                cur = "" if tok.isspace() else tok
        lines.append(cur.rstrip())
    return lines


def btn_colors(style: str) -> tuple[str, str, str | None]:
    """按鈕的底色、字色、框線色。"""
    if style in ELDER:
        bg, fg = ELDER[style]
        return bg, fg, None
    return {"dark": (DARK, "#FFFFFF", None), "plain": ("#FFFFFF", INK, DARK),
            "selected": (DARK, "#FFFFFF", None), "light": ("#FFFFFF", INK2, DIVIDER)}[style]


class Screen:
    """一頁網頁畫面，由上往下排（像 flex-col gap-5）。y 是目前排到的位置。"""

    def __init__(self, mode: str = "normal", m=None, top: float = 54, gap: float = 20, bg: str = "#FFFFFF"):
        self.mode, self.m, self.bg = mode, m, bg
        self.k = 1.3 if mode == "vision" else 1.0
        self.u = S * self.k
        self.x0 = SX + 16 * self.u
        self.x1 = SX + SW - 16 * self.u
        self.y = top
        self.g = gap
        self.out: list[str] = []
        self.over: list[str] = []   # 不跟著捲動的（底部固定列）
        self.at: dict[str, tuple[float, float]] = {}
        self.fixed: set[str] = set()   # 不跟著捲動的按鈕（底部固定列）
        self._stack: list = []

    @property
    def w(self) -> float:
        return self.x1 - self.x0

    def gap(self, px: float | None = None):
        self.y += (self.g if px is None else px) * self.u
        return self

    # ---- 文字 ----
    def lines(self, x: float, y: float, lines: list[str], px: float, color: str, weight: int = 400,
              lh: float | None = None, anchor: str = "start", out: list | None = None) -> float:
        size = px * self.u
        lh = (lh or px * 1.5) * self.u
        for line in lines:
            (self.out if out is None else out).append(
                T(x, y + lh / 2 + size * 0.36, line, round(size, 1), color, weight, anchor))
            y += lh
        return y

    def text(self, s: str, px: float = 20, color: str = INK2, weight: int = 400, lh: float | None = None,
             center: bool = False, gap: bool = True):
        size = px * self.u
        x = (self.x0 + self.x1) / 2 if center else self.x0
        self.y = self.lines(x, self.y, wrap(s, size, self.w), px, color, weight, lh, "middle" if center else "start")
        return self.gap() if gap else self

    def h1(self, s: str):
        return self.text(s, 32, INK, 700, 40)

    def h2(self, s: str, px: float = 28):
        return self.text(s, px, INK, 700, px * 9 / 7)

    def p(self, s: str, color: str = INK2, bold: bool = False, px: float = 20):
        return self.text(s, px, color, 700 if bold else 400)

    def small(self, s: str):
        return self.text(s, 16, INK2, 400, 24)

    # ---- 按鈕 ----
    def button(self, label: str, style: str = "plain", icon: str | None = None, name: str | None = None,
               press: float | None = None, min_h: float = 72, px: float = 28, center: bool = True,
               x0: float | None = None, x1: float | None = None, outline: bool = False, gap: bool = True):
        """ServiceLink／ServiceAction／BIG_BUTTON：min-h 72、圓角 16、px-5、圖示 32 在字的左邊。"""
        u = self.u
        x0 = self.x0 if x0 is None else x0
        x1 = self.x1 if x1 is None else x1
        bg, fg, border = btn_colors(style)
        ic = 32 * u if icon else 0
        inner = (x1 - x0) - 40 * u - (ic + 12 * u if icon else 0)
        size = px * u
        lines = wrap(label, size, inner)
        lh = px * 9 / 7 * u
        h = max(min_h * u, len(lines) * lh + 24 * u)
        y0 = self.y
        tw = max(text_width(s, size) for s in lines)
        gx = (x0 + x1) / 2 - (tw + (ic + 12 * u if icon else 0)) / 2 if center else x0 + 20 * u
        parts = [R(x0, y0, x1 - x0, h, round(16 * u, 1), bg)]
        if border:
            parts.append(R(x0 + 2 * u, y0 + 2 * u, x1 - x0 - 4 * u, h - 4 * u, round(14 * u, 1), "none", border, round(4 * u, 1)))
        if outline:
            parts.append(R(x0 - 5 * u, y0 - 5 * u, x1 - x0 + 10 * u, h + 10 * u, round(20 * u, 1), "none", TP["gray900"], round(5 * u, 1)))
        if icon:
            parts.append(app_icon(icon, gx, y0 + h / 2 - ic / 2, ic, fg))
            gx += ic + 12 * u
        ty = y0 + h / 2 - len(lines) * lh / 2
        for line in lines:
            parts.append(T(gx, ty + lh / 2 + size * 0.36, line, round(size, 1), fg, 700))
            ty += lh
        self._emit("".join(parts), press, name, ((x0 + x1) / 2, y0 + h / 2))
        self.y = y0 + h
        return self.gap() if gap else self

    def tile(self, x: float, y: float, w: float, h: float, label: str, key: str, row: bool = False,
             name: str | None = None, press: float | None = None, icon: str | None = None, px: float = 28):
        """首頁的大按鈕（ServiceLink）：圖示在上、字在下；row＝圖示在左（字放大時的單欄版）。"""
        u = self.u
        bg, fg = ELDER[key] if key in ELDER else btn_colors(key)[:2]
        icon = icon or HOME_ICON.get(key, "phone")
        size = px * u
        parts = [R(x, y, w, h, round(16 * u, 1), bg)]
        if row:
            ic = 32 * u
            parts.append(app_icon(icon, x + 24 * u, y + h / 2 - ic / 2, ic, fg))
            parts.append(T(x + 24 * u + ic + 12 * u, y + h / 2 + size * 0.36, label, round(size, 1), fg, 700))
        else:
            ic = 48 * u
            lines = wrap(label, size, w - 32 * u)
            top = y + h / 2 - (ic + 8 * u + 36 * u * len(lines)) / 2
            parts.append(app_icon(icon, x + w / 2 - ic / 2, top, ic, fg))
            self.lines(x + w / 2, top + ic + 8 * u, lines, px, fg, 700, 36, "middle", out=parts)
        self._emit("".join(parts), press, name, (x + w / 2, y + h / 2))

    def _emit(self, svg: str, press, name, center, out: list | None = None):
        if name:
            self.at[name] = center
        target = self.out if out is None else out
        if press is not None and self.m is not None:
            cx, cy = center
            target.append(f'<g class="{self.m.press(press)}">{svg}</g>'
                          f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{34 * self.u:.1f}" fill="{TP["gray900"]}" opacity="0" '
                          f'class="{self.m.ripple(press)}"/>')
        else:
            target.append(svg)

    # ---- 卡片與區塊 ----
    def card(self, border: str = DIVIDER, bw: float = 4, pad: float = 16, gap: float = 12, fill: str = "#FFFFFF"):
        self._stack.append((len(self.out), self.y, self.x0, self.x1, self.g, border, bw, pad, fill))
        inset = (bw + pad) * self.u
        self.x0 += inset
        self.x1 -= inset
        self.y += inset
        self.g = gap
        return self

    def end(self):
        idx, y0, x0, x1, g, border, bw, pad, fill = self._stack.pop()
        self.y += -self.g * self.u + (bw + pad) * self.u
        u = self.u
        rect = R(x0, y0, x1 - x0, self.y - y0, round(16 * u, 1), fill)
        if bw:
            rect += R(x0 + bw * u / 2, y0 + bw * u / 2, x1 - x0 - bw * u, self.y - y0 - bw * u, round(14 * u, 1), "none", border, round(bw * u, 1))
        self.out.insert(idx, rect)
        self.x0, self.x1, self.g = x0, x1, g
        return self.gap()

    def gray(self, s: str, bold: bool = False):
        """bg-bg-dark 的說明框（p-4）。"""
        self.card(border=BGDARK, bw=0, pad=16, fill=BGDARK)
        self.text(s, 20, INK, 700 if bold else 400)
        return self.end()

    def fail(self, s: str, name: str | None = None):
        """FailNote：白底、紅框、粗體，留在按鈕下方。"""
        self.card(border=ALARM, bw=4, pad=16)
        self.text(s, 20, INK, 700)
        return self.end()

    def input(self, value: str = "", placeholder: str = "", button: str | None = None, typing=None, name=None,
              press: float | None = None):
        """輸入框（border-4、min-h 14），右邊可以接一顆深色按鈕。typing＝(開始秒, 結束秒) 會一個字一個字打出來。"""
        u = self.u
        h = 56 * u
        bw = (text_width(button, 28 * u) + 40 * u) if button else 0
        x1 = self.x1 - (bw + 8 * u if button else 0)
        y0 = self.y
        parts = [R(self.x0, y0, x1 - self.x0, h, round(12 * u, 1), "#FFFFFF"),
                 R(self.x0 + 2 * u, y0 + 2 * u, x1 - self.x0 - 4 * u, h - 4 * u, round(10 * u, 1), "none", DARK, round(4 * u, 1))]
        size = 20 * u
        tx = self.x0 + 14 * u
        base = y0 + h / 2 + size * 0.36
        if value:
            parts.append(T(tx, base, value, round(size, 1), INK, 700))
            if typing and self.m is not None:
                vw = text_width(value, size)
                cls = self.m.typing(typing[0], typing[1], len(value))
                parts.append(f'<rect x="{tx - 1:.1f}" y="{y0 + 6 * u:.1f}" width="{vw + 3:.1f}" height="{h - 12 * u:.1f}" '
                             f'fill="#FFFFFF" opacity="0" class="{cls}"/>')
                if placeholder:  # 打字前看得到提示字
                    ph = T(tx, base, placeholder, round(size, 1), TP["gray400"])
                    parts.append(f'<g opacity="0" class="{self.m.show([(0, typing[0] + 0.05)], 0.05)}">{ph}</g>')
        elif placeholder:
            parts.append(T(tx, base, placeholder, round(size, 1), TP["gray400"]))
        self.out.append("".join(parts))
        if name:
            self.at[name] = ((self.x0 + x1) / 2, y0 + h / 2)
        if button:
            self.y = y0
            self.button(button, "dark", min_h=56, x0=self.x1 - bw, name=(name or "input") + "-btn", press=press, gap=False)
        self.y = y0 + h
        return self.gap()

    def check(self, label: str, checked: bool = True, press: float | None = None, name: str | None = None):
        """家人設定頁的勾選項：整行是框線卡片（min-h 72、border-4，勾選時框變深），勾選框 32px。"""
        u = self.u
        size = 20 * u
        lines = wrap(label, size, self.w - (16 + 32 + 16 + 16 + 8) * u)
        h = max(72 * u, len(lines) * 30 * u + 24 * u)
        y0 = self.y
        border = TP["gray900"] if checked else DIVIDER
        parts = [R(self.x0, y0, self.w, h, round(16 * u, 1), "#FFFFFF"),
                 R(self.x0 + 2 * u, y0 + 2 * u, self.w - 4 * u, h - 4 * u, round(14 * u, 1), "none", border, round(4 * u, 1))]
        box = 28 * u
        bx, by = self.x0 + 18 * u, y0 + h / 2 - box / 2
        parts.append(R(bx, by, box, box, round(6 * u, 1), TP["gray900"] if checked else "#FFFFFF", TP["gray900"], round(2.5 * u, 1)))
        if checked:
            parts.append(f'<path d="M{bx + box * .22:.1f} {by + box * .52:.1f}l{box * .2:.1f} {box * .2:.1f} {box * .38:.1f}-{box * .42:.1f}" '
                         f'fill="none" stroke="#FFFFFF" stroke-width="{3 * u:.1f}" stroke-linecap="round" stroke-linejoin="round"/>')
        ly = y0 + h / 2 - len(lines) * 30 * u / 2
        self.lines(bx + box + 16 * u, ly, lines, 20, INK, 700, 30, out=parts)
        self._emit("".join(parts), press, name, (bx + box / 2, y0 + h / 2))
        self.y = y0 + h
        return self.gap(12)

    def label(self, s: str):
        """表單欄位的標籤（粗體 20）。"""
        return self.text(s, 20, INK, 700, gap=False).gap(8)

    def service(self, category: str, title: str, desc: str, buttons, owner: str | None = None,
                note: str | None = None, press: dict | None = None, hearing_order: bool = False):
        """ServiceCard（src/components/elder/ServiceCard.tsx）：框線卡片、類別圖示＋標題、說明、
        按鈕（第一顆用類別色，其他白底框線）、出處。buttons＝[(字, 動作類型)]，動作類型決定圖示。"""
        press = press or {}
        style = CATEGORY[category]
        u = self.u
        self.card(gap=12)
        ic = 36 * u
        self.out.append(app_icon(style[1], self.x0, self.y, ic, INK))
        lines = wrap(title, 28 * u, self.w - ic - 12 * u)
        self.y = self.lines(self.x0 + ic + 12 * u, self.y, lines, 28, INK, 700, 36)
        self.gap()
        self.text(desc, 20, INK2)
        if note:
            self.card(border=BGDARK, bw=0, pad=12, fill=BGDARK)
            self.text(note, 20, INK)
            self.end()
        for i, (label, kind) in enumerate(buttons):
            icon = {"phone": "phone", "page": "search"}.get(kind, "text")
            self.button(label, style[0] if i == 0 else "plain", icon=icon, name=label, press=press.get(label))
        if owner:
            self.text(owner, 16, INK2, 400, 24)
        return self.end()

    def choice(self, label: str, pressed: bool = False, style: str = "plain", press: float | None = None,
               name: str | None = None, check: bool = False):
        """回答用的大按鈕；pressed＝選到（深底或粗框，前面加 ✓）。"""
        if pressed and check:
            return self.button("✓" + label, "selected", name=name or label, press=press)
        return self.button(label, style, name=name or label, press=press, outline=pressed)

    def option(self, icon: str, title: str, detail: str, selected: bool = False, press: float | None = None,
               name: str | None = None):
        """選模式頁的大卡片（ModePicker.tsx）：border-4、p-5、圖示 48 在左，標題 28 粗體＋說明 20。"""
        u = self.u
        x0, x1 = self.x0, self.x1
        ic = 48 * u
        tx = x0 + (4 + 20) * u + ic + 16 * u
        tw = x1 - (4 + 20) * u - tx
        tl = wrap(title + ("（目前）" if selected else ""), 28 * u, tw)
        dl = wrap(detail, 20 * u, tw)
        h = (4 + 20) * 2 * u + len(tl) * 36 * u + 4 * u + len(dl) * 30 * u
        y0 = self.y
        border = TP["gray900"] if selected else DIVIDER
        parts = [R(x0, y0, x1 - x0, h, round(16 * u, 1), "#FFFFFF"),
                 R(x0 + 2 * u, y0 + 2 * u, x1 - x0 - 4 * u, h - 4 * u, round(14 * u, 1), "none", border, round(4 * u, 1)),
                 app_icon(icon, x0 + 24 * u, y0 + h / 2 - ic / 2, ic, INK)]
        y = self.lines(tx, y0 + 24 * u, tl, 28, INK, 700, 36, out=parts)
        self.lines(tx, y + 4 * u, dl, 20, INK2, 400, 30, out=parts)
        self._emit("".join(parts), press, name, ((x0 + x1) / 2, y0 + h / 2))
        self.y = y0 + h
        return self.gap(16)

    def raw(self, svg: str, h: float):
        self.out.append(svg)
        self.y += h
        return self.gap()

    def scroll(self, dy: float):
        """整頁往上捲 dy（底部固定列不動），點按位置跟著換算。"""
        self.out = [f'<g transform="translate(0,{-dy:.1f})">{"".join(self.out)}</g>']
        self.at = {k: (x, y if k in self.fixed else y - dy) for k, (x, y) in self.at.items()}
        return self

    # ---- 輸出 ----
    def svg(self, scroll: float = 0, scroll_cls: str | None = None) -> str:
        body = "".join(self.out)
        if scroll_cls:
            body = f'<g class="{scroll_cls}">{body}</g>'
        if scroll:
            body = f'<g transform="translate(0,{-scroll:.1f})">{body}</g>'
        return f'{R(SX, SY, SW, SH, 36, self.bg)}{body}{"".join(self.over)}'


# ---- 常用的整頁 ----
def page(mode: str = "normal", m=None, title: str | None = None, press_home: float | None = None) -> Screen:
    """PageShell：左上「回首頁」＋ h1（pt-4、gap-5）。"""
    s = Screen(mode, m, top=54 + 16 * S * (1.3 if mode == "vision" else 1))
    u = s.u
    w = (16 + 28 + 8) * u + text_width("回首頁", 20 * u) + 16 * u + 8 * u
    h = 56 * u
    parts = (R(s.x0, s.y, w, h, round(12 * u, 1), "#FFFFFF")
             + R(s.x0 + 2 * u, s.y + 2 * u, w - 4 * u, h - 4 * u, round(10 * u, 1), "none", DARK, round(4 * u, 1))
             + app_icon("home", s.x0 + 18 * u, s.y + h / 2 - 14 * u, 28 * u, INK)
             + T(s.x0 + 54 * u, s.y + h / 2 + 20 * u * 0.36, "回首頁", round(20 * u, 1), INK, 700))
    s._emit(parts, press_home, "home", (s.x0 + w / 2, s.y + h / 2))
    s.y += h
    s.gap()
    if title:
        s.h1(title)
    return s


def home(mode: str = "normal", m=None, gift: bool = True, bus: list | None = None, press: dict | None = None,
         name: str = "金大森", greeting: str = "午安") -> Screen:
    """首頁（src/components/elder/HomeScreen.tsx）。
    gift：重陽禮金卡（2026-11-07 的示範帳號：86 歲、3,000 元、還有 6 天）。
    bus：首頁公車卡片的 [(label, 時間文字)]。press：{按鈕名稱: 按下的秒數}。
    字放大到 1.25 倍以上（看不清楚模式）改成單欄、圖示在左，底部電話與求助不固定在畫面上。"""
    press = press or {}
    s = Screen(mode, m, top=54 + 20 * S * (1.3 if mode == "vision" else 1))
    large = mode == "vision"
    hearing = mode == "hearing"
    u = s.u
    s.h1(f"{greeting}，{name}" if name else greeting)
    if gift:
        s.card(border=ELDER["benefit"][0])
        s.h2("還沒收到重陽禮金嗎？")
        s.p("您今年可能可以領 3,000 元。還有 6 天截止（11/13）。最後以社會局審核為準。")
        s.button("看怎麼申請", "benefit", name="gift", press=press.get("gift"))
        s.end()
    if bus:
        s.card(border=ELDER["ride"][0])
        s.out.append(app_icon("ride", s.x0, s.y + 3 * u, 30 * u, INK))
        s.lines(s.x0 + 38 * u, s.y, ["公車還有幾分鐘"], 28, INK, 700, 36)
        s.y += 36 * u
        s.gap()
        for label, eta in bus:
            s.card(border=BGDARK, bw=0, fill=BGDARK, gap=8)
            s.text(label, 20, INK2)
            s.text(eta, 32, INK, 700, 40)
            s.button("帶我走到站牌", "plain", name="walk", press=press.get("walk"), min_h=56)
            s.end()
        s.button("再查一次", "ride", name="refresh", press=press.get("refresh"))
        s.end()
    # 6 顆大按鈕
    gap = 16 * u
    if large:
        for label, key in HOME:
            s.tile(s.x0, s.y, s.w, 80 * u, label, key, row=True, name=key, press=press.get(key))
            s.y += 80 * u + gap
        s.y += 20 * u - gap
    else:
        w = (s.w - gap) / 2
        h = 144 * u
        for i, (label, key) in enumerate(HOME):
            x = s.x0 + (i % 2) * (w + gap)
            y = s.y + (i // 2) * (h + gap)
            s.tile(x, y, w, h, label, key, name=key, press=press.get(key))
        s.y += 3 * h + 2 * gap + 20 * u
    s.button("打字找服務" if hearing else "說話或打字找服務", "plain", icon="search", name="find",
             press=press.get("find"), center=not large)
    s.button(f"換模式：{ {'normal': '都還好', 'vision': '看不清楚', 'hearing': '聽不清楚'}[mode]}", "plain",
             icon="switch", name="mode", press=press.get("mode"), center=not large)
    s.button("我是家人，幫長輩設定", "plain", icon="family", name="family-setup", press=press.get("family-setup"),
             center=not large)
    # 電話與求助
    bottom = [("1999 文字", "dark", "text") if hearing else ("1999", "dark", "phone"),
              ("1966", "dark", "phone"), ("求助", "help", "help")]
    if large:
        w = (s.w - 12 * u) / 2
        for i, (label, key, ic) in enumerate(bottom):
            x = s.x0 + (i % 2) * (w + 12 * u)
            y = s.y + (i // 2) * (124 * u + 12 * u)
            ww = s.w if i == 2 else w
            if i == 2:
                s.tile(s.x0, y, ww, 72 * u, label, key, row=True, icon=ic, name=label, press=press.get(label))
            else:
                s.tile(x, y, ww, 124 * u, label, key, icon=ic, name=label, press=press.get(label))
    else:
        w = (s.w - 2 * 12 * u) / 3
        rows = max(len(wrap(label, 28 * u, w - 32 * u)) for label, _, _ in bottom)
        th = (16 + 48 + 8 + 36 * rows + 16) * u
        bar_h = 12 * u + th + 16 * u
        top = SY + SH - bar_h
        s.over.append(R(SX, top, SW, bar_h, 0, "#FFFFFF", extra=' fill-opacity=".95"')
                      + f'<path d="M{SX} {top:.1f}H{SX + SW}" stroke="{DIVIDER}" stroke-width="1"/>')
        saved = s.out
        s.out = s.over
        for i, (label, key, ic) in enumerate(bottom):
            s.tile(s.x0 + i * (w + 12 * u), top + 12 * u, w, th, label, key, icon=ic, name=label,
                   press=press.get(label))
            s.fixed.add(label)
        s.out = saved
    return s


# ---- 疊在畫面上的東西 ----
def toast(text: str, mode: str = "normal") -> str:
    """大字提示（ElderProvider 的 role=status）：fixed inset-x-4 top-4、深色圓角、白色粗體 28px。"""
    u = S * (1.3 if mode == "vision" else 1)
    x0, x1 = SX + 16 * u, SX + SW - 16 * u
    size = 28 * u
    lines = wrap(text, size, x1 - x0 - 40 * u)
    lh = 36 * u
    h = len(lines) * lh + 32 * u
    y0 = 54
    out = [R(x0, y0, x1 - x0, h, round(16 * u, 1), TP["gray900"], extra=' fill-opacity=".95"')]
    y = y0 + 16 * u
    for line in lines:
        out.append(T((x0 + x1) / 2, y + lh / 2 + size * 0.36, line, round(size, 1), "#FFFFFF", 700, "middle"))
        y += lh
    return "".join(out)


def finger() -> str:
    """點按的手指，指尖在 (0,0)。"""
    return (f'<g transform="rotate(-24)" stroke="{SKIN_LINE}" stroke-width="2" stroke-linejoin="round">'
            f'<path d="M-10 8a10 10 0 0 1 20 0v58h-20z" fill="{SKIN}"/>'
            f'<path d="M-24 60c0-8 6-12 12-12h30c8 0 14 6 14 14v34c0 18-12 30-30 30h-6c-12 0-20-10-20-22z" fill="{SKIN}"/>'
            f'<path d="M-5 4h10" stroke="#FBE3CF" stroke-width="5" stroke-linecap="round"/></g>')


def qr_modules(n: int = 21, seed: int = 7) -> list[tuple[int, int]]:
    """示意用的 QR code 方格（不是真的能掃的碼）：三個定位方塊＋固定亂數。"""
    rnd = random.Random(seed)
    cells = set()

    def finder(ox, oy):
        for y in range(7):
            for x in range(7):
                if x in (0, 6) or y in (0, 6) or (2 <= x <= 4 and 2 <= y <= 4):
                    cells.add((ox + x, oy + y))

    finder(0, 0)
    finder(n - 7, 0)
    finder(0, n - 7)
    reserved = lambda x, y: (x < 8 and y < 8) or (x >= n - 8 and y < 8) or (x < 8 and y >= n - 8)  # noqa: E731
    for y in range(n):
        for x in range(n):
            if not reserved(x, y) and rnd.random() < 0.48:
                cells.add((x, y))
    return sorted(cells)


def qr(x: float, y: float, size: float, color: str = "#171B1D", seed: int = 7) -> str:
    n = 21
    d = "".join(f"M{i} {j}h1v1h-1z" for i, j in qr_modules(n, seed))
    return f'<path transform="translate({x:.1f},{y:.1f}) scale({size / n:.4f})" d="{d}" fill="{color}"/>'


def notification(title: str, body: str, y: float = 52) -> str:
    """系統通知（台北通 App 用 flutter_local_notifications 排的通知）。"""
    x0, x1 = SX + 10, SX + SW - 10
    lines = wrap(body, 12.5, x1 - x0 - 24)
    h = 52 + len(lines) * 17
    out = [R(x0, y, x1 - x0, h, 16, "#FFFFFF", extra=' fill-opacity=".96"'),
           R(x0 + 12, y + 11, 18, 18, 5, TP["primary500"]),
           T(x0 + 36, y + 24.5, "台北通", 11.5, INK2, 700),
           T(x0 + 12, y + 46, title, 14, INK, 800)]
    yy = y + 52
    for line in lines:
        out.append(T(x0 + 12, yy + 12, line, 12.5, INK, 400))
        yy += 17
    return "".join(out)


def lock_screen(clock: str, date: str, night: bool = True) -> str:
    top, bottom = (TP["primary900"], "#0B1A1D") if night else (TP["primary300"], TP["primary600"])
    return (f'<defs><linearGradient id="lock-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{top}"/>'
            f'<stop offset="1" stop-color="{bottom}"/></linearGradient></defs>'
            + R(SX, SY, SW, SH, 36, "url(#lock-bg)")
            + T(150, 132, date, 15, "#FFFFFF", 600, "middle")
            + T(150, 196, clock, 64, "#FFFFFF", 300, "middle"))


def camera(qr_seed: int = 7) -> str:
    """原生的掃描畫面（qr_code_scan）：相機畫面＋對準框；網頁上沒有字，這裡也不畫字。"""
    out = [R(SX, SY, SW, SH, 36, "#2A3236"),
           R(60, 190, 180, 250, 22, "#3A4448"),          # 家人手上的手機（相機看到的）
           R(72, 210, 156, 210, 10, "#FFFFFF"),
           qr(92, 236, 116, seed=qr_seed)]
    # 對準框四個角
    c, x0, y0, x1, y1 = 26, 70, 218, 230, 378
    for (x, y, dx, dy) in ((x0, y0, 1, 1), (x1, y0, -1, 1), (x0, y1, 1, -1), (x1, y1, -1, -1)):
        out.append(f'<path d="M{x} {y + dy * c}V{y}H{x + dx * c}" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/>')
    return "".join(out)


def bars(cx: float, cy: float, color: str = "#FFFFFF", n: int = 7, h: float = 22) -> str:
    """收音中的聲波（每根 class="w" 上下伸縮，延遲錯開）。"""
    hs = [0.45, 0.8, 1.0, 0.6, 0.9, 0.5, 0.75][:n]
    out = []
    for i, k in enumerate(hs):
        x = cx + (i - (n - 1) / 2) * 7
        out.append(f'<rect x="{x - 2:.1f}" y="{cy - h * k / 2:.1f}" width="4" height="{h * k:.1f}" rx="2" fill="{color}" '
                   f'class="w" style="animation-delay:-{i * 0.13:.2f}s"/>')
    return "".join(out)


WAVE_CSS = (".w{transform-box:fill-box;transform-origin:center;animation:wave 1s ease-in-out infinite}"
            "@keyframes wave{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}")
