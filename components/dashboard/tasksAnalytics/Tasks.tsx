import { useState, useEffect } from "react";
import KpisTasks from "./KpisTasks";
import TaskFlowTimelineCard from "./TaskFlowTimelineCard";
import TasksByStatusCard from "./TasksByStatusCard";
import TasksTopStaffCard from "./TasksTopStaffCard";
import StaffStatusCard from "./StaffStatusCard";
import DepartmentSnapshotsCard from "@/components/dashboard/leadsAnalytics/DepartmentSnapshotsCard";
import DateRangePicker, { DateRange } from "@/components/ui/DateRangePicker";
import { fetchTasksOverview, TaskOverviewResponse } from "@/app/services/data.service";

export default function Tasks() {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
    endDate: new Date(),
  });
  const [data, setData] = useState<TaskOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const formattedStartDate = dateRange.startDate.toISOString().split('T')[0];
        const formattedEndDate = dateRange.endDate.toISOString().split('T')[0];
        
        const response = await fetchTasksOverview(formattedStartDate, formattedEndDate);
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
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
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Tasks Overview</h2>
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
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Tasks Overview</h2>
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
          Tasks Overview
        </h2>
        <div className="w-full sm:w-64">
          <DateRangePicker
            initialRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
          />
        </div>
      </div>

      <KpisTasks data={data?.data.taskAnalytics} />

      {/* Full-width graph */}
      <div className="grid gap-6">
        <TaskFlowTimelineCard />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TasksByStatusCard data={data?.data.taskStatusGraphData} />
        <DepartmentSnapshotsCard />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TasksTopStaffCard 
          topPerformers={data?.data.topPerformerTasks}
          avgPerformers={data?.data.avgPerformerTasks}
          leastPerformers={data?.data.leastPerformerTasks}
        />
        <StaffStatusCard />
      </div>
    </div>
  );
}