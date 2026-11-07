"""流程圖的動畫版：動畫流程圖＋同步的情境手機＋逐步說明（只用 Python 標準函式庫）。

流程圖本身（節點、連線、文字）仍然寫在 build_diagrams.py；這支程式只負責「讓它動起來」：
- 上半部左邊是情境手機（上方標出目前是哪一種模式），右邊是每一步的說明；下半部是原本的流程圖。
- 每一步依序亮起：流程圖的節點加亮框、連線描一次並跑過一個光點、說明那一行加底色；
  手機同時演出長輩在這一步看到、做的事（手指點按鈕、按鈕縮一下＋漣漪、換頁、一個字一個字打字、
  收音波形、大字提示、唸出來或靜音、震動）。一輪跑完停一下再循環。
- 三種模式的差異：手機上方的模式標籤會切換，跟模式有關的步驟（按鈕回饋、找服務、撥號 vs 文字）
  會換成另外兩種模式演一次。差異以 README「三種模式」那張表和 src/ 的程式為準。
- architecture.svg 只加資料流動畫（沒有手機）。

怎麼重跑（兩種都可以，結果一樣）：

    python3 docs/diagrams/build_diagrams.py      # 平常用這個：它會先呼叫這裡的 install()
    python3 docs/diagrams/build_flow_motion.py

- 靜止畫面要完整：系統設定「減少動態效果」或瀏覽器不跑動畫時，流程圖、所有說明文字都看得到，
  手機停在每張圖指定的那一步（hero）。
- 手機畫面上的字一律照 src/ 的程式與示範帳號 townpass/assets/mock_data/account.json
  （金大森，1940/03/01，中山區正得里；今天以 2026-11-07 計算 → 86 歲、重陽禮金還有 6 天截止）；查不到的不畫。
- 流程圖的節點用「第一行文字」找（d.find），連線用「從哪個節點到哪個節點」找（d.link／d.into）；
  build_diagrams.py 改了節點文字，這裡也要跟著改。
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass, field

sys.dont_write_bytecode = True  # 不要在 docs/ 留下 __pycache__
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import phone_kit as ui  # noqa: E402
from build_readme_art import TP, R, T, buzz_marks, phone_frame_open, phone_island, text_width  # noqa: E402
from phone_kit import Motion, app_icon, finger, finger_track, wrap  # noqa: E402

HID = ' opacity="0"'
SOFT = ' stroke-opacity=".45"'
MODE_NAME = {"normal": "都還好", "vision": "看不清楚", "hearing": "聽不清楚"}
MODE_ICON = {"normal": "smile", "vision": "eye", "hearing": "ear"}

# 上半部的版面
PHONE_X, PHONE_Y, PHONE_S = 56, 132, 0.86
CAP_X = 364
BAND_H = 584            # 流程圖整個往下移這麼多


@dataclass
class Step:
    caption: str
    nodes: list = field(default_factory=list)   # 流程圖的節點（Box）
    edges: list = field(default_factory=list)   # 這一步走過的連線：[(x, y), …] 折線
    dur: float = 3.2


@dataclass
class Frame:
    t: float
    svg: str
    who: str = "normal"     # normal／vision／hearing（長輩的手機）、family（家人的手機）、app（還沒選模式）
    hero: bool = False


class Story:
    def __init__(self, steps: list[Step], lead: float = 0.5, pause: float = 1.8, band: bool = True):
        self.steps = steps
        self.t: list[float] = []
        t = lead
        for st in steps:
            self.t.append(t)
            t += st.dur
        self.T = t + pause
        self.m = Motion(self.T)
        self.band = band
        self.frames: list[Frame] = []
        self.taps: list[tuple[float, float, float]] = []
        self.over: list[str] = []       # 螢幕上的疊加物（大字提示、通知、聲波…），手機區域座標
        self.side: list[str] = []       # 手機外面的疊加物（喇叭／靜音、震動）

    def end(self, i: int) -> float:
        return self.t[i] + self.steps[i].dur

    # ---- 手機 ----
    def frame(self, t: float, screen, who: str = "normal", hero: bool = False):
        svg = screen if isinstance(screen, str) else screen.svg()
        self.frames.append(Frame(t, svg, who, hero))

    def tap(self, t: float, screen, name: str):
        x, y = screen.at[name]
        self.taps.append((t, x, y))

    def toast(self, t: float, text: str, mode: str = "normal", dur: float = 1.7, sound: bool | None = None):
        """announce／say：大字提示（＋聽得到的模式唸出來，聽不清楚模式顯示靜音）。"""
        cls = self.m.pop(t, t + dur)
        self.over.append(f'<g{HID} class="{cls}">{ui.toast(text, mode)}</g>')
        self.voice(t, t + dur, mode if sound is None else ("normal" if sound else "hearing"))

    def voice(self, t0: float, t1: float, mode: str = "normal"):
        """手機右上角的小圓章：唸出來（喇叭＋聲波）或不出聲音（靜音）。"""
        cls = self.m.pop(t0, t1)
        if mode == "hearing":
            ic = (f'<path d="M-11 -5h5l6-5v20l-6-5h-5z" fill="{TP["gray700"]}"/>'
                  f'<path d="M4 -4l9 9M13 -4l-9 9" stroke="{TP["orange500"]}" stroke-width="3" stroke-linecap="round"/>')
            ring = TP["orange500"]
        else:
            ic = (f'<path d="M-12 -5h5l6-5v20l-6-5h-5z" fill="{TP["primary700"]}"/>'
                  f'<g fill="none" stroke="{TP["primary600"]}" stroke-width="2.6" stroke-linecap="round">'
                  f'<path d="M4 -5a6 6 0 0 1 0 10"/><path d="M8 -9a12 12 0 0 1 0 18"/></g>')
            ring = TP["primary500"]
        self.side.append(f'<g transform="translate(300,64)"><g{HID} class="{cls}">'
                         f'<circle r="26" fill="#FFFFFF" stroke="{ring}" stroke-width="3"/>{ic}</g></g>')

    def buzz(self, t: float):
        self.side.append(f'<g{HID} class="{self.m.buzz([t])}">{buzz_marks(TP["primary600"])}</g>')

    def overlay(self, svg: str, windows, hero: bool = False):
        cls = self.m.show(windows)
        self.over.append(f'<g{"" if hero else HID} class="{cls}">{svg}</g>')

    # ---- 流程圖上的強調層 ----
    def diagram_overlays(self, rx_of) -> tuple[str, str]:
        m = self.m
        edges, nodes = [], []
        for i, st in enumerate(self.steps):
            t0, t1 = self.t[i], self.end(i)
            for pts in st.edges:
                d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts)
                edges.append(f'<path d="{d}" pathLength="100" fill="none" stroke="{TP["primary600"]}" stroke-width="3.5" '
                             f'stroke-linejoin="round" stroke-dasharray="100 100"{HID} class="{m.draw(t0, t1)}"/>'
                             f'<path d="{d}" pathLength="100" fill="none" stroke="{TP["primary500"]}" stroke-width="11" '
                             f'stroke-linecap="round" stroke-dasharray="0.01 200"{HID} class="{m.dot(t0 + 0.05)}"/>')
            for b in st.nodes:
                pad = 6
                x, y, w, h = b.left - pad, b.top - pad, b.w + 2 * pad, b.h + 2 * pad
                rx = min(rx_of(b) + pad, h / 2)
                on = m.show([(t0 + 0.35, t1)], 0.2)
                seen = m.show([(t1 - 0.2, self.T - 0.6)], 0.3)
                nodes.append(f'<g{HID} class="{on}">'
                             f'{R(x - 3, y - 3, w + 6, h + 6, rx + 3, "none", TP["primary300"], 8, extra=SOFT)}'
                             f'{R(x, y, w, h, rx, "none", TP["primary600"], 3.5)}</g>'
                             f'<g{HID} class="{seen}">{R(x + 2, y + 2, w - 4, h - 4, max(rx - 2, 2), "none", TP["primary300"], 2)}</g>')
        return "".join(edges), "".join(nodes)

    # ---- 上半部：情境手機＋說明 ----
    def band_svg(self, width: float) -> str:
        m = self.m
        frames = sorted(self.frames, key=lambda f: f.t)
        if frames and not any(f.hero for f in frames):
            frames[0].hero = True
        screens, who_windows = [], {}
        for i, f in enumerate(frames):
            end = frames[i + 1].t + 0.6 if i + 1 < len(frames) else self.T - 0.25  # 下一個畫面完全出現後才淡出
            wins = [(0, end), (self.T - 0.5, self.T)] if i == 0 else [(f.t, end)]
            screens.append(f'<g{"" if f.hero else HID} class="{m.show(wins, 0.28)}">{f.svg}</g>')
            who_windows.setdefault(f.who, []).extend(wins)
        hero_who = next(f.who for f in frames if f.hero) if frames else "normal"
        ph = [f'<g transform="translate({PHONE_X},{PHONE_Y}) scale({PHONE_S})">',
              f'<g filter="url(#ph-shadow)">{phone_frame_open()}</g>',
              R(ui.SX, ui.SY, ui.SW, ui.SH, 36, "#FFFFFF"),
              f'<g clip-path="url(#scr)">{"".join(screens)}{"".join(self.over)}</g>',
              phone_island(), "".join(self.side)]
        if self.taps:
            ph.append(f'<g{HID} class="{finger_track(m, self.taps)}">{finger()}</g>')
        ph.append("</g>")
        return "".join(ph) + self._chips(who_windows, hero_who) + self._captions(width)

    def _chips(self, who_windows, hero_who) -> str:
        m = self.m
        cx, y = PHONE_X + 150 * PHONE_S, 96
        items = [(k, MODE_NAME[k]) for k in ("normal", "vision", "hearing")]
        widths = [text_width(name, 13) + 36 for _, name in items]
        total = sum(widths) + 12
        x = cx - total / 2
        base, on = [], []
        for (k, name), w in zip(items, widths):
            base.append(R(x, y, w, 26, 13, "#FFFFFF", TP["primary200"], 1.5)
                        + app_icon(MODE_ICON[k], x + 9, y + 5, 16, TP["primary700"])
                        + T(x + 29, y + 17.7, name, 13, TP["primary700"], 700))
            if k in who_windows:
                vis = "" if hero_who == k else HID
                on.append(f'<g{vis} class="{m.show(who_windows[k], 0.2)}">{R(x, y, w, 26, 13, TP["primary700"])}'
                          f'{app_icon(MODE_ICON[k], x + 9, y + 5, 16, "#FFFFFF")}{T(x + 29, y + 17.7, name, 13, "#FFFFFF", 800)}</g>')
            x += w + 6
        out = "".join(base) + "".join(on)
        if "family" in who_windows:   # 家人的手機：模式標籤換成「家人的手機」
            label = "家人的手機"
            w = text_width(label, 13) + 40
            fam = (R(cx - total / 2 - 2, y - 2, total + 4, 30, 15, "#FFFFFF")
                   + R(cx - w / 2, y, w, 26, 13, TP["secondary500"])
                   + app_icon("family", cx - w / 2 + 10, y + 5, 16, TP["gray900"])
                   + T(cx - w / 2 + 31, y + 17.7, label, 13, TP["gray900"], 800))
            out += f'<g{"" if hero_who == "family" else HID} class="{m.show(who_windows["family"], 0.2)}">{fam}</g>'
        return out

    def _captions(self, width: float) -> str:
        m = self.m
        cap_w = width - 40 - CAP_X
        size, lh = 16, 23
        out = [T(CAP_X, 104, "示範長輩：金大森，86 歲，住中山區（台北通測試帳號）", 13, TP["gray500"], 400)]
        blocks = [wrap(st.caption, size, cap_w - 48) for st in self.steps]
        top, bottom = 122, PHONE_Y + 600 * PHONE_S
        total = sum(len(b) * lh + 18 for b in blocks)
        gap = min(12, max(2, (bottom - top - total) / max(len(blocks) - 1, 1)))
        y = top
        for i, lines in enumerate(blocks):
            h = len(lines) * lh + 18
            t0, t1 = self.t[i], self.end(i)
            cls = m.show([(t0, t1)], 0.2)
            out.append(f'<g{HID} class="{cls}">{R(CAP_X - 8, y, cap_w + 8, h, 12, TP["primary50"], TP["primary300"], 1.5)}'
                       f'{R(CAP_X - 8, y + 8, 4, h - 16, 2, TP["primary600"])}</g>')
            cy = y + 9 + lh / 2
            num = lambda fill, ink: (f'<circle cx="{CAP_X + 15}" cy="{cy:.1f}" r="13" fill="{fill}"/>'  # noqa: E731
                                     + T(CAP_X + 15, cy + 4.8, str(i + 1), 13.5, ink, 800, "middle"))
            out.append(num(TP["primary100"], TP["primary700"]))
            out.append(f'<g{HID} class="{cls}">{num(TP["primary600"], "#FFFFFF")}</g>')
            ty = y + 9
            for line in lines:
                out.append(T(CAP_X + 40, ty + lh / 2 + size * 0.36, line, size, TP["gray800"], 500))
                ty += lh
            y += h + gap
        return "".join(out)

    def defs(self) -> str:
        return (f'<clipPath id="scr"><rect x="{ui.SX}" y="{ui.SY}" width="{ui.SW}" height="{ui.SH}" rx="36"/></clipPath>'
                f'<filter id="ph-shadow" x="-30%" y="-20%" width="160%" height="150%"><feDropShadow dx="0" dy="10" '
                f'stdDeviation="10" flood-color="{TP["primary800"]}" flood-opacity=".22"/></filter>') if self.band else ""


# =====================================================================
# 掛到 build_diagrams.Diagram 上：記下節點與連線、存檔前套上動畫
# =====================================================================
STORIES: dict = {}


def story_for(name: str):
    def deco(fn):
        STORIES[name] = fn
        return fn
    return deco


def install(ns: dict) -> None:
    """把 ns（build_diagrams 的全域）裡的 Diagram 換成會記錄節點、存檔前套上動畫的版本。"""
    base = ns["Diagram"]
    if getattr(base, "_motion", False):
        return

    class MotionDiagram(base):
        _motion = True

        def __init__(self, *a, **k):
            super().__init__(*a, **k)
            self.boxes: list = []     # (Box, 第一行文字, 圓角)
            self.paths: list = []     # 每條連線的折線點
            self.story: Story | None = None

        def box(self, cx, cy, lines, kind="ours", w=None, pill=False, min_w=0, step=None):
            b = super().box(cx, cy, lines, kind, w=w, pill=pill, min_w=min_w, step=step)
            self.boxes.append((b, lines[0], b.h / 2 if pill else 12))
            return b

        def db(self, cx, cy, lines, w=200):
            b = super().db(cx, cy, lines, w=w)
            self.boxes.append((b, lines[0], 16))
            return b

        def edge(self, pts, *a, **k):
            super().edge(pts, *a, **k)
            self.paths.append([tuple(p) for p in pts])

        # ---- 找節點、找連線 ----
        def find(self, text: str, i: int = 0):
            hits = [b for b, first, _ in self.boxes if first == text or first.startswith(text)]
            if len(hits) <= i:
                raise KeyError(f"{self.title}：找不到節點「{text}」（build_diagrams.py 的文字改了嗎？）")
            return hits[i]

        def link(self, a, b):
            for p in self.paths:
                if _on(p[0], a) and _on(p[-1], b):
                    return p
            raise KeyError(f"{self.title}：找不到連線 {a} → {b}")

        def into(self, b, i: int = 0):
            hits = [p for p in self.paths if _on(p[-1], b)]
            if len(hits) <= i:
                raise KeyError(f"{self.title}：找不到連到 {b} 的線")
            return hits[i]

        def rx_of(self, box) -> float:
            return next(r for b, _, r in self.boxes if b is box)

        def svg(self) -> str:
            st = self.story
            if not st:
                return super().svg()
            edge_fx, node_fx = st.diagram_overlays(self.rx_of)
            band = st.band_svg(self.w) if st.band else ""
            self.edges.append(edge_fx)
            self.nodes.append(node_fx)
            if st.band:
                self.back.insert(0, f'<g transform="translate(0,{BAND_H})">')
                self.front.append("</g>" + band + f'<path d="M32 {BAND_H + 76}H{self.w - 32}" stroke="{TP["gray100"]}" '
                                  f'stroke-width="2" stroke-dasharray="2 6" stroke-linecap="round"/>')
                self.h += BAND_H
            out = super().svg()
            css = st.m.css(ui.WAVE_CSS if "class=\"w\"" in out else "")
            return out.replace("<defs>", f"<style>{css}</style><defs>", 1).replace("</defs>", st.defs() + "</defs>", 1)

        def save(self, name: str):
            fn = STORIES.get(name)
            if fn:
                fn(self)
            path = os.path.join(HERE, name)
            content = self.svg()
            with open(path, "w", encoding="utf-8", newline="\n") as f:
                f.write(content)
            print("寫入", os.path.relpath(path), f"{len(content.encode()) / 1024:.1f} KB")

    ns["Diagram"] = MotionDiagram


def _on(p, b, tol: float = 1.6) -> bool:
    x, y = p
    on_v = (abs(x - b.left) < tol or abs(x - b.right) < tol) and b.top - tol <= y <= b.bottom + tol
    on_h = (abs(y - b.top) < tol or abs(y - b.bottom) < tol) and b.left - tol <= x <= b.right + tol
    return on_v or on_h


# =====================================================================
# 共用：點按、常用的畫面
# =====================================================================
def press(st, t, scr, name, speak=None, mode="normal", sound=None):
    """點一下：手指移過去、按鈕縮一下＋漣漪（畫面建立時已帶 press 時間）、震動；
    speak＝announce 的大字（聽得到的模式同時唸出來）。"""
    st.tap(t, scr, name)
    st.buzz(t + 0.05)
    if speak:
        st.toast(t + 0.12, speak, mode, sound=sound)


def call_confirm(m, mode="normal", press_call=None, fail=False):
    """撥號確認頁（CallConfirm.tsx）：首頁「1966」→ /call/ltc-1966。聽不清楚模式把文字管道排在撥號前面。"""
    s = ui.page(mode, m, title="打給 1966 長照")
    s.p("申請長期照顧：居家照顧、交通接送、輔具、喘息服務。也可以線上申請。")
    if mode == "hearing":
        s.button("線上申請長照", "hearing", icon="text", name="text")
        s.button("撥打 1966", "dark", icon="phone", name="call", press=press_call)
    else:
        s.button("撥打 1966", "dark", icon="phone", name="call", press=press_call)
        if fail:
            s.gap(-8).fail("這支手機不能撥電話。請改用其他方式，或請家人幫忙。")
        s.button("線上申請長照", "hearing", icon="text", name="text")
    s.small("臺北市政府衛生局、臺北市長期照顧管理中心・官方說明（2026-11-07 查證）")
    return s


def find_page(m, mode="normal", listening=False, value="", typing=None, press=None, fail=None):
    """找服務（FindScreen.tsx）。聽不清楚模式只有打字框，沒有說話按鈕。"""
    press = press or {}
    s = ui.page(mode, m, title="找服務")
    hearing = mode == "hearing"
    s.label("想做什麼？用打的就可以" if hearing else "想做什麼？用打的或用說的")
    s.input(value, "例如：我要叫車", button="找", typing=typing, name="q", press=press.get("找"))
    if not hearing:
        if listening:
            s.button("停止說話", "help", name="mic", press=press.get("mic"))
            s.p("正在聽。說完再按一次「停止說話」。")
        else:
            s.button("開始說話", "plain", name="mic", press=press.get("mic"))
            if fail:
                s.gap(-8).fail(fail)
            s.p("按一下開始，說完再按一次停止。聲音只在手機裡辨識，不會上傳。")
    return s


BROWSE = [("看病", "health", "health"), ("交通", "ride", "ride"), ("錢與福利", "benefit", "benefit"),
          ("吃飯上課", "community", "community"), ("聽不清楚", "hearing", "text"), ("看不清楚", "dark", "eye"),
          ("求助與防詐", "dark", "phone")]


def browse_grid(s, picked=None, press=None):
    """找服務頁下方「或是用點的」：2 欄分類按鈕（min-h 72、字 20 粗體、圖示 28；選到的加粗外框）。"""
    u = s.u
    s.h2("或是用點的")
    s.gap(-8)
    w, h = (s.w - 12 * u) / 2, 72 * u
    for i, (label, key, icon) in enumerate(BROWSE):
        x = s.x0 + (i % 2) * (w + 12 * u)
        y = s.y + (i // 2) * (h + 12 * u)
        bg, fg, _ = ui.btn_colors(key)
        ic = 28 * u
        gx = x + w / 2 - (ic + 8 * u + text_width(label, 20 * u)) / 2
        parts = (R(x, y, w, h, round(16 * u, 1), bg) + app_icon(icon, gx, y + h / 2 - ic / 2, ic, fg)
                 + T(gx + ic + 8 * u, y + h / 2 + 20 * u * 0.36, label, round(20 * u, 1), fg, 700))
        if label == picked:
            parts += R(x - 4 * u, y - 4 * u, w + 8 * u, h + 8 * u, round(20 * u, 1), "none", TP["gray900"], round(5 * u, 1))
        s._emit(parts, (press or {}).get(label), label, (x + w / 2, y + h / 2))
    s.y += 4 * h + 3 * 12 * u
    return s.gap()


def qr_page(m, seed=7):
    """家人手機上的設定碼（FamilySetup.tsx 的 QrResult）。QR 是示意圖，不是真的設定碼。"""
    s = ui.Screen(m=m, top=58)
    s.h2("設定碼做好了", 32)
    s.p("用長輩的手機：用得了 →「打給家人」→「家人幫我設定」，對準這張碼。", ui.INK)
    q = 200
    s.raw(R(ui.SX + ui.SW / 2 - q / 2 - 10, s.y, q + 20, q + 20, 12, "#FFFFFF", ui.DIVIDER, 2)
          + ui.qr(ui.SX + ui.SW / 2 - q / 2, s.y + 10, q, seed=seed), q + 20)
    return s


def scan_line(st, t0, t1):
    """掃描畫面上下移動的掃描線。"""
    m = st.m
    line = f'<rect x="76" y="0" width="148" height="4" rx="2" fill="{TP["primary400"]}"/>'
    cls = m.track([(t0, "opacity:0;transform:none"), (t0 + 0.2, "opacity:1;transform:none"),
                   (t0 + 1.2, "opacity:1;transform:translateY(144px)"), (t0 + 2.2, "opacity:1;transform:none"),
                   (t1, "opacity:0;transform:none")])
    st.over.append(f'<g transform="translate(0,226)"><g{HID} class="{cls}">{line}</g></g>')


# =====================================================================
# 5.1 架構圖：資料流一段一段亮起來（沒有手機）
# =====================================================================
@story_for("architecture.svg")
def architecture(d):
    f = d.find
    user, svc, wv, pages = f("長輩・視障者・聽障者"), f("服務頁「用得了」"), f("TPWebView"), f("前端頁面 M1～M16")
    data, bridge, api = f("前端內建資料"), f("bridge.ts・elder.ts"), f("後端 Route Handlers")
    od, busdb, lis, built = f("data.taipei"), f("公運處公車資料"), f("flutterObject"), f("內建 Handler（官方）")
    hs = [f(n) for n in ("speak", "a11y_state", "haptic", "open_external", "listen", "reminder")]
    fans = [d.into(b) for b in [built] + hs]
    fan_y = fans[0][0][1]
    d.story = Story([
        Step("", [user, svc], [d.link(user, svc)], 1.5),
        Step("", [wv], [d.link(svc, wv)], 1.5),
        Step("", [pages], [d.link(wv, pages)], 1.5),
        Step("", [data, bridge, api], [d.into(data), d.into(bridge), d.into(api)], 1.7),
        Step("", [od, busdb], [d.link(api, od), d.link(api, busdb)], 1.7),
        Step("", [lis], [d.link(bridge, lis)], 1.5),
        Step("", [built] + hs, [[(lis.cx, lis.bottom), (lis.cx, fan_y)], [(built.cx, fan_y), (hs[-1].cx, fan_y)]] + fans, 2.0),
    ], band=False, pause=1.5)


# =====================================================================
# 5.2 主要流程
# =====================================================================
@story_for("flow-1-open.svg")
def flow_open(d):
    bs = [d.find(n) for n in ("台北通「我的服務」", "WebView 載入網頁", "向 App 要資料", "讀手機裡的設定", "算年齡、篩選")]
    es = [d.link(a, b) for a, b in zip(bs, bs[1:])]
    st = d.story = Story([
        Step("孫子幫阿伯在台北通「我的服務」找到「用得了」，阿伯點一下", [bs[0]], [], 3.2),
        Step("台北通打開「用得了」的網頁（載入中…）", [bs[1]], [es[0]], 2.6),
        Step("向台北通要姓名、生日、行政區，也問報讀軟體有沒有開、字多大", [bs[2]], [es[1]], 3.0),
        Step("讀手機裡的設定；第一次用先選模式：阿伯選「我看得到，也聽得到」，大字＋唸出來", [bs[3]], [es[2]], 4.0),
        Step("算出 86 歲、篩好首頁：問候「午安，金大森」、重陽禮金卡片、大按鈕", [bs[4]], [es[3]], 3.8),
    ])
    t, m = st.t, st.m
    # ① 台北通 App 的「我的服務」（原生畫面：只畫「用得了」這張卡片的字，其他服務畫成空白方塊）
    tp = t[0] + 1.4
    s = ui.Screen(m=m, top=60)
    s.text("我的服務", 22, ui.INK, 800, 30)
    card = (R(s.x0, s.y, s.w, 76, 14, TP["primary50"], TP["primary300"], 2)
            + R(s.x0 + 12, s.y + 14, 48, 48, 12, TP["primary500"]) + app_icon("smile", s.x0 + 22, s.y + 24, 28, "#FFFFFF")
            + T(s.x0 + 72, s.y + 34, "用得了", 17, ui.INK, 800) + T(s.x0 + 72, s.y + 56, "看不清楚、聽不清楚，都用得了", 11.5, ui.INK2))
    s._emit(card, tp, "yong", (s.x0 + s.w / 2, s.y + 38))
    s.y += 90
    for _ in range(3):
        for c in range(4):
            s.out.append(R(s.x0 + c * ((s.w - 30) / 4 + 10), s.y, (s.w - 30) / 4, 56, 12, TP["gray50"]))
        s.y += 66
    st.frame(0, s, "app")
    st.tap(tp, s, "yong")
    st.buzz(tp + 0.05)
    # ②③ 載入中
    s = ui.Screen(m=m, top=66)
    s.p("載入中…")
    st.frame(t[1], s, "app")
    # ④ 選模式（ModePicker.tsx）
    tp = t[3] + 1.6
    s = ui.Screen(m=m, top=54 + 24 * ui.S)
    s.h1("先選一個最適合您的方式")
    s.p("之後隨時可以換。")
    s.option("smile", "我看得到，也聽得到", "按下按鈕時會震動，並唸出名稱。", press=tp, name="normal")
    s.option("eye", "我看不清楚", "字會再放大。有開報讀軟體也可以用。")
    s.option("ear", "我聽不清楚", "不出聲音。每個電話旁邊都有「用文字」。")
    st.frame(t[3], s, "app")
    press(st, tp, s, "normal", "我看得到，也聽得到")
    # ⑤ 首頁
    st.frame(t[4], ui.home(m=m), hero=True)


@story_for("flow-2-press.svg")
def flow_press(d):
    f = d.find
    tap, hap, q, s1 = f("點按"), f("震動"), f("報讀軟體開著嗎？"), f("唸出名稱＋大字")
    conf, run, ok, fail = f("需要時先確認"), f("依服務的 action 執行"), f("完成"), f("打不開時")
    st = d.story = Story([
        Step("阿伯想問太太的長照，按首頁下方的「1966」（下面放慢來看）", [tap], [], 2.8),
        Step("手機先震一下", [hap], [d.link(tap, hap)], 2.2),
        Step("問台北通：報讀軟體有沒有開？——沒開", [q], [d.link(hap, q)], 2.4),
        Step("畫面上方出現大字「1966 長照專線」，同時唸出來", [s1], [d.link(q, s1)], 2.8),
        Step("換模式看看：看不清楚，字和大字再放大 1.3 倍、也會唸；聽不清楚，不出聲音，只震動＋大字，1999 改成「1999 文字」",
             [s1], [], 4.4),
        Step("打電話前先確認：「打給 1966 長照」", [conf], [d.link(s1, conf)], 2.8),
        Step("按「撥打 1966」，交給手機撥號（phone_call）", [run], [d.link(conf, run)], 2.8),
        Step("撥通了，阿伯和 1966 講電話", [ok], [d.link(run, ok)], 2.2),
        Step("打不開時：訊息留在按鈕下方，不會自己消失；聽不清楚模式把「線上申請長照」排在撥號前面", [fail], [d.link(run, fail)], 4.6),
    ])
    t, m = st.t, st.m
    tp = t[0] + 1.2
    s = ui.home(m=m, press={"1966": tp})
    st.frame(0, s)
    st.tap(tp, s, "1966")
    st.buzz(t[1] + 0.3)
    st.buzz(t[1] + 1.3)
    st.toast(t[3] + 0.2, "1966 長照專線", dur=2.4)
    # ⑤ 另外兩種模式按同一顆按鈕
    half = st.steps[4].dur / 2
    st.frame(t[4], ui.home("vision", m), "vision")
    st.buzz(t[4] + 0.1)
    st.toast(t[4] + 0.15, "1966 長照專線", "vision", dur=half - 0.2)
    st.frame(t[4] + half, ui.home("hearing", m), "hearing")
    st.buzz(t[4] + half + 0.1)
    st.toast(t[4] + half + 0.15, "1966 長照專線", "hearing", dur=half - 0.3)
    # ⑥⑦ 確認頁 → 撥打
    tp = t[6] + 1.0
    s = call_confirm(m, press_call=tp)
    st.frame(t[5], s)
    press(st, tp, s, "call", "撥打 1966")
    # ⑧ 撥通：之後是手機自己的撥號畫面，這裡不畫，只把網頁調暗、標出通話中
    st.overlay(f'<rect x="12" y="12" width="276" height="576" rx="36" fill="{TP["gray900"]}" fill-opacity=".55"/>'
               + R(70, 250, 160, 100, 20, "#FFFFFF") + app_icon("phone", 132, 266, 36, ui.ELDER["benefit"][0])
               + T(150, 330, "通話中", 18, ui.INK, 800, "middle"), [(t[7] + 0.2, t[8])])
    # ⑨ 打不開
    st.frame(t[8], call_confirm(m, fail=True))
    st.frame(t[8] + 2.4, call_confirm(m, "hearing"), "hearing")


@story_for("flow-3-find.svg")
def flow_find(d):
    f = d.find
    t1, t2, t3, lis, err = f("打字"), f("點一下開始說話"), f("點分類"), f("listen"), f("手機不支援離線辨識")
    norm, top3, none, cat = f("正規化、比對"), f("「你是說：…？」"), f("都對不上"), f("該分類的服務清單")
    ln = next(p for p in d.paths if _on(p[0], lis) and not _on(p[-1], err))
    st = d.story = Story([
        Step("阿伯想問敬老卡：按「說話或打字找服務」，再按「開始說話」（只震動、不出聲，免得錄到）", [t2], [], 4.0),
        Step("說「敬老卡」，再按「停止說話」；聲音只在手機裡辨識，不上傳", [lis], [d.link(t2, lis)], 3.6),
        Step("手機聽成「敬老咖」也沒關係：和每項服務的長輩說法比對", [norm], [ln + [norm.side("l")]], 2.6),
        Step("「你是說：「敬老咖」？」列出敬老卡、重陽禮金，大字＋唸出「找到 2 個」", [top3], [d.link(norm, top3)], 3.2),
        Step("聽不清楚模式只有打字框：一個字一個字打「釣魚」，按「找」", [t1], [d.link(t1, norm)], 3.6),
        Step("都對不上：請他換個說法；聽不清楚模式給「文字聯絡」（一般模式是打 1999），不出聲音", [none], [d.into(none)], 3.4),
        Step("手機不能在手機裡辨識時：訊息留在按鈕下方，請改用打字或點選", [err], [d.link(lis, err)], 3.0),
        Step("也可以用點的：按「交通」，有 5 項服務", [t3, cat], [d.link(t3, cat)], 3.6),
    ])
    t, m = st.t, st.m
    # ① 首頁 → 找服務 → 開始說話
    tp = t[0] + 0.9
    s = ui.home(m=m, press={"find": tp}).scroll(300)
    st.frame(0, s)
    press(st, tp, s, "find", "說話或打字找服務")
    tp2 = t[0] + 2.9
    s = find_page(m, press={"mic": tp2})
    st.frame(tp + 0.6, s)
    st.tap(tp2, s, "mic")
    st.buzz(tp2 + 0.05)
    # ② 收音中（聲波）→ 停止
    tp3 = t[1] + 2.5
    s = find_page(m, listening=True, press={"mic": tp3})
    st.frame(tp2 + 0.4, s)
    mx, my = s.at["mic"]
    st.overlay(ui.bars(mx + 66, my), [(tp2 + 0.4, tp3 + 0.1)])
    st.tap(tp3, s, "mic")
    st.buzz(tp3 + 0.05)
    st.frame(tp3 + 0.4, find_page(m, value="敬老咖"))
    # ④ 結果
    s = ui.page(m=m, title="找服務")
    s.h2("你是說：「敬老咖」？")
    s.service("benefit", "敬老卡", "每月 600 點，當月第一次刷卡時自動寫入，不用去區公所。可以搭車、看聯醫門診、去運動中心。"
              "還沒有卡的人，要到區公所臨櫃申辦。", [("看怎麼申辦", "link"), ("打 1999 問", "phone")])
    st.frame(t[3], s)
    st.toast(t[3] + 0.3, "找到 2 個：敬老卡、重陽禮金", dur=2.4)
    # ⑤ 聽不清楚：打字
    tp = t[4] + 2.6
    s = find_page(m, "hearing", value="釣魚", typing=(t[4] + 0.6, t[4] + 1.6), press={"找": tp})
    st.frame(t[4], s, "hearing")
    st.tap(tp, s, "q-btn")
    st.buzz(tp + 0.05)
    # ⑥ 都對不上
    s = ui.page("hearing", m, title="找服務")
    s.h2("找不到「釣魚」")
    s.gap(-8).p("可以換個說法，或直接問市政府。")
    s.service("text", "文字聯絡", "聽不清楚或不方便講電話時，用文字或手語聯絡市政府。", [("打開「文字聯絡」", "page")],
              owner="臺北市政府研考會、社會局・官方說明（2026-11-07 查證）")
    st.frame(t[5], s, "hearing")
    st.toast(t[5] + 0.3, "找不到。可以換個說法，或問 1999。", "hearing", dur=2.4)
    # ⑦ 不支援離線辨識
    tp = t[6] + 0.8
    s = find_page(m, press={"mic": tp})
    st.frame(t[6], s)
    st.tap(tp, s, "mic")
    st.buzz(tp + 0.05)
    st.frame(tp + 0.4, find_page(m, fail="這支手機不能在手機裡直接聽懂說話。請改用打字或點選。"))
    # ⑧ 用點的
    tp = t[7] + 1.0
    s = find_page(m)
    browse_grid(s, press={"交通": tp})
    st.frame(t[7], s.scroll(300))
    st.tap(tp, s, "交通")
    st.buzz(tp + 0.05)
    s = find_page(m)
    browse_grid(s, picked="交通")
    s.service("ride", "我要叫車", "問您兩個問題，幫您找復康巴士、長照交通接送或敬老計程車。", [("打開「我要叫車」", "page")])
    st.frame(tp + 0.4, s.scroll(420))
    st.toast(tp + 0.5, "交通，有 5 項服務", dur=1.8)


@story_for("flow-5-family.svg")
def flow_family(d):
    f = d.find
    f1, f2, f3 = f("「用得了」→「我是家人」"), f("勾首頁按鈕・填家人電話與行政區"), f("產生 QR code")
    e1, e2, e3 = f("「家人幫我設定」"), f("qr_code_scan 掃描"), f("存在手機裡")
    st = d.story = Story([
        Step("週末，女兒在自己的手機打開「用得了」，按「我是家人，幫長輩設定」", [f1], [], 3.4),
        Step("勾首頁按鈕，稱呼一個字一個字打「大女兒」、填電話，選中山區", [f2], [d.link(f1, f2)], 4.2),
        Step("按「產生設定碼」：設定內容都編在 QR code 裡，不上傳", [f3], [d.link(f2, f3)], 3.8),
        Step("阿伯按首頁的「打給家人」，再按「家人幫我設定」", [e1], [], 4.0),
        Step("對準女兒手機上的設定碼掃一下，檢查格式與版本", [e2], [d.link(f3, e2), d.link(e1, e2)], 3.2),
        Step("存在阿伯的手機裡：整頁「設定好了」，大字＋唸出來", [e3], [d.link(e2, e3)], 3.8),
    ])
    t, m = st.t, st.m
    # ① 家人的手機：首頁往下捲到「我是家人，幫長輩設定」
    tp = t[0] + 1.0
    s = ui.home(m=m, gift=False, name="", press={"family-setup": tp}).scroll(250)
    st.frame(0, s, "family")
    press(st, tp, s, "family-setup", "我是家人，幫長輩設定")
    s = ui.page(m=m, title="幫長輩設定")
    s.p("選好後會出現一張設定碼，用長輩的手機掃一下就完成。設定只放在設定碼裡，不會上傳。")
    s.h2("1. 長輩首頁的按鈕（4～6 個）")
    s.gap(-12).p("已選 6 個。少一點，長輩比較好找。")
    for label, _ in ui.HOME:
        s.check(label + ("（一定要有，長輩才打得到您）" if label == "打給家人" else ""))
    st.frame(tp + 0.55, s, "family")
    # ② 稱呼、電話、行政區（一個字一個字打出來）
    s = ui.Screen(m=m, top=58)
    s.h2("2. 家人的電話（1～3 位）")
    s.text("第 1 位", 20, ui.INK, 700)
    s.label("長輩怎麼叫您（最多 10 個字）")
    s.input("大女兒", "例如：大兒子", typing=(t[1] + 0.5, t[1] + 1.4))
    s.label("電話")
    s.input("0912345678", "例如：0912345678", typing=(t[1] + 1.7, t[1] + 3.0))
    s.gap(12).h2("3. 長輩住哪一區")
    s.input("臺北市中山區")
    st.frame(t[1], s, "family")
    # ③ 產生設定碼 → QR
    tp = t[2] + 0.8
    s = ui.Screen(m=m, top=58)
    s.h2("4. 長輩常坐的公車（可以不設）")
    s.p("設好後，長輩的首頁會顯示「還有幾分鐘到」。最多 2 組，臺北市、新北市的公車都可以。")
    s.input("", "路線，例如 307", button="找路線")
    s.gap(16).button("產生設定碼", "dark", name="gen", press=tp)
    st.frame(t[2], s, "family")
    press(st, tp, s, "gen", "產生設定碼")
    st.frame(tp + 0.6, qr_page(m), "family")
    st.toast(tp + 0.8, "設定碼做好了，請用長輩的手機掃描", dur=2.0)
    # ④ 長輩的手機：首頁「打給家人」→ 家人頁（往下捲到「掃家人的設定碼」）
    tp = t[3] + 0.9
    s = ui.home(m=m, press={"family": tp}).scroll(200)
    st.frame(t[3], s)
    press(st, tp, s, "family", "打給家人")
    tp2 = t[3] + 2.9
    s = ui.Screen(m=m, top=58)
    s.h2("掃家人的設定碼")
    s.button("家人幫我設定", "plain", icon="family", name="scan", press=tp2, center=False)
    s.p("設定只存在這支手機，不會上傳。")
    st.frame(tp + 0.6, s)
    press(st, tp2, s, "scan", "家人幫我設定")
    # ⑤ 掃描（原生畫面，網頁上沒有字）
    st.frame(t[4], ui.camera(), hero=True)
    scan_line(st, t[4], t[4] + 2.9)
    # ⑥ 設定好了
    s = ui.page(m=m, title="設定好了")
    s.card(border=ui.ELDER["family"][0], gap=12)
    u = s.u
    s.out.append(f'<circle cx="{s.x0 + 32 * u:.1f}" cy="{s.y + 32 * u:.1f}" r="{30 * u:.1f}" fill="{ui.ELDER["family"][0]}"/>'
                 f'<path d="M{s.x0 + 18 * u:.1f} {s.y + 33 * u:.1f}l{10 * u:.1f} {10 * u:.1f} {20 * u:.1f}-{22 * u:.1f}" fill="none" '
                 f'stroke="#FFFFFF" stroke-width="{5 * u:.1f}" stroke-linecap="round" stroke-linejoin="round"/>')
    s.lines(s.x0 + 78 * u, s.y + 14 * u, ["家人幫您設定好了"], 28, ui.INK, 700, 36)
    s.y += 64 * u
    s.gap()
    s.end()
    for title, value in [("首頁的按鈕", "看醫生、叫車、我的權益、吃飯上課、打給家人、文字聯絡"),
                         ("家人的電話", "大女兒 0912 345 678"), ("住的地方", "中山區")]:
        s.card(border=ui.BGDARK, bw=0, fill=ui.BGDARK, gap=4)
        s.text(title, 20, ui.INK2)
        s.text(value, 20, ui.INK, 700)
        s.end()
    s.gap(-8).button("回首頁看看", "family", icon="home", center=False)
    st.frame(t[5], s)
    st.toast(t[5] + 0.3, "設定好了。家人幫您設定的內容在畫面上", dur=2.4)


# =====================================================================
# M5 叫車分流
# =====================================================================
@story_for("m5-ride.svg")
def ride(d):
    f = d.find
    q1, q2 = f("有身心障礙證明嗎？"), f("家裡申請過長照，")
    r2, r4 = f("長照交通接送", 0), f("先問 1966，也先列出敬老計程車")
    cb1, cb2, cb3 = f("長照交通接送", 1), f("敬老愛心計程車", 1), f("打給家人")
    to_r4 = d.link(q2, r2)[:2] + d.into(r4)[1:]
    st = d.story = Story([
        Step("阿伯腳不方便，以為能叫復康巴士。按「叫車」，第一句就說：只限有身障證明的人搭", [q1], [], 3.8),
        Step("第 1 題「您有身心障礙證明嗎？」他按「沒有」", [q2], [d.link(q1, q2)], 3.0),
        Step("第 2 題「長照 2 級以上嗎？」按「不知道」：先打 1966 問長照等級", [r4], [to_r4], 3.6),
        Step("今天就要出門：下面也列出敬老計程車，按「撥 55850」", [r4], [], 3.4),
        Step("先到確認頁「打給 敬老計程車」，再按「撥打 55850」才撥出", [r4], [], 3.2),
        Step("訂不到車怎麼辦？照順序試，最後一步是打給家人", [cb3], [d.link(cb2, cb3)], 3.4),
        Step("聽不清楚模式：1966 的「線上申請長照」排前面；敬老計程車只能用講的，另外給「手語視訊轉譯」",
             [cb2], [d.link(cb1, cb2)], 4.2),
    ])
    t, m = st.t, st.m

    def ride_page(mode="normal"):
        s = ui.page(mode, m, title="叫車")
        s.p("復康巴士只限有身障證明的人搭。", ui.INK, bold=True)
        s.gap(-8).p("回答一、兩個問題，幫您找適合的車。")
        return s

    def result(mode="normal", press_taxi=None):
        hearing = mode == "hearing"
        s = ride_page(mode)
        s.h2("先打 1966 問長照等級")
        s.gap(-8).p("長照 2 級以上可以用長照交通接送。今天就要出門，可以先搭敬老計程車。", ui.INK)
        s.service("health", "1966 長照", "申請長期照顧：居家照顧、交通接送、輔具、喘息服務。也可以線上申請。",
                  [("線上申請長照", "link"), ("撥 1966", "phone")] if hearing else [("撥 1966", "phone"), ("線上申請長照", "link")])
        s.service("ride", "敬老計程車", "有敬老卡的長輩，每趟最多扣 85 點。手機直接撥 55850。", [("撥 55850", "phone")],
                  owner="臺北市政府交通局公共運輸處・官方說明（2026-11-07 查證）",
                  note="這項服務目前只能用講的。可以請家人代打，或改用文字問 1999。" if hearing else None,
                  press={"撥 55850": press_taxi} if press_taxi else None)
        if hearing:
            s.service("text", "手語視訊轉譯", "透過手語視訊，請翻譯員幫您打電話，例如訂餐、叫車、問診所。", [("開啟手語視訊", "link")])
        return s

    # ① 首頁 → 叫車 → 第 1 題
    tp = t[0] + 0.9
    s = ui.home(m=m, press={"ride": tp})
    st.frame(0, s)
    press(st, tp, s, "ride", "叫車")
    tp2 = t[1] + 0.9
    s = ride_page()
    s.h2("您有身心障礙證明嗎？")
    s.gap(-8).p("第 1 題。就是身心障礙手冊或證明。", ui.INK)
    for a in ("有", "沒有", "不知道"):
        s.gap(-6).button(a, "ride", name=a, press=tp2 if a == "沒有" else None)
    st.frame(tp + 0.55, s)
    press(st, tp2, s, "沒有", "沒有")
    # ② 第 2 題
    tp = t[2] + 0.9
    s = ride_page()
    s.h2("家裡有沒有申請過長照，等級 2 級以上？")
    s.gap(-8).p("第 2 題。照管專員到家裡評估過，會告訴您長照等級。", ui.INK)
    for a in ("是", "不是", "不知道"):
        s.gap(-6).button(a, "ride", name=a, press=tp if a == "不知道" else None)
    st.frame(tp2 + 0.5, s.scroll(40))
    press(st, tp, s, "不知道", "不知道")
    # ③ 結果
    st.frame(tp + 0.5, result().scroll(60), hero=True)
    # ④ 往下捲到敬老計程車
    tp = t[3] + 1.6
    s = result(press_taxi=tp).scroll(560)
    st.frame(t[3] + 0.2, s)
    press(st, tp, s, "撥 55850", "撥 55850")
    # ⑤ 確認頁
    tp2 = t[4] + 1.2
    s = ui.page(m=m, title="打給 敬老計程車")
    s.p("有敬老卡的長輩，每趟最多扣 85 點。手機直接撥 55850。")
    s.button("撥打 55850", "dark", icon="phone", name="call", press=tp2)
    s.small("臺北市政府交通局公共運輸處・官方說明（2026-11-07 查證）")
    st.frame(t[4], s)
    press(st, tp2, s, "call", "撥打 55850")
    # ⑥ 訂不到車怎麼辦？
    s = result()
    top = s.y
    s.h2("訂不到車怎麼辦？")
    s.gap(-8).p("照順序試試看：", ui.INK)
    s.p("叫不到車的話，打給家人，請家人來接您或幫您叫車。", ui.INK)
    s.service("family", "打給家人", "打電話給家人。家人可以幫您設定這裡的按鈕。", [("打開「打給家人」", "page")])
    st.frame(t[5], s.scroll(top - 60))
    # ⑦ 聽不清楚模式
    st.frame(t[6], result("hearing").scroll(300), "hearing")
    st.frame(t[6] + 2.1, result("hearing").scroll(760), "hearing")


# =====================================================================
def main() -> None:
    import build_diagrams as bd
    install(vars(bd))
    for name in ("architecture", "ride", "subsidy", "flow_open", "flow_press", "flow_find", "flow_places",
                 "flow_family", "flow_benefit", "flow_followup", "flow_bus", "flow_walk"):
        getattr(bd, name)()


if __name__ == "__main__":
    main()
