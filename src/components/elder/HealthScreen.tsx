"use client";

import { getService, type Service } from "@/lib/elder/services";
import { useElder } from "./ElderProvider";
import { PageShell } from "./PageShell";
import { ServiceLink } from "./ServiceButton";
import { ServiceCard } from "./ServiceCard";

/** 看病會用到的服務，依序：掛號（聯醫）→ 怎麼去（交通局、社會局）→ 找人照顧（衛生局） */
const HEALTH_IDS = ["tpech-reg", "page-ride", "ltc-1966"] as const;
/** 聽不清楚模式另外加：看病時申請手語翻譯或同步聽打（社會局） */
const HEARING_IDS = ["sign-language"] as const;

function pick(ids: readonly string[]): Service[] {
  return ids.map(getService).filter((s): s is Service => Boolean(s));
}

/**
 * M4 我要看醫生：一頁看到原本分散在聯醫、交通局、社會局、衛生局的看病選項。
 * 不需要開放資料；醫院清單由其他模組處理。
 */
export function HealthScreen() {
  const { mode } = useElder();
  const hearing = mode === "hearing";
  // 敬老卡扣掛號費的出處：市府 114/10/29 新聞（115/1 起擴大到一般長者，21 處聯醫門診）
  const seniorCard = getService("senior-card");

  return (
    <PageShell title="看醫生">
      <p className="text-elder-body text-text-second">掛號、叫車、找人照顧，都在這一頁。</p>

      {pick(HEALTH_IDS).map((service) => (
        <div key={service.id} className="flex flex-col gap-3">
          <ServiceCard service={service} />
          {service.id === "tpech-reg" && seniorCard && (
            <p className="rounded-2xl border-4 border-elder-benefit bg-white p-4 text-elder-body text-text-primary">
              <strong>掛號費可以用敬老卡付：</strong>在聯醫門診刷敬老卡，每次扣 50 點。
              <span className="mt-1 block text-h3 text-text-second">
                臺北市政府・
                <a href={seniorCard.source} className="underline underline-offset-2">
                  官方說明
                </a>
                （{seniorCard.verified} 查證）
              </span>
            </p>
          )}
        </div>
      ))}

      {hearing && (
        <section aria-labelledby="health-hearing-heading" className="flex flex-col gap-4">
          <h2 id="health-hearing-heading" className="text-elder-button font-bold text-text-primary">
            聽不清楚的話
          </h2>
          <p className="text-elder-body text-text-second">看診時把溝通卡給醫生看，或用文字聯絡。</p>
          <ServiceLink
            href="/card/clinic"
            label="看診溝通卡"
            icon="ear"
            row
            className="bg-elder-hearing text-on-elder-hearing"
          />
          <ServiceLink
            href="/text"
            label="用文字聯絡"
            icon="text"
            row
            className="bg-elder-hearing text-on-elder-hearing"
          />
          {pick(HEARING_IDS).map((service) => (
            <ServiceCard key={service.id} service={service} headingLevel={3} />
          ))}
        </section>
      )}
    </PageShell>
  );
}
