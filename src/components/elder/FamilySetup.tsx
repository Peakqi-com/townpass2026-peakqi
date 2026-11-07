"use client";

import { useState } from "react";
import { toDataURL } from "qrcode";
import { byteModeSegments } from "@/lib/elder/familyQr";
import { HOME_BUTTONS } from "@/lib/elder/home";
import {
  FAMILY_LIMITS,
  REQUIRED_BUTTON,
  TAIPEI_TOWNS,
  checkContact,
  checkFamilyConfig,
  encodeFamilyConfig,
  familyButtons,
  formatMobile,
  normalizePhone,
  type FamilyBus,
  type FamilyConfig,
  type FamilyContact,
} from "@/lib/elder/familyConfig";
import { BusPicker } from "./BusPicker";
import { useElder } from "./ElderProvider";
import { PageShell } from "./PageShell";
import { useFocusOnMount } from "./useFocusOnMount";

const INPUT =
  "min-h-[4.5rem] w-full min-w-0 rounded-2xl border-4 border-grayscale-800 bg-white px-4 text-elder-body text-text-primary placeholder:text-text-second";
const FOCUS =
  "outline-offset-2 focus-visible:outline focus-visible:outline-[6px] focus-visible:outline-grayscale-900 active:outline active:outline-[6px] active:outline-grayscale-900";
const LEGEND = "mb-3 text-elder-button font-bold text-text-primary";

type Row = { name: string; phone: string };
const EMPTY_ROWS: Row[] = Array.from({ length: FAMILY_LIMITS.maxContacts }, () => ({ name: "", phone: "" }));

/**
 * M7 家人代設定（家人那一端）：挑首頁按鈕、填聯絡人、選行政區 → 產生 QR code。
 * 設定內容直接編在 QR 裡（familyConfig.ts），不經過伺服器；長輩的手機掃了就存在本機。
 * 里辦公處或聯醫志工也可以用同一頁幫長輩設定。
 */
export function FamilySetup() {
  const { a11y, announce, say } = useElder();
  const [buttons, setButtons] = useState<string[]>(() => HOME_BUTTONS.map((b) => b.id));
  const [rows, setRows] = useState<Row[]>(EMPTY_ROWS);
  const [town, setTown] = useState("");
  const [buses, setBuses] = useState<FamilyBus[]>([]);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ config: FamilyConfig; image: string } | null>(null);

  // 改了任何欄位，舊的設定碼就不算數，避免掃到過時的內容
  const changed = () => {
    setResult(null);
    setError("");
  };

  const toggle = (id: string) => {
    changed();
    // 照 HOME_BUTTONS 的順序排，首頁的位置才固定
    setButtons((prev) =>
      HOME_BUTTONS.map((b) => b.id).filter((x) => (x === id ? !prev.includes(id) : prev.includes(x))),
    );
  };

  const setRow = (index: number, patch: Partial<Row>) => {
    changed();
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const fail = (reason: string) => {
    setError(reason);
    say(reason);
  };

  const generate = async () => {
    announce("產生設定碼");
    // 先逐列檢查，錯誤訊息才能對上畫面上的第幾列
    const contacts: FamilyContact[] = [];
    for (const [i, row] of rows.entries()) {
      const name = row.name.trim();
      const phone = normalizePhone(row.phone);
      if (!name && !phone) continue;
      const checked = checkContact({ name, phone });
      if (!checked.ok) return fail(`第 ${i + 1} 位聯絡人${checked.reason}`);
      contacts.push(checked.contact);
    }
    const checked = checkFamilyConfig({ v: 1, buttons, contacts, town, ...(buses.length > 0 ? { buses } : {}) });
    if (!checked.ok) return fail(checked.reason);

    try {
      // 整段用 Byte 模式：iOS 的掃碼套件讀不到 Numeric 段，會把設定碼截斷（見 familyQr.ts）
      const image = await toDataURL(byteModeSegments(encodeFamilyConfig(checked.config)), {
        errorCorrectionLevel: "M",
        margin: 4,
        width: 480,
        color: { dark: "#000000", light: "#ffffff" },
      });
      setError("");
      setResult({ config: checked.config, image });
      // QrResult 掛載時會把焦點移到它的標題，報讀軟體會唸標題；開著報讀軟體時再 say 會唸兩次
      if (!a11y.screenReader) say("設定碼做好了，請用長輩的手機掃描");
    } catch {
      fail("設定碼做不出來，請再按一次");
    }
  };

  return (
    <PageShell title="幫長輩設定">
      <p className="text-elder-body text-text-second">
        選好後會出現一張設定碼，用長輩的手機掃一下就完成。設定只放在設定碼裡，不會上傳。
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void generate();
        }}
        className="flex flex-col gap-8"
      >
        <fieldset>
          <legend className={LEGEND}>
            1. 長輩首頁的按鈕（{FAMILY_LIMITS.minButtons}～{FAMILY_LIMITS.maxButtons} 個）
          </legend>
          <p className="mb-3 text-elder-body text-text-second">已選 {buttons.length} 個。少一點，長輩比較好找。</p>
          <div className="flex flex-col gap-3">
            {HOME_BUTTONS.map((b) => {
              const required = b.id === REQUIRED_BUTTON;
              const checked = buttons.includes(b.id);
              return (
                <label
                  key={b.id}
                  className={`flex min-h-[4.5rem] items-center gap-4 rounded-2xl border-4 bg-white px-4 text-elder-body font-bold text-text-primary has-[:focus-visible]:outline has-[:focus-visible]:outline-[6px] has-[:focus-visible]:outline-grayscale-900 ${
                    checked ? "border-grayscale-900" : "border-divider"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={required}
                    onChange={() => toggle(b.id)}
                    className="size-8 shrink-0 accent-grayscale-900"
                  />
                  <span>
                    {b.label}
                    {required && <span className="font-normal text-text-second">（一定要有，長輩才打得到您）</span>}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className={LEGEND}>2. 家人的電話（1～{FAMILY_LIMITS.maxContacts} 位）</legend>
          <div className="flex flex-col gap-5">
            {rows.map((row, i) => (
              <div key={i} className="flex flex-col gap-2">
                <p className="text-elder-body font-bold text-text-primary">
                  第 {i + 1} 位{i > 0 && <span className="font-normal text-text-second">（可以不填）</span>}
                </p>
                <label htmlFor={`contact-name-${i}`} className="text-h3 text-text-second">
                  長輩怎麼叫您（最多 {FAMILY_LIMITS.maxName} 個字）
                </label>
                <input
                  id={`contact-name-${i}`}
                  value={row.name}
                  onChange={(e) => setRow(i, { name: e.target.value })}
                  placeholder={i === 0 ? "例如：大兒子" : ""}
                  autoComplete="off"
                  className={INPUT}
                />
                <label htmlFor={`contact-phone-${i}`} className="text-h3 text-text-second">
                  電話
                </label>
                <input
                  id={`contact-phone-${i}`}
                  type="tel"
                  inputMode="tel"
                  value={row.phone}
                  onChange={(e) => setRow(i, { phone: e.target.value })}
                  placeholder={i === 0 ? "例如：0912345678" : ""}
                  autoComplete="off"
                  className={`${INPUT} tabular-nums`}
                />
              </div>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <label htmlFor="town" className="text-elder-button font-bold text-text-primary">
            3. 長輩住哪一區
          </label>
          <select
            id="town"
            value={town}
            onChange={(e) => {
              changed();
              setTown(e.target.value);
            }}
            className={INPUT}
          >
            <option value="">請選擇</option>
            {TAIPEI_TOWNS.map((t) => (
              <option key={t} value={t}>
                臺北市{t}
              </option>
            ))}
          </select>
        </div>

        <BusPicker
          buses={buses}
          onChange={(next) => {
            changed();
            setBuses(next);
          }}
        />

        {error && <p className="text-elder-body font-bold text-alarm">{error}</p>}

        <button
          type="submit"
          className={`min-h-[4.5rem] rounded-2xl bg-grayscale-800 px-5 text-elder-button font-bold text-white ${FOCUS}`}
        >
          產生設定碼
        </button>
      </form>

      {result && <QrResult key={result.image} config={result.config} image={result.image} />}
    </PageShell>
  );
}

/** 設定碼與內容摘要。出現時焦點移到標題，報讀軟體使用者不用往下找 */
function QrResult({ config, image }: { config: FamilyConfig; image: string }) {
  const heading = useFocusOnMount<HTMLHeadingElement>();
  return (
    <section aria-labelledby="qr-heading" className="flex flex-col gap-4 rounded-2xl border-4 border-grayscale-900 bg-white p-4">
      <h2 id="qr-heading" ref={heading} tabIndex={-1} className="text-elder-button font-bold text-text-primary focus:outline-none">
        設定碼做好了
      </h2>
      <p className="text-elder-body text-text-primary">
        用長輩的手機：用得了 →「打給家人」→「家人幫我設定」，對準這張碼。
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element -- data: URL，不需要 next/image 最佳化 */}
      <img
        src={image}
        alt="用得了的設定碼"
        width={480}
        height={480}
        className="mx-auto aspect-square w-full max-w-[20rem]"
        style={{ imageRendering: "pixelated" }}
      />
      <dl className="flex flex-col gap-2 text-elder-body text-text-primary">
        <div>
          <dt className="font-bold">首頁按鈕</dt>
          <dd>{familyButtons(config).map((b) => b.label).join("、")}</dd>
        </div>
        <div>
          <dt className="font-bold">家人電話</dt>
          {config.contacts.map((c, i) => (
            <dd key={i} className="tabular-nums">
              {c.name}：{formatMobile(c.phone)}
            </dd>
          ))}
        </div>
        <div>
          <dt className="font-bold">行政區</dt>
          <dd>臺北市{config.town}</dd>
        </div>
        {config.buses && config.buses.length > 0 && (
          <div>
            <dt className="font-bold">常坐的公車</dt>
            {config.buses.map((b) => (
              <dd key={`${b.city}-${b.stopId}`}>{b.label}</dd>
            ))}
          </div>
        )}
      </dl>
    </section>
  );
}
