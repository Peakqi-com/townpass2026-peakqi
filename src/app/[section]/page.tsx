import { notFound } from "next/navigation";
import { PageShell } from "@/components/elder/PageShell";

/**
 * M2～M8 還在開發的頁面先用這個佔位，讓首頁的每個按鈕都點得進去。
 * 某個功能完成時，新增同名的資料夾（例如 src/app/health/page.tsx），Next.js 會優先使用它，
 * 再把該項目從這裡刪掉。
 */
const SECTIONS: Record<string, string> = {
  benefits: "我的權益",
  community: "附近吃飯、上課",
};

export function generateStaticParams() {
  return Object.keys(SECTIONS).map((section) => ({ section }));
}

export default async function SectionPage(props: PageProps<"/[section]">) {
  const { section } = await props.params;
  const title = SECTIONS[section];
  if (!title) notFound();
  return (
    <PageShell title={title}>
      <p className="text-elder-body text-text-second">這個功能正在製作中。</p>
    </PageShell>
  );
}
