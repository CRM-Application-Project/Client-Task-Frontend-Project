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
  onApplyFilters: () => void; // New prop for applying filters
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
  onApplyFilters, // New prop
}: LeadFiltersProps) => {
  const priorities: LeadPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  const statuses: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'DEMO', 'NEGOTIATIONS', 'CLOSED_WON', 'CLOSED_LOST'];
  const sources: LeadSource[] = ['WEBSITE', 'REFERRAL', 'SOCIAL_MEDIA', 'EMAIL', 'PHONE', 'EVENT', 'OTHER'];
  const labels = ["Important", "Cold", "Hot", "Warm"];
  const [assignees, setAssignees] = useState<AssignDropdown[]>([]);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const [localFilters, setLocalFilters] = useState<ExtendedLeadFilters>(filters); // Local state for filters

  // Initialize local filters when props change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Fetch assignees from API
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
    // Update the parent filters state which will trigger the API call
    onFiltersChange(localFilters);
    // Call the apply filters function
    onApplyFilters();
  };

  const handleClear = () => {
    // Reset local filters
    setLocalFilters({});
    // Call parent clear function
    onClearAllFilters();
  };

  return (
    <div className="rounded-lg shadow-sm mb-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Leads</h1>
          <p className="text-gray-600">{`Organize leads and track your team's work efficiently.`}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {/* Add Lead Button */}
            <Button
              onClick={onAddLead}
              className="bg-gray-800 hover:bg-gray-700 text-white rounded-md shadow-sm flex items-center px-3 py-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>

            {/* Icon Buttons */}
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
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('grid')}
                className={`rounded-none ${viewMode === 'grid' ? 'bg-gray-900 text-white' : 'text-gray-600'}`}
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6 border border-gray-200">
        <div className="flex justify-end gap-4 p-3">
          {localFilters.dateRange && (
            <div className="flex items-center bg-white px-3 py-1.5 rounded-md text-sm mr-5">
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
          
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 rounded-lg border-gray-300 focus-visible:ring-2 focus-visible:ring-primary/50"
            />
          </div>
          
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by follow-up date..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 rounded-lg border-gray-300 focus-visible:ring-2 focus-visible:ring-primary/50"
            />
          </div>
          
          <div>
            <Button 
              variant="outline" 
              onClick={() => setIsDatePickerOpen(true)}
              className="border-gray-300 rounded-lg"
            >
              <Calendar className="h-4 w-4" />
            </Button>
          </div>
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
            <SelectTrigger className="w-52 rounded-lg border-gray-300">
              <SelectValue placeholder="All Priority" />
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
            <SelectTrigger className="w-52 rounded-lg border-gray-300">
              <SelectValue placeholder="All Status" />
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
            <SelectTrigger className="w-52 rounded-lg border-gray-300">
              <SelectValue placeholder="All Labels" />
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
            <SelectTrigger className="w-52 rounded-lg border-gray-300">
              <SelectValue placeholder="All Sources" />
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
            <SelectTrigger className="w-52 rounded-lg border-gray-300">
              <SelectValue placeholder={loadingAssignees ? "Loading..." : "All Assigned To"} />
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
              className="border-gray-300"
            >
              Clear Filters
            </Button>
            <Button
              onClick={handleApply}
              className="bg-gray-800 hover:bg-gray-700 text-white"
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