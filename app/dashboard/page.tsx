import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { DashboardContent } from '@/components/dashboard/dashboard-content';

export default function Home() {
  return (
    <DashboardLayout>
      <DashboardContent />
    </DashboardLayout>
  );
}