"use client";

import { elderBenefits, GIFT_TITLE, giftAmountLine, type ElderBenefits, type LesserKnown } from "@/lib/elder/benefits";
import type { GiftInfo } from "@/lib/elder/profile";
import { giftReminder } from "@/lib/elder/reminders";
import { getService, type Service } from "@/lib/elder/services";
import { districtFor, ext1999, townOf, type District, type Subsidy } from "@/lib/elder/subsidy";
import { ChannelButtons, type Channel } from "./ChannelButtons";
import { useElder } from "./ElderProvider";
import { PageShell } from "./PageShell";
import { ReminderButton } from "./ReminderButton";
import { ServiceCard } from "./ServiceCard";
import { ServiceLink } from "./ServiceButton";

/*
 * 出處（都在 TownPass docs/townpass/taipei-elderly-services.md B.1、B.5、B.7 標 ✅，2026-11-07 查證）
 */
const VERIFIED = "2026-11-07";
/** 重陽禮金匯款申請：不用登入，身分證字號＋電話＋銀行帳戶 */
const GIFT_ONLINE = "https://welfare.gov.taipei/olds/Home";
/** 市府 115/6/30 闢謠：「600 點要到區公所辦理」是假消息 */
const RUMOR_SOURCE = "https://www.gov.taipei/News_Content.aspx?n=F0DDAF49B89E9413&sms=72544237BBE4C5F6&s=EFF9CE431990FCDB";

/** 服務清單裡的服務（M3）；找不到時回 null，該按鈕就不顯示 */
function svc(id: string): Service | null {
  return getService(id) ?? null;
}

/**
 * M6 我的權益：用台北通帳號的生日、市民、原住民身分，主動列出長輩的權益。
 * 未滿年齡的人只看到補助小幫手（也可以幫家裡的長輩看）。
 *
 * 順序：很多人不知道的權益 → 重陽禮金（寫給還沒收到的人）→ 敬老卡 → 疫苗 → 健檢。
 * 重陽禮金、敬老卡幾乎每位長輩都知道；健保費補助、長照交通接送知道的人少很多，所以放最上面。
 */
export function BenefitsScreen() {
  const { ready, now, user } = useElder();

  return (
    <PageShell title="我的權益">
      <ServiceLink
        href="/benefits/subsidy"
        label="補助小幫手：看看能領什麼"
        speak="補助小幫手，看看能領什麼"
        icon="benefit"
        row
        className="justify-start bg-elder-benefit text-left text-on-elder-benefit"
      />
      {!ready || !now ? (
        <p className="text-elder-body text-text-second">載入中…</p>
      ) : !user ? (
        <p className="text-elder-body text-text-primary">
          讀不到您的台北通資料，沒辦法依年齡列出權益。可以用上面的補助小幫手，或問 1957。
        </p>
      ) : (
        <BenefitList
          benefits={elderBenefits({ birthday: user.birthday, citizen: user.citizen, nativePeople: user.nativePeople }, now)}
          district={districtFor(townOf(user.addresses))}
          citizen={user.citizen}
        />
      )}
      <WelfareHotline />
    </PageShell>
  );
}

function BenefitList({ benefits: b, district, citizen }: { benefits: ElderBenefits; district: District | null; citizen: boolean }) {
  if (b.age === null) {
    return <p className="text-elder-body text-text-primary">讀不到您的生日，沒辦法依年齡列出權益。可以用上面的補助小幫手。</p>;
  }
  if (!b.isSenior) {
    return (
      <section aria-labelledby="not-yet" className="flex flex-col gap-3 rounded-2xl bg-bg-dark p-4">
        <h2 id="not-yet" className="text-elder-button font-bold text-text-primary">
          {b.seniorAge} 歲以後，這裡會列出長輩的權益
        </h2>
        <p className="text-elder-body text-text-primary">
          例如敬老卡、重陽禮金、公費疫苗、老人健檢。您今年 {b.age} 歲。
        </p>
        <p className="text-elder-body text-text-primary">想幫家裡的長輩看看能領什麼，也可以用上面的補助小幫手。</p>
      </section>
    );
  }
  return (
    <>
      <p className="text-elder-body text-text-primary">您今年 {b.age} 歲，下面是您可能可以用的權益。最後以主責機關審核為準。</p>
      {b.lesserKnown && <LesserKnownCard lesserKnown={b.lesserKnown} district={district} />}
      {b.gift && <GiftCard gift={b.gift} district={district} />}
      {b.seniorCard && <SeniorCard />}
      {b.vaccine && <VaccineCard age={b.age} />}
      {b.healthCheck && <HealthCheckCard year={b.healthCheck.rocYear} inJanuary={b.healthCheck.inJanuary} />}
      {!citizen && (
        <p className="rounded-2xl bg-bg-dark p-4 text-elder-body text-text-primary">
          您的台北通資料顯示不是臺北市民。敬老卡、重陽禮金、老人健檢要設籍臺北市才能申請。
        </p>
      )}
    </>
  );
}

/* ---------- 卡片 ---------- */

function Card({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 rounded-2xl border-4 border-elder-benefit bg-white p-4">
      <h2 id={id} className="text-elder-button font-bold text-text-primary">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return <p className="text-elder-body text-text-primary">{children}</p>;
}

function Source({ owner, links }: { owner: string; links: { href: string; label: string }[] }) {
  return (
    <p className="text-h3 text-text-second">
      {owner}・
      {links.map((l, i) => (
        <span key={l.href}>
          {i > 0 && "、"}
          <a href={l.href} className="underline underline-offset-2">
            {l.label}
          </a>
        </span>
      ))}
      （{VERIFIED} 查證）
    </p>
  );
}

/** 區公所社會課的地址電話＋撥號（撥號前有確認頁） */
function districtChannel(d: District): Channel {
  return { kind: "link", href: `/benefits/call/district-${d.id}`, label: `打給${d.name}公所社會課`, voice: true };
}

/**
 * 很多人不知道的權益：老人健保費補助（不用申請，但被停補可以申請恢復）、長照交通接送、照顧家人。
 * 金額、分機都取自 subsidies.json／services.json（有出處與查證日期）。
 */
function LesserKnownCard({ lesserKnown: k, district }: { lesserKnown: LesserKnown; district: District | null }) {
  const ride = k.ltcRide ? svc("ltc-ride") : null;
  const care = k.care ? svc("page-care") : null;
  return (
    <section aria-labelledby="lesser-known" className="flex flex-col gap-4 rounded-2xl border-4 border-elder-benefit bg-white p-4">
      <h2 id="lesser-known" className="text-elder-button font-bold text-text-primary">
        很多人不知道的權益
      </h2>
      <Body>這些權益很多人沒聽過。看看您或家人用不用得到。</Body>
      {k.nhiPremium && <NhiPremium subsidy={k.nhiPremium} district={district} />}
      {ride && <ServiceCard service={ride} headingLevel={3} />}
      {care && (
        <ServiceLink
          href="/care"
          label="照顧家人：失智篩檢、喘息服務"
          speak="照顧家人，失智篩檢、喘息服務"
          icon="family"
          row
          className="justify-start bg-elder-family text-left text-on-elder-family"
        />
      )}
    </section>
  );
}

function NhiPremium({ subsidy: s, district }: { subsidy: Subsidy; district: District | null }) {
  const c1999 = svc("citizen-1999");
  const ext = ext1999(s, district);
  return (
    <article aria-labelledby="nhi-premium" className="flex flex-col gap-3 rounded-2xl border-4 border-divider p-4">
      <h3 id="nhi-premium" className="text-elder-button font-bold text-text-primary">
        {s.title}：{s.amount}
      </h3>
      <Body>{s.apply.autoNote ?? s.summary}</Body>
      {s.notes.map((n) => (
        <p key={n} className="text-elder-body text-text-second">
          {n}
        </p>
      ))}
      {ext && c1999 && (
        <>
          <Body>想知道有沒有被停補、怎麼恢復，可以打 1999，接通後請說：「轉分機 {ext}」。</Body>
          <ChannelButtons
            channels={[{ kind: "run", service: c1999, action: c1999.action, label: "打 1999", speak: `打 1999，接通後說轉分機 ${ext}` }]}
          />
        </>
      )}
      <p className="text-h3 text-text-second">
        {s.owner}・
        <a href={s.source} className="underline underline-offset-2">
          官方說明
        </a>
        （{s.verified} 查證）
      </p>
    </article>
  );
}

function GiftCard({ gift, district }: { gift: GiftInfo; district: District | null }) {
  const { now } = useElder();
  const service = svc("double-ninth");
  // 還在申請期內才提供「提醒我申請」（截止前一天或當天早上 9 點跳出手機通知）
  const reminder = gift.phase === "apply" && now ? giftReminder(now) : null;
  const deadline =
    gift.phase === "apply"
      ? gift.daysLeft === 0
        ? "今天（11/13）截止申請，12 月 1 日入帳。"
        : `還有 ${gift.daysLeft} 天截止（11/13），12 月 1 日入帳。`
      : "申請期已過，12 月 31 日前可以申請補發。";
  const channels: Channel[] = service
    ? [
        { kind: "run", service, action: { type: "open_external", target: GIFT_ONLINE }, label: "線上申請匯款", text: true },
        { kind: "run", service, action: service.action, label: "看怎麼申請" },
      ]
    : [];
  if (district) channels.push(districtChannel(district));

  return (
    <Card id="gift" title={GIFT_TITLE}>
      <Body>
        {giftAmountLine(gift)}
        {deadline}
      </Body>
      <Body>線上申請不用登入，要準備身分證字號、電話和銀行帳戶。也可以到區公所申請。</Body>
      {district && (
        <p className="text-elder-body text-text-second">
          {district.name}公所社會課：{district.address}
        </p>
      )}
      <ChannelButtons channels={channels} />
      {reminder && <ReminderButton reminder={reminder} label="提醒我申請" />}
      <Source owner="臺北市政府社會局" links={[{ href: service?.source ?? GIFT_ONLINE, label: "官方說明" }]} />
    </Card>
  );
}

function SeniorCard() {
  const service = svc("senior-card");
  const channels: Channel[] = service
    ? [
        { kind: "run", service, action: service.action, label: "看怎麼申辦" },
        ...(service.fallback ? [{ kind: "run" as const, service, action: service.fallback, label: "打 1999 問剩幾點" }] : []),
      ]
    : [];
  return (
    <Card id="senior-card" title="敬老卡：每個月 600 點">
      <ul className="flex list-disc flex-col gap-2 pl-6 text-elder-body text-text-primary">
        <li>聯醫門診掛號，每次扣 50 點。</li>
        <li>敬老愛心計程車，每趟最多扣 85 點（手機撥 55850）。</li>
        <li>可以用在 12 種交通工具、71 處公有場館。</li>
        <li>當月沒用完不會累積。</li>
      </ul>
      <p className="rounded-xl bg-bg-dark p-3 text-elder-body text-text-primary">
        <strong>小心謠言：</strong>「600 點要到區公所辦」是假的。點數會在每月第一次刷卡時自動寫入，不用跑區公所。
      </p>
      <Body>還沒有敬老卡：帶身分證正本和 2 吋照片，到任何一個區公所社會課臨櫃辦。查剩幾點，目前請打 1999 問。</Body>
      <ChannelButtons channels={channels} />
      <Source
        owner="臺北市政府社會局"
        links={[
          { href: service?.source ?? RUMOR_SOURCE, label: "官方說明" },
          { href: RUMOR_SOURCE, label: "市府闢謠" },
        ]}
      />
    </Card>
  );
}

function VaccineCard({ age }: { age: number }) {
  const service = svc("vaccine");
  return (
    <Card id="vaccine" title="公費疫苗：流感、肺炎鏈球菌">
      <Body>帶健保卡到合約院所或社區接種站。</Body>
      <ul className="flex list-disc flex-col gap-2 pl-6 text-elder-body text-text-primary">
        <li>流感疫苗：115 年 10 月 1 日開打。</li>
        {age >= 65 && <li>新冠疫苗：和流感同時開打，65 歲以上可以打。</li>}
        <li>肺炎鏈球菌疫苗：打 1 劑就好。</li>
      </ul>
      {service && <ChannelButtons channels={[{ kind: "run", service, action: service.action, label: "看接種地點" }]} />}
      <Source owner="臺北市政府衛生局" links={[{ href: service?.source ?? "https://health.gov.taipei/", label: "官方說明" }]} />
    </Card>
  );
}

function HealthCheckCard({ year, inJanuary }: { year: number; inJanuary: boolean }) {
  const service = svc("health-check");
  return (
    <Card id="health-check" title={inJanuary ? "老人健檢：這個月開放預約" : `老人健檢：明年（${year} 年）1 月開放預約`}>
      <Body>每年 1 次免費健康檢查，也有記憶和心情的篩檢。名額有限，額滿為止。</Body>
      <Body>
        115 年的時間：網路預約優先族群 1/15 起、一般長者 1/22 起；電話 0800-031-889 只在 1 月開放。{year} 年的日期以衛生局公告為準。
      </Body>
      {service && <ChannelButtons channels={[{ kind: "run", service, action: service.action, label: "看健檢說明" }]} />}
      <Source owner="臺北市政府衛生局" links={[{ href: service?.source ?? "https://health.gov.taipei/", label: "官方說明" }]} />
    </Card>
  );
}

/** 還是不知道能領什麼：問 1957（有線上文字諮詢） */
function WelfareHotline() {
  const service = svc("welfare-1957");
  return service ? <ServiceCard service={service} /> : null;
}
