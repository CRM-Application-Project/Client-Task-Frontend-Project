import { DashboardLayout } from "@/components/layout/dashboard-layout";
import SuperAdminDashboard from "@/components/dashboard/SuperAdminDashboard";

export default function Home() {
  return (
    <DashboardLayout>
      <SuperAdminDashboard />
    </DashboardLayout>
  );
}
