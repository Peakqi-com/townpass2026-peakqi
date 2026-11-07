import { notFound } from "next/navigation";
import { CallConfirm } from "@/components/elder/CallConfirm";
import { callTargetFor, callTargets } from "@/lib/elder/subsidy";

/**
 * 補助小幫手的撥號確認頁：12 區公所社會課、補助的專線（資料在 src/data/subsidies.json）。
 * 和 /call/[id] 一樣只產生清單裡的電話，網址帶其他 id 一律 404，避免被帶去撥任意號碼。
 */
export function generateStaticParams() {
  return callTargets().map((t) => ({ id: t.id }));
}

export default async function BenefitCallPage(props: PageProps<"/benefits/call/[id]">) {
  const { id } = await props.params;
  const target = callTargetFor(id);
  if (!target || target.action.type !== "phone_call") notFound();
  return <CallConfirm service={target} number={target.action.target} />;
}
