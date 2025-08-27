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
    "flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3";
  const controlCls =
    "w-full h-12 px-4 text-sm border border-gray-200 rounded-xl bg-white " +
    "hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 " +
    "transition-all duration-200 shadow-sm hover:shadow-md";
  const selectCls = controlCls + " appearance-none cursor-pointer";

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
    <div className="space-y-4">
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Activity Timeline
        </h3>
        <div className="flex items-center gap-2">
          {hasActiveFilters() && (
            <button
              onClick={clearFilters}
              className="flex items-center text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
            >
              <X className="h-4 w-4 mr-1" />
              Clear filters
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center text-sm bg-white border border-gray-300 hover:bg-gray-100 px-3 py-1.5 rounded-md transition-colors shadow-sm"
          >
            <Filter className="h-4 w-4 mr-1" />
            Filter
          </button>
          <button
            onClick={handleRefresh}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            title="Refresh history"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Enhanced Filter Panel */}
      {showFilters && (
        <div className="bg-gradient-to-br from-white to-gray-50/50 p-6 rounded-2xl border border-gray-200 shadow-lg backdrop-blur-sm">
          {/* Filter Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Filter className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Filter Options</h4>
                <p className="text-sm text-gray-500">Refine your activity timeline</p>
              </div>
            </div>
            {hasActiveFilters() && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-blue-700">
                  {Object.values(filters).filter(v => v !== undefined && v !== "" && v !== taskId && v !== 0 && v !== 50).length} active
                </span>
              </div>
            )}
          </div>

          {/* Filter Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* User Filter */}
            <div className="space-y-3">
              <label className={labelCls}>
                <div className="p-1.5 bg-purple-100 rounded-lg">
                  <UserIcon className="w-4 h-4 text-purple-600" />
                </div>
                Done By User
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
                <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                {isLoadingUsers && (
                  <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                    <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Event Type Filter */}
            <div className="space-y-3">
              <label className={labelCls}>
                <div className="p-1.5 bg-green-100 rounded-lg">
                  <Tag className="w-4 h-4 text-green-600" />
                </div>
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
                <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                {isLoadingEvents && (
                  <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                    <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Sort Direction */}
            <div className="space-y-3">
              <label className={labelCls}>
                <div className="p-1.5 bg-orange-100 rounded-lg">
                  {filters.sortDirection === "asc" ? (
                    <SortAsc className="w-4 h-4 text-orange-600" />
                  ) : (
                    <SortDesc className="w-4 h-4 text-orange-600" />
                  )}
                </div>
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
                <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Date Range Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <CalendarDays className="w-4 h-4 text-blue-600" />
              </div>
              <h5 className="text-sm font-semibold text-gray-800">Date Range</h5>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Created After */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">
                  From Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={
                      filters.createdAfter ? filters.createdAfter.split("T")[0] : ""
                    }
                    onChange={(e) =>
                      handleFilterChange(
                        "createdAfter",
                        formatDateForApi(e.target.value)
                      )
                    }
                    className={controlCls + " pr-12"}
                    placeholder="Select start date"
                  />
                  <Calendar className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Created Before */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">
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
                    onChange={(e) =>
                      handleFilterChange(
                        "createdBefore",
                        formatDateForApi(e.target.value)
                      )
                    }
                    className={controlCls + " pr-12"}
                    placeholder="Select end date"
                  />
                  <Calendar className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Filter Actions */}
          {hasActiveFilters() && (
            <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-200"
              >
                <X className="w-4 h-4" />
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-8 text-gray-500">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
          Loading activity...
        </div>
      )}

      {/* Empty */}
      {!isLoading && history.length === 0 && (
        <div className="text-center py-8 bg-white rounded-lg border border-gray-200 p-6">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <History className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm">No activity yet</p>
          {hasActiveFilters() && (
            <p className="text-gray-400 text-xs mt-1">
              Try adjusting your filters
            </p>
          )}
        </div>
      )}

      {/* Activity Timeline */}
      {!isLoading && history.length > 0 && (
        <div className="max-h-[600px] overflow-y-auto">
          {/* content wrapper grows to full list height */}
          <div className="relative py-4">
            {/* vertical line spans the wrapper height, not the viewport */}
            <div className="pointer-events-none absolute left-5 inset-y-0 w-px bg-gray-200 z-0" />

            <div className="space-y-6 relative z-10">
              {history.map((record) => (
                <div
                  key={record.id}
                  className="relative flex items-start gap-4"
                >
                  {/* Timeline dot */}
                  <div className="flex-shrink-0 relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 text-white flex items-center justify-center shadow-md">
                      {record.doneByName
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase() || "??"}
                    </div>
                  </div>

                  {/* Card */}
                  <div className="flex-1 bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-900">
                        {record.doneByName || "Unknown User"}
                      </h4>
                      <span className="text-xs font-medium px-2 py-0.5 bg-gray-100 rounded-md text-gray-500">
                        {formatTrackDate(record.createdAt)}
                      </span>
                    </div>

                    {/* Event Type */}
                    {record.eventType && (
                      <span className="inline-block mb-3 px-3 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 border border-blue-200">
                        {eventTypes.find((et) => et.value === record.eventType)
                          ?.label || record.eventType}
                      </span>
                    )}

                    {/* Note */}
                    {record.note && (
                      <p className="text-sm text-gray-700 mb-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                        {record.note}
                      </p>
                    )}

                    {/* Update Details */}
                    {record.updateData && record.updateData.length > 0 && (
                      <div className="space-y-2 border-t pt-3">
                        {record.updateData.map(
                          (update: UpdateData, updateIndex: number) => (
                            <div
                              key={updateIndex}
                              className="flex items-center gap-2 text-sm"
                            >
                              <span className="text-gray-600 font-medium">
                                {update.fieldName}:
                              </span>
                              <div className="flex items-center gap-2 bg-gray-100 px-2 py-1 rounded-md text-gray-500 line-through">
                                {formatFieldValue(
                                  update.fieldName,
                                  update.oldValue
                                )}
                              </div>
                              <ArrowRight className="h-4 w-4 text-gray-400" />
                              <div className="flex items-center gap-2 bg-blue-50 px-2 py-1 rounded-md border border-blue-100 text-blue-700 font-medium">
                                {formatFieldValue(
                                  update.fieldName,
                                  update.newValue
                                )}
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
