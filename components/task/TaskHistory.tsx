"use client";
import { History, RefreshCw, ArrowRight } from "lucide-react";
import { filterHistory, FilterHistoryParams, HistoryRecord } from "@/app/services/data.service";

// Define interfaces locally since the import is failing
interface UpdateData {
  fieldName: string;
  oldValue: string;
  newValue: string;
}

interface TaskHistoryProps {
  history: HistoryRecord[];
  isLoading: boolean;
  taskId: number;
}

export function TaskHistory({ history, isLoading, taskId }: TaskHistoryProps) {
  const formatTrackDate = (dateString: string) => {
    // Handle both timestamp and ISO date formats
    let date: Date;
    
    // Check if it's a timestamp (all numbers)
    if (/^\d+$/.test(dateString)) {
      // Convert timestamp to date
      const timestamp = parseInt(dateString);
      // Handle both seconds and milliseconds timestamps
      date = new Date(timestamp > 9999999999 ? timestamp : timestamp * 1000);
    } else {
      // Handle ISO date string
      date = new Date(dateString);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    // Show relative time for recent events
    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      // For older dates, show formatted date
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

const formatFieldValue = (fieldName: string, value: any) => {
  // Handle array date format [year, month, day, hour, minute]
  if (Array.isArray(value) && value.length >= 3) {
    const [year, month, day, hour, minute] = value;
    const date = new Date(year, month - 1, day, hour || 0, minute || 0); // month is 0-indexed in JS
    
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      ...(hour !== undefined && {
        hour: '2-digit',
        minute: '2-digit'
      })
    }).replace(/\//g, '-'); // Replace slashes with dashes for DD-MM-YYYY format
  }
  
  // Handle timestamp fields (string timestamps)
  if (typeof value === 'string' && 
      (fieldName.toLowerCase().includes('date') || fieldName.toLowerCase().includes('time')) && 
      /^\d+$/.test(value)) {
    const timestamp = parseInt(value);
    const date = new Date(timestamp > 9999999999 ? timestamp : timestamp * 1000);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).replace(/\//g, '-');
    }
  }
  
  // For other values, convert to string
  return String(value);
};
  const handleRefresh = () => {
    // Replace with your actual refresh function
    console.log("Refreshing task history for task ID:", taskId);
    window.location.reload();
  };

  return (
    <div className="bg-white/70 backdrop-blur border rounded-xl p-6 shadow-md">
      <div className="space-y-5">
        {/* Header */}
        <h3 className="font-semibold text-gray-900 text-base tracking-tight flex items-center gap-2">
          <History className="h-5 w-5 text-blue-600" />
          Task History
          <button
            onClick={handleRefresh}
            className="ml-auto p-2 rounded-full hover:bg-blue-50 text-blue-600 transition"
            title="Sync history"
          >
            <RefreshCw className="h-4 w-4 hover:animate-spin" />
          </button>
        </h3>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-10 text-gray-500 animate-pulse">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading task history...
          </div>
        )}

        {/* Empty */}
        {!isLoading && history.length === 0 && (
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center">
            <p className="text-gray-500 text-sm">
              ✨ No task history yet
            </p>
          </div>
        )}

        {/* Timeline */}
        {!isLoading && history.length > 0 && (
          <div className="space-y-6 max-h-[calc(120vh-200px)] overflow-y-auto pr-2">
            {history.map((record, index) => (
              <div
                key={record.id}
                className="grid grid-cols-[40px_1fr] gap-4 items-start"
              >
                {/* Timeline column */}
                <div className="flex flex-col items-center relative">
                  {/* Circle */}
                  <div className="h-4 w-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 shadow-md border-2 border-white z-10" />
                  {/* Line (except last item) */}
                  {index !== history.length - 1 && (
                    <div className="flex-1 w-px bg-gradient-to-b from-blue-400 to-purple-400 min-h-[60px]" />
                  )}
                </div>

                {/* Card column */}
                <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs">
                        {record.doneByName?.charAt(0) ?? "?"}
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {record.doneByName}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                      {formatTrackDate(record.createdAt)}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">
                    {record.note}
                  </p>

                  {record.updateData && record.updateData.length > 0 && (
                    <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                      <div className="flex items-center gap-1 text-xs text-blue-500 font-medium mb-2">
                        <ArrowRight className="h-3 w-3" />
                        Changes made
                      </div>
                      {record.updateData.map((update: UpdateData, updateIndex: number) => (
                        <div key={updateIndex} className="text-sm text-gray-600 mb-1 last:mb-0">
                          <span className="font-medium">{update.fieldName}:</span>{" "}
                          <span className="line-through text-red-500">
                            {formatFieldValue(update.fieldName, update.oldValue)}
                          </span> →{" "}
                          <span className="text-green-600">
                            {formatFieldValue(update.fieldName, update.newValue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}