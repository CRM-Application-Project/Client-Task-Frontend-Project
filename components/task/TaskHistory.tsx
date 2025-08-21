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
    let date: Date;
    
    if (/^\d+$/.test(dateString)) {
      const timestamp = parseInt(dateString);
      date = new Date(timestamp > 9999999999 ? timestamp : timestamp * 1000);
    } else {
      date = new Date(dateString);
    }
    
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      // Format as DD-MM-YYYY for older dates
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    }
  };

  const formatFieldValue = (fieldName: string, value: any) => {
    if (Array.isArray(value) && value.length >= 3) {
      const [year, month, day, hour, minute] = value;
      const date = new Date(year, month - 1, day, hour || 0, minute || 0);
      
      const formattedDay = date.getDate().toString().padStart(2, '0');
      const formattedMonth = (date.getMonth() + 1).toString().padStart(2, '0');
      const formattedYear = date.getFullYear();
      
      return `${formattedDay}-${formattedMonth}-${formattedYear}`;
    }
    
    if (typeof value === 'string' && 
        (fieldName.toLowerCase().includes('date') || fieldName.toLowerCase().includes('time')) && 
        /^\d+$/.test(value)) {
      const timestamp = parseInt(value);
      const date = new Date(timestamp > 9999999999 ? timestamp : timestamp * 1000);
      if (!isNaN(date.getTime())) {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      }
    }
    
    return String(value);
  };

  const handleRefresh = () => {
    console.log("Refreshing task history for task ID:", taskId);
    window.location.reload();
  };

  return (
    <div className="space-y-4">
      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-8 text-gray-500">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
          Loading activity...
        </div>
      )}

      {/* Empty */}
      {!isLoading && history.length === 0 && (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <History className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm">No activity yet</p>
        </div>
      )}

      {/* Activity Timeline */}
      {!isLoading && history.length > 0 && (
        <div className="max-h-[600px] overflow-y-auto px-1 py-2 pb-11">
          <div className="space-y-3">
            {history.map((record, index) => (
              <div key={record.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {record.doneByName?.split(' ').map(n => n[0]).join('').toUpperCase() || '??'}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">
                          {record.doneByName}
                        </h4>
                       
                      </div>
                      <span className="text-xs text-gray-400">
                        {formatTrackDate(record.createdAt)}
                      </span>
                    </div>

                    {/* Activity Description */}
                    <p className="text-sm text-gray-700 mb-3">
                      {record.note}
                    </p>

                    {/* Update Details */}
                    {record.updateData && record.updateData.length > 0 && (
                      <div className="space-y-2">
                        {record.updateData.map((update: UpdateData, updateIndex: number) => (
                          <div key={updateIndex} className="flex items-center gap-2 text-sm">
                            <span className="text-gray-600 font-medium">{update.fieldName}:</span>
                            <div className="flex items-center gap-2 bg-gray-100 px-2 py-1 rounded">
                              <span className="text-gray-600">
                                {formatFieldValue(update.fieldName, update.oldValue)}
                              </span>
                            </div>
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                            <div className="flex items-center gap-2 bg-gray-100 px-2 py-1 rounded">
                              <span className="text-gray-600 font-medium">
                                {formatFieldValue(update.fieldName, update.newValue)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}