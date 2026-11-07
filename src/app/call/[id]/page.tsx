import { notFound } from "next/navigation";
import { CallConfirm } from "@/components/elder/CallConfirm";
import { SERVICES, getService, phoneOf } from "@/lib/elder/services";

// 只產生服務清單裡有電話的服務；網址帶其他 id 一律 404，避免被帶去撥任意號碼
export function generateStaticParams() {
  return SERVICES.filter((s) => phoneOf(s)).map((s) => ({ id: s.id }));
}

export default async function CallPage(props: PageProps<"/call/[id]">) {
  const { id } = await props.params;
  const service = getService(id);
  const phone = service && phoneOf(service);
  if (!service || !phone) notFound();
  return <CallConfirm service={service} number={phone.target} />;
}
