"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { filterHistory, FilterHistoryParams, HistoryRecord } from "@/app/services/data.service";
import { TaskDetails } from "@/components/task/TaskDetails";
import { TaskHistory } from "@/components/task/TaskHistory";


export default function TaskDetailPage() {
  const params = useParams();
  const taskId = Number(params.taskId);
  const [activeTab, setActiveTab] = useState<"details" | "history">("details");
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (activeTab === "history") {
      fetchTaskHistory();
    }
  }, [activeTab, taskId]);

  const fetchTaskHistory = async () => {
    if (!taskId) return;
    
    setIsLoadingHistory(true);
    try {
      const params: FilterHistoryParams = {
        taskId,
        page: 0,
        limit: 50
      };
      
      const response = await filterHistory(params);
      
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
    <div className="container mx-auto p-6">
      {/* Back Button */}
      <button
        onClick={() => window.history.back()}
        className="mb-6 flex items-center text-gray-600 hover:text-gray-800"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Task Board
      </button>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("details")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "details"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Task Details
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "history"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            History
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === "details" && <TaskDetails taskId={taskId} />}
      {activeTab === "history" && (
        <TaskHistory 
          history={history} 
          isLoading={isLoadingHistory} 
          taskId={taskId}
        />
      )}
    </div>
  );
}