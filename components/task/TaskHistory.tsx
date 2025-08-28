"use client";
import { useState, useEffect } from "react";
import {
  History,
  RefreshCw,
  ArrowRight,
  Filter,
  X,
  Calendar,
  Tag,
  Search,
  User as UserIcon,
  ChevronDown,
  Check,
  CalendarDays,
  SortDesc,
  SortAsc,
  ChevronUp,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import {
  FilterHistoryParams,
  getHistoryEventsDropdown,
  getUsers,
  HistoryRecord,
  User,
} from "@/app/services/data.service";

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
  onFilterChange: (filters: FilterHistoryParams) => void;
}

interface EventTypeOption {
  value: string;
  label: string;
}

export function TaskHistory({
  history,
  isLoading,
  taskId,
  onFilterChange,
}: TaskHistoryProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterHistoryParams>({
    taskId,
    page: 0,
    limit: 50,
  });
  const [eventTypes, setEventTypes] = useState<EventTypeOption[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Record<number, boolean>>({});

  // Toggle note expansion
  const toggleNoteExpansion = (id: number) => {
    setExpandedNotes(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Fetch event types from API
  useEffect(() => {
    const fetchEventTypes = async () => {
      setIsLoadingEvents(true);
      try {
        const response = await getHistoryEventsDropdown();

        // Handle the API response format
        if (response?.isSuccess && response.data) {
          // Convert the object to an array of options
          const eventOptions = Object.entries(response.data).map(
            ([value, label]) => ({
              value,
              label: String(label),
            })
          );
          setEventTypes(eventOptions);
        } else {
          console.error("Unexpected API response format:", response);
          setEventTypes([]);
        }
      } catch (error) {
        console.error("Failed to fetch event types:", error);
        setEventTypes([]);
      } finally {
        setIsLoadingEvents(false);
      }
    };

    fetchEventTypes();
  }, []);

  // Fetch users from API
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const response = await getUsers();

        if (response?.isSuccess && response.data) {
          setUsers(response.data);
        } else {
          console.error("Unexpected API response format:", response);
          setUsers([]);
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
        setUsers([]);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  const formatTrackDate = (dateString: string) => {
    let date: Date;

    if (/^\d+$/.test(dateString)) {
      const timestamp = parseInt(dateString);
      date = new Date(timestamp > 9999999999 ? timestamp : timestamp * 1000);
    } else {
      date = new Date(dateString);
    }

    if (isNaN(date.getTime())) {
      return "Invalid date";
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) {
      return "Just now";
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      // Format as DD-MM-YYYY for older dates
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    }
  };

  const formatFieldValue = (fieldName: string, value: any) => {
    if (Array.isArray(value) && value.length >= 3) {
      const [year, month, day, hour, minute] = value;
      const date = new Date(year, month - 1, day, hour || 0, minute || 0);

      const formattedDay = date.getDate().toString().padStart(2, "0");
      const formattedMonth = (date.getMonth() + 1).toString().padStart(2, "0");
      const formattedYear = date.getFullYear();

      return `${formattedDay}-${formattedMonth}-${formattedYear}`;
    }

    if (
      typeof value === "string" &&
      (fieldName.toLowerCase().includes("date") ||
        fieldName.toLowerCase().includes("time")) &&
      /^\d+$/.test(value)
    ) {
      const timestamp = parseInt(value);
      const date = new Date(
        timestamp > 9999999999 ? timestamp : timestamp * 1000
      );
      if (!isNaN(date.getTime())) {
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      }
    }

    return String(value);
  };

  // Filter out specific fields from updateData
  const filterUpdateData = (updateData: UpdateData[]) => {
    const fieldsToExclude = [
      'gracehours', 
      'actualhours', 
      'estimatedhours',
      'graceHours',
      'actualHours', 
      'estimatedHours'
    ];
    
    return updateData.filter(update => 
      !fieldsToExclude.some(field => 
        update.fieldName.toLowerCase().includes(field.toLowerCase())
      )
    );
  };

  const handleRefresh = () => {
    console.log("Refreshing task history for task ID:", taskId);
    onFilterChange(filters);
  };

  const handleFilterChange = (key: keyof FilterHistoryParams, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const newFilters = { taskId, page: 0, limit: 50 };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const labelCls =
    "flex items-center gap-2 text-xs font-semibold text-gray-800 mb-2";
  const controlCls =
    "w-full h-10 px-3 text-xs border border-gray-300 rounded-lg bg-white " +
    "hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-400 " +
    "transition-all duration-200";
  const selectCls = controlCls + " appearance-none cursor-pointer pr-8";

  const hasActiveFilters = () => {
    const { taskId, page, limit, ...filterFields } = filters;
    return Object.values(filterFields).some(
      (value) => value !== undefined && value !== ""
    );
  };

  // Format date for API (add time component to make it LocalDateTime compatible)
  const formatDateForApi = (dateString: string) => {
    if (!dateString) return undefined;
    return `${dateString}T00:00:00`; // Add time component to make it LocalDateTime compatible
  };

  return (
    <div className="space-y-3">
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">
          Activity Timeline
        </h3>
        <div className="flex items-center gap-1">
          {hasActiveFilters() && (
            <button
              onClick={clearFilters}
              className="flex items-center text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center text-xs bg-white border border-gray-300 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
          >
            <Filter className="h-3 w-3 mr-1" />
            Filter
            {hasActiveFilters() && (
              <span className="ml-1 w-2 h-2 bg-blue-500 rounded-full"></span>
            )}
          </button>
          <button
            onClick={handleRefresh}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            title="Refresh history"
          >
            <RefreshCw
              className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Enhanced Filter Panel */}
      {showFilters && (
        <div className="bg-white p-4 rounded-lg border border-gray-300 shadow-sm">
          {/* Filter Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-blue-100 rounded">
                <Filter className="w-3 h-3 text-blue-600" />
              </div>
              <h4 className="text-xs font-semibold text-gray-800">Filter Options</h4>
            </div>
            {hasActiveFilters() && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 rounded border border-blue-200">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <span className="text-xs font-medium text-blue-700">
                  {Object.values(filters).filter(v => v !== undefined && v !== "" && v !== taskId && v !== 0 && v !== 50).length}
                </span>
              </div>
            )}
          </div>

          {/* Filter Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* User Filter */}
            <div className="space-y-2">
              <label className={labelCls}>
                <UserIcon className="w-3 h-3 text-gray-600" />
                Done By
              </label>
              <div className="relative">
                <select
                  value={filters.doneById || ""}
                  onChange={(e) =>
                    handleFilterChange("doneById", e.target.value || undefined)
                  }
                  disabled={isLoadingUsers}
                  className={selectCls}
                >
                  <option value="">All Users</option>
                  {users.map((u) => (
                    <option key={u.userId} value={u.userId}>
                      {u.firstName} {u.lastName}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                {isLoadingUsers && (
                  <div className="absolute right-6 top-1/2 transform -translate-y-1/2">
                    <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Event Type Filter */}
            <div className="space-y-2">
              <label className={labelCls}>
                <Tag className="w-3 h-3 text-gray-600" />
                Event Type
              </label>
              <div className="relative">
                <select
                  value={filters.eventTypes || ""}
                  onChange={(e) =>
                    handleFilterChange("eventTypes", e.target.value || undefined)
                  }
                  disabled={isLoadingEvents}
                  className={selectCls}
                >
                  <option value="">All Event Types</option>
                  {eventTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                {isLoadingEvents && (
                  <div className="absolute right-6 top-1/2 transform -translate-y-1/2">
                    <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Sort Direction */}
            <div className="space-y-2">
              <label className={labelCls}>
                {filters.sortDirection === "asc" ? (
                  <SortAsc className="w-3 h-3 text-gray-600" />
                ) : (
                  <SortDesc className="w-3 h-3 text-gray-600" />
                )}
                Sort Order
              </label>
              <div className="relative">
                <select
                  value={filters.sortDirection || "desc"}
                  onChange={(e) =>
                    handleFilterChange("sortDirection", e.target.value as "asc" | "desc")
                  }
                  className={selectCls}
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

       {/* Date Range Section */}
<div className="mt-4 pt-3 border-t border-gray-200">
  <div className="flex items-center gap-2 mb-3">
    <CalendarDays className="w-3 h-3 text-gray-600" />
    <h5 className="text-xs font-semibold text-gray-800">Date Range</h5>
  </div>
  
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    {/* Created After */}
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-700">
        From Date
      </label>
      <div className="relative">
        <input
          type="date"
          value={
            filters.createdAfter ? filters.createdAfter.split("T")[0] : ""
          }
          onChange={(e) => {
            const newFromDate = formatDateForApi(e.target.value);
            handleFilterChange("createdAfter", newFromDate);
            
            // If the current "to date" is before the new "from date", clear it
            if (filters.createdBefore && newFromDate && newFromDate > filters.createdBefore) {
              handleFilterChange("createdBefore", "");
            }
          }}
          className={controlCls + " pr-8"}
          placeholder="Select start date"
        />
        <Calendar className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
      </div>
    </div>

    {/* Created Before */}
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-700">
        To Date
      </label>
      <div className="relative">
        <input
          type="date"
          value={
            filters.createdBefore
              ? filters.createdBefore.split("T")[0]
              : ""
          }
          onChange={(e) => {
            const newToDate = formatDateForApi(e.target.value);
            
            // Only update if the new to date is after the from date (if from date exists)
            if (!filters.createdAfter || (newToDate && newToDate >= filters.createdAfter)) {
              handleFilterChange("createdBefore", newToDate);
            } else {
              // Optionally show an error message here
              console.error("To date must be after from date");
            }
          }}
          min={filters.createdAfter ? filters.createdAfter.split("T")[0] : undefined}
          className={controlCls + " pr-8"}
          placeholder="Select end date"
        />
        <Calendar className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
      </div>
    </div>
  </div>
</div>

          {/* Filter Actions */}
          {hasActiveFilters() && (
            <div className="mt-4 pt-3 border-t border-gray-200 flex justify-end">
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded transition-all duration-200"
              >
                <X className="w-3 h-3" />
                Clear All
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-4 text-xs text-gray-500">
          <RefreshCw className="h-3 w-3 animate-spin mr-1" />
          Loading activity...
        </div>
      )}

      {/* Empty */}
      {!isLoading && history.length === 0 && (
        <div className="text-center py-4 bg-white rounded border border-gray-300 p-4">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <History className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-xs text-gray-500">No activity yet</p>
          {hasActiveFilters() && (
            <p className="text-gray-400 text-xs mt-1">
              Try adjusting your filters
            </p>
          )}
        </div>
      )}

      {/* Activity Timeline */}
      {!isLoading && history.length > 0 && (
        <div className="max-h-[400px] overflow-y-auto">
          <div className="relative py-2">
            {/* vertical line spans the wrapper height, not the viewport */}
            <div className="pointer-events-none absolute left-4 inset-y-0 w-px bg-gray-300 z-0" />

            <div className="space-y-4 relative z-10">
              {history.map((record) => (
                <div
                  key={record.id}
                  className="relative flex items-start gap-3"
                >
                  {/* Timeline dot */}
                  <div className="flex-shrink-0 relative">
                    <div className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs font-medium">
                      {record.doneByName
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase() || "??"}
                    </div>
                  </div>

                  {/* Card */}
                  <div className="flex-1 bg-white border border-gray-300 rounded-lg p-3">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold text-gray-800">
                        {record.doneByName || "Unknown User"}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {formatTrackDate(record.createdAt)}
                      </span>
                    </div>

                    {/* Event Type */}
                    {record.eventType && (
                      <span className="inline-block mb-2 px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700 border border-gray-300">
                        {eventTypes.find((et) => et.value === record.eventType)
                          ?.label || record.eventType}
                      </span>
                    )}

                    {/* Note - Horizontal truncation */}
                    {record.note && (
                      <div className="mb-2">
                        <div className="flex items-center gap-1">
                          <p 
                            className={`text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-200 flex-1 ${
                              !expandedNotes[record.id] && record.note.length > 80 
                                ? 'truncate' 
                                : 'whitespace-normal break-words'
                            }`}
                            title={!expandedNotes[record.id] && record.note.length > 80 ? record.note : undefined}
                          >
                            {record.note}
                          </p>
                          {record.note.length > 80 && (
                            <button 
                              onClick={() => toggleNoteExpansion(record.id)}
                              className="text-xs text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                              title={expandedNotes[record.id] ? 'Show less' : 'Show more'}
                            >
                              {expandedNotes[record.id] ? (
                                <X className="h-3 w-3" />
                              ) : (
                                <MoreHorizontal className="h-3 w-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Update Details - Filter out specific fields */}
                 {record.updateData && record.updateData.length > 0 && (
  <div className="space-y-2 border-t pt-2 mt-2">
    {filterUpdateData(record.updateData).map(
      (update: UpdateData, updateIndex: number) => (
        <div
          key={updateIndex}
          className="text-xs text-gray-700"
        >
          <p className="font-medium text-gray-600">
            {update.fieldName}:
          </p>
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <span className="bg-gray-100 px-2 py-1 rounded text-gray-500 break-words max-w-xs">
              {formatFieldValue(
                update.fieldName,
                update.oldValue
              )}
            
            </span>
            <ArrowRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
           <span className="bg-blue-50 px-2 py-1 rounded border border-blue-100 text-blue-700 font-medium break-words max-w-xs">
  {formatFieldValue(update.fieldName, update.newValue)
    ?.replace(/_/g, " ")}
</span>

          </div>
        </div>
      )
    )}
  </div>
)}

                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}