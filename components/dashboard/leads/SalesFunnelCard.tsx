import Donut from "./Donut";

export default function SalesFunnelCard() {
  return (
    <div className="rounded-[24px] bg-white p-5 shadow-[0_8px_30px_rgba(2,6,23,0.06)] ring-1 ring-slate-100">
      <h3 className="text-[18px] font-semibold text-slate-900">Sales Funnel</h3>
      <div className="mt-4 flex h-[320px] items-center justify-center">
        <Donut type="gradient" size={224} cutout={0.66} from="indigo-500" to="amber-400" />
      </div>
    </div>
  );
}
