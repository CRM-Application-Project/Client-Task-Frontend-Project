"use client";
import { Search, Settings, Grid, LayoutGrid, Calendar, Plus, X, UploadCloud, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeadFilters as LeadFiltersType, LeadPriority, LeadStatus, LeadSource } from "../../lib/leads";
import { useEffect, useState } from "react";
import { DateRangePicker } from "../task/DateRangePicker";
import { AssignDropdown, getAssignDropdown } from "@/app/services/data.service";

interface DateRange {
  from: Date;
  to: Date;
}

interface ExtendedLeadFilters extends LeadFiltersType {
  label?: string;
  assignedTo?: string;
  followUpDate?: string;
  dateRange?: DateRange;
}

interface LeadFiltersProps {
  filters: ExtendedLeadFilters;
  onFiltersChange: (filters: ExtendedLeadFilters) => void;
  onAddLead: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: 'kanban' | 'grid';
  onViewModeChange: (mode: 'kanban' | 'grid') => void;
  onClearAllFilters: () => void;
  onImportLead: () => void;
  onApplyFilters: () => void;
}

export const LeadFilters = ({
  filters,
  onFiltersChange,
  onAddLead,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onClearAllFilters,
  onImportLead,
  onApplyFilters,
}: LeadFiltersProps) => {
  const priorities: LeadPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  const statuses: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'DEMO', 'NEGOTIATIONS', 'CLOSED_WON', 'CLOSED_LOST'];
  const sources: LeadSource[] = ['WEBSITE', 'REFERRAL', 'SOCIAL_MEDIA', 'EMAIL', 'PHONE', 'EVENT', 'OTHER'];
  const labels = ["Important", "Cold", "Hot", "Warm"];
  const [assignees, setAssignees] = useState<AssignDropdown[]>([]);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const [localFilters, setLocalFilters] = useState<ExtendedLeadFilters>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  useEffect(() => {
    const fetchAssignees = async () => {
      setLoadingAssignees(true);
      try {
        const response = await getAssignDropdown();
        if (response.isSuccess && response.data) {
          setAssignees(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch assignees:", error);
      } finally {
        setLoadingAssignees(false);
      }
    };

    fetchAssignees();
  }, []);

  const clearDateRange = () => {
    const { dateRange, ...rest } = localFilters;
    setLocalFilters(rest);
  };

  const handleDateRangeSelect = (range: DateRange) => {
    setLocalFilters({ ...localFilters, dateRange: range });
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onApplyFilters();
  };

  const handleClear = () => {
    setLocalFilters({});
    onClearAllFilters();
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="flex flex-col gap-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex items-center gap-4">
          
            
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Leads</h1>
              <p className="text-gray-600 text-sm">{`Organize leads and track your team's work efficiently.`}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={onAddLead}
              className="bg-gray-800 hover:bg-gray-700 text-white rounded-md shadow-sm flex items-center px-3 py-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={onImportLead}
              className="border border-gray-300 bg-white hover:bg-gray-100 rounded-md"
            >
              <UploadCloud className="h-4 w-4 text-gray-600" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="border border-gray-300 bg-white hover:bg-gray-100 rounded-md"
            >
              <Settings className="h-4 w-4 text-gray-600" />
            </Button>
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('kanban')}
                className={`rounded-none ${viewMode === 'kanban' ? 'bg-gray-900 text-white' : 'text-gray-600'}`}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('grid')}
                className={`rounded-none ${viewMode === 'grid' ? 'bg-gray-900 text-white' : 'text-gray-600'}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
        </div>

        {/* Search and Date Range Section */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mt-[-15x]">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 rounded-lg border-gray-300 focus-visible:ring-2 focus-visible:ring-primary/50"
              />
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => setIsDatePickerOpen(true)}
              className="border-gray-300 rounded-lg flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              <span>Date Range</span>
            </Button>
          </div>

          {localFilters.dateRange && (
            <div className="flex items-center bg-gray-100 px-3 py-1.5 rounded-md text-sm">
              <Calendar className="h-4 w-4 text-gray-500 mr-2" />
              <span className="text-gray-700">
                {localFilters.dateRange.from.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} - 
                {localFilters.dateRange.to.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <button 
                onClick={clearDateRange} 
                className="ml-2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Priority Filter */}
          <Select
            value={localFilters.priority || "all"}
            onValueChange={(value) =>
              setLocalFilters({ ...localFilters, priority: value === "all" ? undefined : value as LeadPriority })
            }
          >
            <SelectTrigger className="w-40 rounded-lg border-gray-300">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              {priorities.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {priority}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={localFilters.status || "all"}
            onValueChange={(value) =>
              setLocalFilters({ ...localFilters, status: value === "all" ? undefined : value as LeadStatus })
            }
          >
            <SelectTrigger className="w-40 rounded-lg border-gray-300">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Labels Filter */}
          <Select
            value={localFilters.label || "all"}
            onValueChange={(value) =>
              setLocalFilters({ ...localFilters, label: value === "all" ? undefined : value })
            }
          >
            <SelectTrigger className="w-40 rounded-lg border-gray-300">
              <SelectValue placeholder="Labels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Labels</SelectItem>
              {labels.map((label) => (
                <SelectItem key={label} value={label}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sources Filter */}
          <Select
            value={localFilters.source || "all"}
            onValueChange={(value) =>
              setLocalFilters({ ...localFilters, source: value === "all" ? undefined : value as LeadSource })
            }
          >
            <SelectTrigger className="w-40 rounded-lg border-gray-300">
              <SelectValue placeholder="Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {sources.map((source) => (
                <SelectItem key={source} value={source}>
                  {source.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Assigned To Filter */}
          <Select
            value={localFilters.assignedTo || "all"}
            onValueChange={(value) =>
              setLocalFilters({ ...localFilters, assignedTo: value === "all" ? undefined : value })
            }
            disabled={loadingAssignees}
          >
            <SelectTrigger className="w-40 rounded-lg border-gray-300">
              <SelectValue placeholder={loadingAssignees ? "Loading..." : "Assigned To"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assigned To</SelectItem>
              {assignees.map((assignee) => (
                <SelectItem key={assignee.id} value={assignee.id}>
                  {assignee.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Action Buttons */}
          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              onClick={handleClear}
              className="border-gray-300 w-32"
            >
              Clear Filters
            </Button>
            <Button
              onClick={handleApply}
              className="bg-gray-800 hover:bg-gray-700 text-white w-32"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </div>

      <DateRangePicker
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        onSelect={handleDateRangeSelect}
        initialRange={localFilters.dateRange}
      />
    </div>
  );
};