"""產生 README 用的視覺素材（SVG）：開頭動畫橫幅、按鈕、徽章、數字卡片、三種模式示意圖。

只用 Python 標準函式庫。色票取自城市通 UI Kit（tp_colors.dart）與本服務的首頁按鈕色票（src/app/globals.css）。
圖的內容要改時，改這支程式再重跑：

    python3 docs/readme/build_readme_art.py

- GitHub 會濾掉 README 裡的 <style>／<script>，所以動畫只寫在 SVG 檔案裡（CSS keyframes）。
- 素材都存在 repo 裡，不依賴外部產圖服務（Demo 當天外部服務可能掛掉）。
- 每張有深淺兩個版本，README 用 <picture> 依 GitHub 主題切換；按鈕和徽章是實心底色，只有一個版本。
- 系統設定「減少動態效果」時停止動畫，停在第一個模式的畫面（三種模式圖則是三張首頁並排）。
- 三種模式圖的手機畫面用 docs/diagrams/phone_kit.py（和流程圖的情境手機共用），照 HomeScreen.tsx 畫。
- 以 <img> 載入的 SVG 讀不到網路字型，中文用系統字（PingFang TC／Noto Sans TC／微軟正黑體）。
"""

from __future__ import annotations

import os
import sys
from html import escape

sys.dont_write_bytecode = True  # 三種模式圖會載入 docs/diagrams/phone_kit.py，不要留下 __pycache__

OUT = os.path.dirname(os.path.abspath(__file__))
FONT = "'PingFang TC','Noto Sans TC','Microsoft JhengHei',system-ui,sans-serif"

# ---- 城市通 UI Kit 色票 ----
TP = {
    "primary50": "#EDF8FA", "primary100": "#DBF1F5", "primary200": "#B4E2EA", "primary300": "#93D4DF",
    "primary400": "#71C5D5", "primary500": "#5AB4C5", "primary600": "#468D9B", "primary700": "#356C77",
    "primary800": "#22474E", "primary900": "#112629", "primary950": "#081315",
    "secondary100": "#FCF2DF", "secondary300": "#F4D69E", "secondary500": "#F5BA4B",
    "secondary600": "#E7A43C", "secondary700": "#AD7B2B", "secondary900": "#3C2B0B",
    "gray50": "#F1F3F4", "gray100": "#E3E7E9", "gray200": "#CAD1D5", "gray300": "#ADB8BE",
    "gray400": "#91A0A8", "gray500": "#738995", "gray600": "#5E6D76", "gray700": "#475259",
    "gray800": "#30383D", "gray900": "#171B1D",
    "orange500": "#FD853A", "white": "#FFFFFF",
}

# ---- 首頁按鈕色票（src/app/globals.css 的 --color-elder-*） ----
ELDER = {
    "health": ("#0e7090", "#ffffff"), "ride": ("#fec84b", "#1d2939"), "benefit": ("#17b26a", "#1d2939"),
    "community": ("#22ccee", "#1d2939"), "family": ("#7a2e0e", "#ffffff"), "hearing": ("#6927da", "#ffffff"),
    "help": ("#d92d20", "#ffffff"),
}
# 首頁預設的 6 顆按鈕（src/lib/elder/home.ts 的 HOME_BUTTONS）
HOME = [("看醫生", "health"), ("叫車", "ride"), ("我的權益", "benefit"),
        ("吃飯上課", "community"), ("打給家人", "family"), ("文字聯絡", "hearing")]
MODE_NAME = {"normal": "都還好", "vision": "看不清楚", "hearing": "聽不清楚"}
MODE_ICON = {"normal": "smile", "vision": "eye", "hearing": "ear"}
MODES = ("normal", "vision", "hearing")

THEMES = {
    "light": dict(
        bg0="#FFFFFF", bg1=TP["primary50"], frame=TP["primary100"],
        blob_a=TP["primary100"], blob_b=TP["secondary100"], blob_b_op=".9",
        ink=TP["gray800"], ink2=TP["gray700"], accent=TP["primary700"], wave=TP["primary500"],
        mark=TP["secondary300"], ring=TP["primary300"], skyline=TP["primary200"], skyline_op=".45",
        chip_bg="#FFFFFF", chip_line=TP["primary200"], chip_ink=TP["primary700"],
        chip_on_bg=TP["primary700"], chip_on_ink="#FFFFFF",
        bubble_bg="#FFFFFF", bubble_line=TP["primary200"], bubble_ink=TP["gray800"], bubble_sub=TP["gray600"],
        card_bg="#FFFFFF", card_line=TP["gray100"], track=TP["gray100"], muted=TP["gray500"],
        num=TP["primary700"], shadow=TP["primary800"], window=None,
    ),
    "dark": dict(
        bg0=TP["primary950"], bg1=TP["primary900"], frame=TP["primary800"],
        blob_a=TP["primary800"], blob_b=TP["secondary900"], blob_b_op=".5",
        ink="#FFFFFF", ink2=TP["gray100"], accent=TP["primary300"], wave=TP["primary400"],
        mark=TP["secondary700"], ring=TP["primary700"], skyline=TP["primary800"], skyline_op=".9",
        chip_bg=TP["primary900"], chip_line=TP["primary700"], chip_ink=TP["primary200"],
        chip_on_bg=TP["secondary500"], chip_on_ink=TP["gray900"],
        bubble_bg=TP["primary900"], bubble_line=TP["primary700"], bubble_ink="#FFFFFF", bubble_sub=TP["primary200"],
        card_bg=TP["primary900"], card_line=TP["primary800"], track=TP["primary800"], muted=TP["gray400"],
        num=TP["primary300"], shadow="#000000", window=TP["secondary500"],
    ),
}

REDUCED = "@media (prefers-reduced-motion: reduce){*{animation:none!important}}"


def text_width(s: str, size: float) -> float:
    w = 0.0
    for ch in s:
        if ord(ch) > 0x2E80:  # 中日韓與全形符號
            w += size
        elif ch == " ":
            w += size * 0.3
        elif ch in "il.,:;|'!()[]{}/":
            w += size * 0.34
        elif ch.isupper() or ch in "mwMW@_":
            w += size * 0.68
        else:
            w += size * 0.56
    return w


def T(x, y, s, size, fill, weight=400, anchor="start", cls="", extra=""):
    c = f' class="{cls}"' if cls else ""
    a = f' text-anchor="{anchor}"' if anchor != "start" else ""
    return (f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" font-weight="{weight}" fill="{fill}"'
            f'{a}{c}{extra}>{escape(s)}</text>')


def R(x, y, w, h, rx, fill, stroke=None, sw=2, cls="", extra=""):
    s = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ""
    c = f' class="{cls}"' if cls else ""
    return f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{rx}" fill="{fill}"{s}{c}{extra}/>'


# ---- 圖示（24×24，線條） ----
def icon(name: str, x: float, y: float, size: float, color: str) -> str:
    body = {
        "speaker": f'<path d="M3.5 9h4l5-4v14l-5-4h-4z" fill="{color}" stroke-linejoin="round"/>'
                   '<path d="M16 8.5a5 5 0 0 1 0 7M19 5.5a9 9 0 0 1 0 13"/>',
        "muted": f'<path d="M3.5 9h4l5-4v14l-5-4h-4z" fill="{color}" stroke-linejoin="round"/>'
                 '<path d="M16.5 9.5l5 5M21.5 9.5l-5 5"/>',
        "mic": '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6"/>',
        "keyboard": '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/>'
                    '<path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M8 14.5h8"/>',
        "smile": '<circle cx="12" cy="12" r="9.5"/><path d="M8 14.5a5 5 0 0 0 8 0M9 9.5h.01M15 9.5h.01"/>',
        "eye": '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
        "ear": '<path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 3.2-3.2 4.1-3.7 6.9-.4 2.2-1.9 3.6-3.9 3.6a3 3 0 0 1-3-3"/>'
               '<path d="M9.5 10a2.5 2.5 0 0 1 5 0c0 1.3-1 1.9-1.8 2.6"/>',
        "play": f'<path d="M8 5v14l11-7z" fill="{color}" stroke-linejoin="round"/>',
        "timer": '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5M10 2.5h4M18.3 6.7l1.6-1.6"/>',
        "doc": '<path d="M6 2.5h8l4.5 4.5v14.5H6z" stroke-linejoin="round"/><path d="M14 2.5V7h4.5M9 12h6.5M9 16h6.5"/>',
        "phone": '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18h2"/>',
    }[name]
    s = size / 24
    return (f'<g transform="translate({x:.1f},{y:.1f}) scale({s:.4f})" fill="none" stroke="{color}" '
            f'stroke-width="2.2" stroke-linecap="round">{body}</g>')


def svg(w, h, label, body, style="", defs=""):
    st = f"<style>{style}</style>" if style else ""
    df = f"<defs>{defs}</defs>" if defs else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" '
            f'font-family="{FONT}" role="img" aria-label="{escape(label)}"><title>{escape(label)}</title>'
            f'{st}{df}{body}</svg>\n')


def write(name: str, content: str) -> None:
    with open(os.path.join(OUT, name), "w", encoding="utf-8", newline="\n") as f:
        f.write(content)
    print("wrote", name, f"{len(content.encode()) / 1024:.1f} KB")


# ---- 手機（區域座標 300×600） ----
def phone_screen(mode: str) -> str:
    """首頁畫面：問候、6 顆大按鈕、找服務、換模式、底部固定的 1999／1966／求助。"""
    k = 1.3 if mode == "vision" else 1.0  # 看不清楚：字至少放大 1.3 倍
    g = TP
    out = [R(12, 12, 276, 576, 36, "#FFFFFF")]
    out.append(T(30, 94, "午安", round(28 * k), g["gray800"], 700))
    for i, (label, key) in enumerate(HOME):
        col, row = i % 2, i // 2
        x, y = 28 + col * 127, 116 + row * 82
        bg, fg = ELDER[key]
        size = round(21 * k)
        out.append(R(x, y, 117, 72, 14, bg))
        out.append(T(x + 58.5, y + 36 + size * 0.36, label, size, fg, 700, "middle"))
    # 找服務
    hearing = mode == "hearing"
    out.append(R(28, 364, 244, 50, 14, "#FFFFFF", g["gray200"], 2))
    out.append(icon("keyboard" if hearing else "mic", 40, 377, 24, g["primary700"]))
    size = round(17 * k)
    out.append(T(72, 389 + size * 0.36, "打字找服務" if hearing else "說話或打字找服務", size, g["gray800"], 700))
    # 換模式
    size = round(16 * k)
    out.append(R(28, 424, 244, 44, 12, g["gray50"]))
    out.append(T(150, 446 + size * 0.36, f"換模式：{MODE_NAME[mode]}", size, g["gray700"], 700, "middle"))
    # 底部固定列
    out.append(f'<path d="M12 488H288" stroke="{g["gray100"]}" stroke-width="2"/>')
    bottom = [("1999 文字" if hearing else "1999", g["gray800"], "#FFFFFF"),
              ("1966", g["gray800"], "#FFFFFF"), ("求助",) + ELDER["help"]]
    for i, (label, bg, fg) in enumerate(bottom):
        x = 28 + i * 84
        size = 15 if label == "1999 文字" else round(20 * k)
        out.append(R(x, 500, 76, 60, 14, bg))
        out.append(T(x + 38, 530 + size * 0.36, label, size, fg, 700, "middle"))
    out.append(R(100, 572, 100, 5, 2.5, g["gray300"]))
    return "".join(out)


def phone_toast(mode: str) -> str:
    """按下「看醫生」：大字（三種模式都有），螢幕變暗凸顯大字卡。"""
    k = 1.3 if mode == "vision" else 1.0
    size = round(50 * k)
    return (R(12, 12, 276, 576, 36, "#000000", extra=' fill-opacity=".45"')
            + R(34, 226, 232, 136, 22, "#FFFFFF")
            + T(150, 294 + size * 0.36, "看醫生", size, ELDER["health"][0], 800, "middle"))


def phone_frame_open() -> str:
    return (R(0, 0, 300, 600, 46, TP["gray900"], TP["gray700"], 2)
            + R(-3, 130, 4, 56, 2, TP["gray700"]) + R(299, 160, 4, 84, 2, TP["gray700"]))


def phone_island() -> str:
    return R(118, 24, 64, 20, 10, TP["gray900"])


def buzz_marks(color: str) -> str:
    def zig(x0, dx):
        pts = " ".join(f"{x0 + (dx if i % 2 else 0)},{250 + i * 12}" for i in range(8))
        return f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'
    return zig(-14, -10) + zig(-30, -10) + zig(314, 10) + zig(330, 10)


# ---- 開頭橫幅 ----
def skyline(th) -> str:
    """底部城市天際線（含臺北 101 的剪影），深色版有會閃的窗。"""
    W, H = 1280, 560
    heights = [46, 70, 38, 92, 58, 34, 80, 52, 104, 44, 66, 30, 88, 50, 72, 40, 96, 54, 36, 78,
               48, 62, 34, 86, 42, 70, 56, 30, 64, 46, 90, 38]
    out, x, i = [], 0, 0
    widths = [44, 36, 52, 40, 30, 48, 38, 56, 34, 46]
    while x < W:
        w = widths[i % len(widths)]
        h = heights[i % len(heights)]
        out.append(f'<rect x="{x}" y="{H - h}" width="{w - 4}" height="{h}"/>')
        x += w
        i += 1
    # 臺北 101：基座、八節斗、上段、塔尖
    cx, base = 790, H
    p = [f"M{cx - 34} {base}V{base - 52}H{cx + 34}V{base}Z"]
    y = base - 52
    for _ in range(8):
        p.append(f"M{cx - 22} {y}L{cx - 28} {y - 22}H{cx + 28}L{cx + 22} {y}Z")
        y -= 22
    p.append(f"M{cx - 16} {y}V{y - 26}H{cx + 16}V{y}Z")
    y -= 26
    p.append(f"M{cx - 8} {y}V{y - 16}H{cx + 8}V{y}Z")
    y -= 16
    p.append(f"M{cx - 2} {y}V{y - 44}H{cx + 2}V{y}Z")
    out.append(f'<path d="{"".join(p)}"/>')
    sky = f'<g fill="{th["skyline"]}" opacity="{th["skyline_op"]}">{"".join(out)}</g>'
    if th["window"]:
        wins = []
        spots = [(18, 532), (130, 516), (226, 540), (330, 520), (420, 528), (520, 536), (610, 506),
                 (684, 540), (780, 470), (796, 404), (780, 338), (880, 522), (1230, 530), (1180, 510)]
        for j, (wx, wy) in enumerate(spots):
            wins.append(R(wx, wy, 5, 7, 1, th["window"], cls="tw", extra=f' style="animation-delay:-{j * 0.7:.1f}s"'))
        sky += "".join(wins)
    return sky


def banner(theme: str) -> str:
    th = THEMES[theme]
    W, H = 1280, 560
    PX, PY, PS = 942, 22, 0.86  # 手機位置與縮放
    css = f"""
.ch{{animation:rise .9s cubic-bezier(.2,.8,.2,1) both}}.ch1{{animation-delay:.1s}}.ch2{{animation-delay:.22s}}
@keyframes rise{{from{{opacity:0;transform:translateY(30px)}}to{{opacity:1;transform:none}}}}
.mark{{transform-box:fill-box;transform-origin:left center;animation:mark .9s .5s cubic-bezier(.2,.8,.2,1) both}}
@keyframes mark{{from{{transform:scaleX(0)}}to{{transform:scaleX(1)}}}}
.up{{animation:up .8s cubic-bezier(.2,.8,.2,1) both}}.d1{{animation-delay:.65s}}.d2{{animation-delay:.8s}}.d3{{animation-delay:.95s}}.d4{{animation-delay:0s}}
@keyframes up{{from{{opacity:0;transform:translateY(16px)}}to{{opacity:1;transform:none}}}}
.w{{transform-box:fill-box;transform-origin:center;animation:wave 1.1s ease-in-out infinite}}
@keyframes wave{{0%,100%{{transform:scaleY(.35)}}50%{{transform:scaleY(1)}}}}
.m1{{animation:m1 9s infinite}}.m2{{opacity:0;animation:m2 9s infinite}}.m3{{opacity:0;animation:m3 9s infinite}}
@keyframes m1{{0%,30%{{opacity:1}}33.33%,96.67%{{opacity:0}}100%{{opacity:1}}}}
@keyframes m2{{0%,30%{{opacity:0}}33.33%,63.33%{{opacity:1}}66.67%,100%{{opacity:0}}}}
@keyframes m3{{0%,63.33%{{opacity:0}}66.67%,96.67%{{opacity:1}}100%{{opacity:0}}}}
.rip{{opacity:0;transform-box:fill-box;transform-origin:center;animation:rip 3s infinite}}
@keyframes rip{{0%,12%{{opacity:0;transform:scale(.2)}}14%{{opacity:.8}}34%,100%{{opacity:0;transform:scale(1.9)}}}}
.toast{{opacity:0;animation:toast 3s infinite}}
@keyframes toast{{0%,22%{{opacity:0}}28%,82%{{opacity:1}}88%,100%{{opacity:0}}}}
.pop{{animation:pop 3s infinite}}
@keyframes pop{{0%,22%{{opacity:0;transform:translateY(10px)}}30%,82%{{opacity:1;transform:none}}90%,100%{{opacity:0;transform:none}}}}
.buzz{{animation:buzz 3s infinite}}
@keyframes buzz{{0%,14%{{opacity:0;transform:none}}16%{{opacity:1;transform:translateX(-4px)}}19%{{transform:translateX(4px)}}22%{{transform:translateX(-4px)}}25%{{transform:translateX(4px)}}28%{{transform:translateX(-3px)}}31%{{transform:translateX(3px)}}36%{{opacity:1;transform:none}}46%,100%{{opacity:0;transform:none}}}}
.ring{{opacity:.25;transform-box:fill-box;transform-origin:center;animation:ring 6s linear infinite}}
@keyframes ring{{0%{{opacity:0;transform:scale(.45)}}15%{{opacity:.8}}100%{{opacity:0;transform:scale(1.15)}}}}
.fl{{animation:fl 14s ease-in-out infinite alternate}}
@keyframes fl{{from{{transform:none}}to{{transform:translate(-26px,20px)}}}}
.tw{{animation:tw 3.2s ease-in-out infinite}}
@keyframes tw{{0%,100%{{opacity:.15}}50%{{opacity:.95}}}}
{REDUCED}"""
    defs = (f'<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{th["bg0"]}"/>'
            f'<stop offset="1" stop-color="{th["bg1"]}"/></linearGradient>'
            f'<clipPath id="card"><rect width="{W}" height="{H}" rx="28"/></clipPath>'
            f'<filter id="sh" x="-30%" y="-20%" width="160%" height="150%"><feDropShadow dx="0" dy="22" '
            f'stdDeviation="22" flood-color="{th["shadow"]}" flood-opacity=".28"/></filter>')
    b = [f'<g clip-path="url(#card)">', f'<rect width="{W}" height="{H}" fill="url(#bg)"/>',
         f'<g class="fl"><circle cx="1190" cy="40" r="270" fill="{th["blob_a"]}" opacity=".9"/></g>',
         f'<g class="fl" style="animation-delay:-7s"><circle cx="30" cy="590" r="230" fill="{th["blob_b"]}" opacity="{th["blob_b_op"]}"/></g>']
    cx, cy = PX + 150 * PS, PY + 300 * PS
    for j in range(3):
        b.append(f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="250" fill="none" stroke="{th["ring"]}" stroke-width="2" '
                 f'class="ring" style="animation-delay:-{j * 2}s"/>')
    b.append(skyline(th))
    b.append("</g>")
    b.append(R(1, 1, W - 2, H - 2, 27, "none", th["frame"], 2))

    # 左欄：標籤、標題、副標
    x0 = 72
    eyebrow = "2026 臺北城市通微服務大黑客松・參賽作品"
    ew = text_width(eyebrow, 18) + 58
    b.append(f'<g class="up d4">{R(x0, 66, ew, 38, 19, th["chip_bg"], th["chip_line"], 1.5)}'
             f'<circle cx="{x0 + 22}" cy="85" r="6" fill="{TP["secondary500"]}"/>'
             f'{T(x0 + 38, 91.5, eyebrow, 18, th["chip_ink"], 700)}</g>')
    title_size, gap = 160, 10
    tw = 3 * title_size + 2 * gap
    b.append(R(x0 - 8, 226, tw + 16, 46, 10, th["mark"], cls="mark"))
    for i, ch in enumerate("用得了"):
        b.append(T(x0 + i * (title_size + gap), 262, ch, title_size, th["ink"], 900, cls=f"ch ch{i}"))
    b.append(T(x0, 340, "看不清楚、聽不清楚，都用得了。", 40, th["ink"], 800, cls="up d1"))
    sub = "說一句話，城市就聽懂。"
    b.append(T(x0, 398, sub, 28, th["accent"], 700, cls="up d2"))
    wx = x0 + text_width(sub, 28) + 16
    hs = [14, 26, 40, 22, 46, 30, 18, 36, 20]
    for i, h in enumerate(hs):
        b.append(R(wx + i * 11, 388 - h / 2, 6, h, 3, th["wave"], cls="w",
                   extra=f' style="animation-delay:-{i * 0.13:.2f}s"'))

    # 三種模式的切換鈕（和右邊手機同步）
    chips, cx_ = [], x0
    for idx, m in enumerate(MODES, 1):
        name = MODE_NAME[m]
        w = 56 + text_width(name, 22) + 24
        base = (R(cx_, 444, w, 54, 27, th["chip_bg"], th["chip_line"], 2)
                + icon(MODE_ICON[m], cx_ + 20, 459, 24, th["chip_ink"])
                + T(cx_ + 54, 479, name, 22, th["chip_ink"], 700))
        on = (R(cx_, 444, w, 54, 27, th["chip_on_bg"])
              + icon(MODE_ICON[m], cx_ + 20, 459, 24, th["chip_on_ink"])
              + T(cx_ + 54, 479, name, 22, th["chip_on_ink"], 800))
        chips.append(base + f'<g class="m{idx}">{on}</g>')
        cx_ += w + 12
    b.append(f'<g class="up d3">{"".join(chips)}</g>')

    # 對話泡泡：手機做了什麼（和手機同步）
    bubbles = {
        "normal": ("speaker", "「看醫生」", "震動＋大字＋唸出來"),
        "vision": ("speaker", "「看醫生」", "字放大 1.3 倍＋唸出來"),
        "hearing": ("muted", "不出聲音", "震動＋大字，1999 改文字"),
    }
    bx, by, bw, bh = 636, 144, 268, 112
    for idx, m in enumerate(MODES, 1):
        ic, main, note = bubbles[m]
        bub = (f'<path d="M{bx + 22} {by}H{bx + bw - 22}a22 22 0 0 1 22 22V{by + 26}l20 8-20 8V{by + bh - 22}'
               f'a22 22 0 0 1-22 22H{bx + 22}a22 22 0 0 1-22-22V{by + 22}a22 22 0 0 1 22-22z" '
               f'fill="{th["bubble_bg"]}" stroke="{th["bubble_line"]}" stroke-width="2"/>'
               + icon(ic, bx + 22, by + 22, 34, th["accent"])
               + T(bx + 66, by + 50, main, 32, th["bubble_ink"], 800)
               + T(bx + 24, by + 90, note, 18, th["bubble_sub"], 700))
        b.append(f'<g class="m{idx}"><g class="pop">{bub}</g></g>')

    # 手機
    ph = [f'<g transform="translate({PX},{PY}) scale({PS})">',
          f'<g filter="url(#sh)">{phone_frame_open()}</g>',
          R(12, 12, 276, 576, 36, "#FFFFFF")]
    for idx, m in enumerate(MODES, 1):
        ph.append(f'<g class="m{idx}">{phone_screen(m)}'
                  f'<circle cx="86.5" cy="152" r="44" fill="#FFFFFF" class="rip"/>'
                  f'<g class="toast">{phone_toast(m)}</g></g>')
    ph.append(phone_island())
    ph.append(f'<g class="buzz">{buzz_marks(th["accent"])}</g>')
    ph.append("</g>")
    b.extend(ph)
    label = "用得了：看不清楚、聽不清楚，都用得了。說一句話，城市就聽懂。右邊的手機輪流示範三種模式（都還好、看不清楚、聽不清楚）按下「看醫生」時的回饋。"
    return svg(W, H, label, "".join(b), css, defs)


# ---- 一眼看懂（專案數字） ----
GLANCE = [("3", "種模式"), ("16", "個功能模組"), ("31", "筆跨局處服務"),
          ("37", "個開放資料來源"), ("6", "個新增 App 能力"), ("0", "次呼叫雲端 AI")]


def glance(theme: str) -> str:
    th = THEMES[theme]
    W, H, gap = 1200, 152, 14
    w = (W - gap * 5) / 6
    css = (".up{animation:up .8s cubic-bezier(.2,.8,.2,1) both}"
           "@keyframes up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}" + REDUCED)
    b = []
    for i, (n, label) in enumerate(GLANCE):
        x = i * (w + gap)
        b.append(f'<g class="up" style="animation-delay:{i * 0.09:.2f}s">'
                 + R(x + 1, 1, w - 2, H - 2, 18, th["card_bg"], th["card_line"], 2)
                 + T(x + w / 2, 82, n, 60, th["num"], 800, "middle")
                 + T(x + w / 2, 122, label, 18, th["ink2"], 700, "middle") + "</g>")
    alt = "一眼看懂：" + "、".join(n + label for n, label in GLANCE)
    return svg(W, H, alt, "".join(b), css)


# ---- 第 1 節：問題的數字 ----
STATS = [
    (76.3, "聽障者", "年滿 65 歲", "衛福部（2026-06）", TP["primary500"]),
    (59.4, "視障者", "年滿 65 歲", "衛福部（2026-06）", TP["primary500"]),
    (23.9, "臺北市人口", "65 歲以上", "主計處統計週報第 1355 號", TP["secondary500"]),
    (42.2, "用健保快易通的長輩", "靠別人幫忙操作", "數發部 111 年調查", TP["orange500"]),
]


def stats(theme: str) -> str:
    th = THEMES[theme]
    W, H, gap = 1200, 284, 20
    w = (W - gap * 3) / 4
    r = 62
    C = 2 * 3.14159265 * r
    css = [".v{animation:fill 1.6s cubic-bezier(.2,.8,.2,1) both}"]
    b = []
    for i, (p, l1, l2, src, color) in enumerate(STATS):
        x = i * (w + gap)
        cx, cy = x + w / 2, 104
        off = C * (1 - p / 100)
        css.append(f"@keyframes f{i}{{from{{stroke-dashoffset:{C:.1f}}}to{{stroke-dashoffset:{off:.1f}}}}}")
        b.append(R(x + 1, 1, w - 2, H - 2, 20, th["card_bg"], th["card_line"], 2)
                 + f'<circle cx="{cx:.1f}" cy="{cy}" r="{r}" fill="none" stroke="{th["track"]}" stroke-width="14"/>'
                 + f'<circle cx="{cx:.1f}" cy="{cy}" r="{r}" fill="none" stroke="{color}" stroke-width="14" '
                   f'stroke-linecap="round" stroke-dasharray="{C:.1f}" stroke-dashoffset="{off:.1f}" '
                   f'transform="rotate(-90 {cx:.1f} {cy})" class="v" '
                   f'style="animation-name:f{i};animation-delay:{0.2 + i * 0.15:.2f}s"/>'
                 + f'<text x="{cx:.1f}" y="{cy + 10}" text-anchor="middle" fill="{th["ink"]}" font-weight="800">'
                   f'<tspan font-size="30">{p}</tspan><tspan font-size="18" dx="2">%</tspan></text>'
                 + T(cx, 208, l1, 21, th["ink"], 800, "middle")
                 + T(cx, 236, l2, 21, th["ink2"], 700, "middle")
                 + T(cx, 264, src, 14, th["muted"], 400, "middle"))
    alt = "；".join(f"{l1}{l2}：{p}%（{src}）" for p, l1, l2, src, _ in STATS)
    return svg(W, H, alt, "".join(b), "".join(css) + REDUCED)


# ---- 第 3 節：三種模式並排 ----
MODE_NOTES = {
    "normal": ["按下按鈕：震動＋大字＋唸出名稱", "字級跟手機設定", "唸的速度可調，預設「慢」"],
    "vision": ["字至少放大 1.3 倍", "一樣震動＋大字＋唸出名稱", "唸的速度預設「正常」，可調到最快"],
    "hearing": ["不出聲音：只震動＋大字", "1999 改成「1999 文字」，只打字找服務", "文字管道排在電話前面"],
}


def modes(theme: str) -> str:
    """三支手機同時按下「看醫生」，各自演出自己模式的回饋（手指點按、按鈕縮一下＋漣漪、震動、大字、
    唸出來或靜音）。首頁畫面用 docs/diagrams/phone_kit.py 照 HomeScreen.tsx 畫：看不清楚模式字放大 1.3 倍、
    改成單欄；聽不清楚模式「1999 文字」、只打字找服務。沒有動畫時就是三張首頁並排。"""
    sys.path.insert(0, os.path.join(OUT, "..", "diagrams"))
    import phone_kit as ui
    th = THEMES[theme]
    W, H, PS = 1200, 640, 0.72
    m = ui.Motion(6.0)
    tap = 1.2
    b = []
    for i, md in enumerate(MODES):
        cx = 200 + i * 400
        name = MODE_NAME[md]
        w = 60 + text_width(name, 24) + 26
        b.append(R(cx - w / 2, 8, w, 54, 27, th["chip_on_bg"])
                 + icon(MODE_ICON[md], cx - w / 2 + 22, 22, 26, th["chip_on_ink"])
                 + T(cx - w / 2 + 60, 44, name, 24, th["chip_on_ink"], 800))
        s = ui.home(md, m, gift=False, press={"health": tap})
        fx, fy = s.at["health"]
        hearing = md == "hearing"
        ring = TP["orange500"] if hearing else TP["primary500"]
        voice = (f'<g transform="translate(300,64)"><g opacity="0" class="{m.pop(tap + 0.15, tap + 3.2)}">'
                 f'<circle r="28" fill="#FFFFFF" stroke="{ring}" stroke-width="3"/>'
                 f'{icon("muted" if hearing else "speaker", -15, -15, 30, TP["orange500"] if hearing else TP["primary700"])}</g></g>')
        b.append(f'<g transform="translate({cx - 150 * PS:.1f},84) scale({PS})">{phone_frame_open()}'
                 f'<g clip-path="url(#scr)">{s.svg()}'
                 f'<g opacity="0" class="{m.pop(tap + 0.15, tap + 3.2)}">{ui.toast("看醫生", md)}</g></g>{phone_island()}'
                 f'<g opacity="0" class="{m.buzz([tap + 0.05])}">{buzz_marks(th["accent"])}</g>{voice}'
                 f'<g opacity="0" class="{ui.finger_track(m, [(tap, fx, fy)])}">{ui.finger()}</g></g>')
        for j, line in enumerate(MODE_NOTES[md]):
            b.append(T(cx, 560 + j * 30, line, 19, th["ink"] if j == 0 else th["ink2"], 800 if j == 0 else 500, "middle"))
    alt = ("三種模式的首頁並排比較：三支手機同時按下「看醫生」，都會震動、上方跳出大字「看醫生」。"
           + "；".join(f"{MODE_NAME[md]}：" + "，".join(MODE_NOTES[md]) for md in MODES))
    defs = f'<clipPath id="scr"><rect x="{ui.SX}" y="{ui.SY}" width="{ui.SW}" height="{ui.SH}" rx="36"/></clipPath>'
    return svg(W, H, alt, "".join(b), m.css(), defs)


# ---- 按鈕與徽章（實心底色，深淺主題共用） ----
def button(label: str, ic: str, bg: str, fg: str) -> str:
    size, h = 20, 52
    w = 22 + 26 + 10 + text_width(label, size) + 26
    body = (R(0, 0, w, h, 26, bg) + icon(ic, 22, 13, 26, fg) + T(58, 33, label, size, fg, 800))
    return svg(round(w), h, label, body)


def badge(label: str, value: str, bg: str, fg: str) -> str:
    size, h, pad = 13, 28, 10
    lw = text_width(label, size) + pad * 2
    vw = text_width(value, size) + pad * 2
    body = (f'<clipPath id="r"><rect width="{lw + vw:.1f}" height="{h}" rx="6"/></clipPath>'
            f'<g clip-path="url(#r)">{R(0, 0, lw, h, 0, TP["gray800"])}{R(lw, 0, vw, h, 0, bg)}</g>'
            + T(lw / 2, 18.5, label, size, "#FFFFFF", 700, "middle")
            + T(lw + vw / 2, 18.5, value, size, fg, 800, "middle"))
    return svg(round(lw + vw), h, f"{label}：{value}", body)


BUTTONS = [
    ("btn-demo.svg", "線上試用", "play", TP["primary700"], "#FFFFFF"),
    ("btn-judge.svg", "評審 2 分鐘試用", "timer", TP["secondary500"], TP["gray900"]),
    ("btn-spec.svg", "功能規格", "doc", TP["gray800"], "#FFFFFF"),
    ("btn-app.svg", "城市通 App", "phone", TP["gray800"], "#FFFFFF"),
]
BADGES = [
    ("badge-nextjs.svg", "Next.js", "16", TP["primary700"], "#FFFFFF"),
    ("badge-flutter.svg", "Flutter", "3.47", TP["primary700"], "#FFFFFF"),
    ("badge-license.svg", "授權", "AGPL-3.0", TP["secondary500"], TP["gray900"]),
    ("badge-ai.svg", "雲端 AI", "不使用", "#17b26a", TP["gray900"]),
    ("badge-speech.svg", "語音辨識", "只在手機上", "#17b26a", TP["gray900"]),
    ("badge-offline.svg", "斷網", "打開後仍可用", "#17b26a", TP["gray900"]),
]


def main() -> None:
    for theme in THEMES:
        write(f"banner-{theme}.svg", banner(theme))
        write(f"glance-{theme}.svg", glance(theme))
        write(f"stats-{theme}.svg", stats(theme))
        write(f"modes-{theme}.svg", modes(theme))
    for name, label, ic, bg, fg in BUTTONS:
        write(name, button(label, ic, bg, fg))
    for name, label, value, bg, fg in BADGES:
        write(name, badge(label, value, bg, fg))


if __name__ == "__main__":
    main()
