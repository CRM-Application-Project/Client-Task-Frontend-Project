import React from "react";
import Leads from "./Leads";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

function page() {
  return (
    <DashboardLayout>
      <Leads />
    </DashboardLayout>
  );
}

export default page;
