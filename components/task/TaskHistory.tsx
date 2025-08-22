"use client";
import { useState, useEffect } from "react";
import { History, RefreshCw, ArrowRight, Filter, X } from "lucide-react";
import { filterHistory, FilterHistoryParams, getHistoryEventsDropdown, getUsers, HistoryRecord, User } from "@/app/services/data.service";



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

export function TaskHistory({ history, isLoading, taskId, onFilterChange }: TaskHistoryProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterHistoryParams>({
    taskId,
    page: 0,
    limit: 50
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
          const eventOptions = Object.entries(response.data).map(([value, label]) => ({
            value,
            label: String(label)
          }));
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

  const hasActiveFilters = () => {
    const { taskId, page, limit, ...filterFields } = filters;
    return Object.values(filterFields).some(value => value !== undefined && value !== '');
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
        <h3 className="text-lg font-semibold text-gray-900">Activity Timeline</h3>
        <div className="flex items-center gap-2">
          {hasActiveFilters() && (
            <button
              onClick={clearFilters}
              className="flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4 mr-1" />
              Clear filters
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md"
          >
            <Filter className="h-4 w-4 mr-1" />
            Filter
          </button>
          <button
            onClick={handleRefresh}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
            title="Refresh history"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Panel - Only this section has reduced font size and gray shades */}
      {showFilters && (
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Done By User Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Done By User
              </label>
              <select
                value={filters.doneById || ''}
                onChange={(e) => handleFilterChange('doneById', e.target.value || undefined)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-500"
                disabled={isLoadingUsers}
              >
                <option value="">All Users</option>
                {users.map((user) => (
                  <option key={user.userId} value={user.userId}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select>
            </div>

            {/* Event Type Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Event Type
              </label>
              <select
                value={filters.eventTypes || ''}
                onChange={(e) => handleFilterChange('eventTypes', e.target.value || undefined)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-500"
                disabled={isLoadingEvents}
              >
                <option value="">All Events</option>
                {eventTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Created After Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Created After
              </label>
              <input
                type="date"
                value={filters.createdAfter ? filters.createdAfter.split('T')[0] : ''}
                onChange={(e) => handleFilterChange('createdAfter', formatDateForApi(e.target.value))}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-500"
              />
            </div>

            {/* Created Before Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Created Before
              </label>
              <input
                type="date"
                value={filters.createdBefore ? filters.createdBefore.split('T')[0] : ''}
                onChange={(e) => handleFilterChange('createdBefore', formatDateForApi(e.target.value))}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-500"
              />
            </div>

            {/* Sort Direction Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Sort Direction
              </label>
              <select
                value={filters.sortDirection || 'DESC'}
                onChange={(e) => handleFilterChange('sortDirection', e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-500"
              >
                <option value="DESC">Newest First</option>
                <option value="ASC">Oldest First</option>
              </select>
            </div>
          </div>
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
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <History className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm">No activity yet</p>
          {hasActiveFilters() && (
            <p className="text-gray-400 text-xs mt-1">Try adjusting your filters</p>
          )}
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
                        <p className="text-sm text-gray-700 mb-1">
                      {record.note}
                    </p>
                      <span className="text-xs text-gray-400">
                        {formatTrackDate(record.createdAt)}
                      </span>
                    </div>

                    {/* Activity Description */}
                  

                    {/* Event Type Badge */}
                    {record.eventType && (
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mb-3">
                        {eventTypes.find(et => et.value === record.eventType)?.label || record.eventType}
                      </span>
                    )}

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