"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { filterHistory, FilterHistoryParams, HistoryRecord } from "@/app/services/data.service";
import { TaskDetails } from "@/components/task/TaskDetails";
import { TaskHistory } from "@/components/task/TaskHistory";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = Number(params.taskId);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    fetchTaskHistory({ taskId, page: 0, limit: 50 });
  }, [taskId]);

  const fetchTaskHistory = async (filters: FilterHistoryParams) => {
    if (!filters.taskId) return;
   
    setIsLoadingHistory(true);
    try {
      const response = await filterHistory(filters);
     
      if (response.isSuccess && response.data) {
        setHistory(response.data.content);
      }
    } catch (error) {
      console.error("Error fetching task history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-2">
        {/* Back Button */}
        <button
          onClick={() => window.history.back()}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Task Board
        </button>

        {/* Side by Side Layout */}
        <div className="grid grid-cols-1  gap-3">
          {/* Left Side - Task Details */}
          <div className="space-y-3">
            <TaskDetails taskId={taskId} />
          </div>

          {/* Right Side - Activity Timeline */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border shadow-sm">
              <div className="p-6">
                <TaskHistory
                  history={history}
                  isLoading={isLoadingHistory}
                  taskId={taskId}
                  onFilterChange={fetchTaskHistory}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}