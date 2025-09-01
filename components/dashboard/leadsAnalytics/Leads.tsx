import { useState, useEffect } from "react";
import KpiCard from "./KpiCard";
import LeadStatus from "./LeadStatusChart";
import LeadSourcesCard from "./LeadSourcesCard";
import StaffPerformance from "./StaffPerformance";
import DateRangePicker, { DateRange } from "@/components/ui/DateRangePicker";
import {
  fetchLeadsOverview,
  LeadOverviewResponse,
} from "@/app/services/data.service";
import { format } from "date-fns";

export default function Leads() {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
    endDate: new Date(),
  });
  const [data, setData] = useState<LeadOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const formattedStartDate = format(dateRange.startDate, "yyyy-MM-dd");
        const formattedEndDate = format(dateRange.endDate, "yyyy-MM-dd");

        const response = await fetchLeadsOverview(
          formattedStartDate,
          formattedEndDate
        );
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  const handleDateRangeChange = (newDateRange: DateRange) => {
    setDateRange(newDateRange);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Leads Overview
          </h2>
          <div className="w-full sm:w-64">
            <DateRangePicker
              initialRange={dateRange}
              onDateRangeChange={handleDateRangeChange}
            />
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Leads Overview
          </h2>
          <div className="w-full sm:w-64">
            <DateRangePicker
              initialRange={dateRange}
              onDateRangeChange={handleDateRangeChange}
            />
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Leads Overview
        </h2>
        <div className="w-full sm:w-64">
          <DateRangePicker
            initialRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
          />
        </div>
      </div>

      {/* KPI Section */}
      <KpiCard data={data?.data.leadAnalytics} />

      {/* Funnel & Sources */}
      <div className="grid gap-6 lg:grid-cols-2">
        <LeadStatus data={data?.data.leadStatusData} />
        <LeadSourcesCard data={data?.data.leadSourceData} />
      </div>

      {/* Staff Section */}
      <div className="grid gap-6">
        <StaffPerformance
          topPerformers={data?.data.topPerformerLeads}
          avgPerformers={data?.data.avgPerformerLeads}
          leastPerformers={data?.data.leastPerformerLeads}
        />
        {/* <DepartmentSnapshotsCard />
        <StaffStatusCard /> */}
      </div>
    </div>
  );
}
