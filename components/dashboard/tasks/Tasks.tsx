import KpisTasks from "./KpisTasks";
import TaskFlowTimelineCard from "./TaskFlowTimelineCard";
import TasksByStatusCard from "./TasksByStatusCard";
import TasksTopStaffCard from "./TasksTopStaffCard";
import StaffStatusCard from "./StaffStatusCard";
import DepartmentSnapshotsCard from "@/components/dashboard/leads/DepartmentSnapshotsCard";

export default function Tasks() {
  return (
    <div className="space-y-6">
      <KpisTasks />

      {/* Full-width graph */}
      <div className="grid gap-6">
        <TaskFlowTimelineCard />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TasksByStatusCard />
        <DepartmentSnapshotsCard />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TasksTopStaffCard />
        <StaffStatusCard />
      </div>
    </div>
  );
}
