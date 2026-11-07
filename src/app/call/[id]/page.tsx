import { notFound } from "next/navigation";
import { CallConfirm } from "@/components/elder/CallConfirm";
import { PHONES } from "@/lib/elder/home";

// 只產生登記在 PHONES 的電話，網址帶其他號碼一律 404，避免被帶去撥任意號碼
export function generateStaticParams() {
  return Object.keys(PHONES).map((id) => ({ id }));
}

export default async function CallPage(props: PageProps<"/call/[id]">) {
  const { id } = await props.params;
  const entry = PHONES[id];
  if (!entry) notFound();
  return <CallConfirm entry={entry} />;
}
