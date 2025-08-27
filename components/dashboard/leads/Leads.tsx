import KpiCard from "./KpiCard";
import SalesFunnelCard from "./SalesFunnelCard";
import LeadSourcesCard from "./LeadSourcesCard";
import DepartmentSnapshotsCard from "./DepartmentSnapshotsCard";
import StaffStatusCard from "./StaffStatusCard";
import StaffPerformance from "./StaffPerformance";

export default function Leads() {
  return (
    <div className="space-y-6">
      <KpiCard />

      <div className="grid gap-6 lg:grid-cols-2">
        <SalesFunnelCard />
        <LeadSourcesCard />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <StaffPerformance />
        <DepartmentSnapshotsCard />
        <StaffStatusCard />
      </div>
    </div>
  );
}
