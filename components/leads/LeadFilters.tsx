"use client";
import {
  Search,
  Settings,
  Grid,
  LayoutGrid,
  Calendar,
  Plus,
  X,
  UploadCloud,
  ChevronDown,
  ChevronUp,
  SortAsc,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LeadFilters as LeadFiltersType,
  LeadPriority,
  LeadStatus,
  LeadSource,
} from "../../lib/leads";
import { useEffect, useState } from "react";
import { DateRangePicker } from "../task/DateRangePicker";
import { AssignDropdown, getAssignDropdown } from "@/app/services/data.service";
import { usePermissions } from "@/hooks/usePermissions";
import { LeadStage } from "@/lib/data";

interface DateRange {
  from: Date;
  to: Date;
}

interface ExtendedLeadFilters extends LeadFiltersType {
    status?: LeadStatus;
  label?: string;
  assignedTo?: string;
  followUpDate?: string;
  dateRange?: DateRange;
}

interface LeadFiltersProps {
  filters: ExtendedLeadFilters;
  onFiltersChange: (filters: ExtendedLeadFilters) => void;
  onAddLead: () => void;
  onAddStage: () => void; // Added this prop
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: "kanban" | "grid";
  onViewModeChange: (mode: "kanban" | "grid") => void;
  onClearAllFilters: () => void;
  onImportLead: () => void;
  onApplyFilters: () => void;
  onSortLeads: () => void;
    leadStages: LeadStage[]; 

}

export const LeadFilters = ({
  filters,
  onFiltersChange,
  onAddLead,
  onAddStage, // Added this prop
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onClearAllFilters,
  onImportLead,
  onApplyFilters,
  onSortLeads,
}: LeadFiltersProps) => {
  const priorities: LeadPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
  const statuses: LeadStatus[] = [
    "NEW",
    "CONTACTED",
    "QUALIFIED",
    "PROPOSAL",
    "DEMO",
    "NEGOTIATIONS",
    "CLOSED_WON",
    "CLOSED_LOST",
  ];
  const sources: LeadSource[] = [
    "WEBSITE",
    "REFERRAL",
    "SOCIAL_MEDIA",
    "EMAIL",
    "PHONE",
    "EVENT",
    "OTHER",
  ];
  const labels = ["Important", "Cold", "Hot", "Warm"];
  const [assignees, setAssignees] = useState<AssignDropdown[]>([]);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const [localFilters, setLocalFilters] =
    useState<ExtendedLeadFilters>(filters);
  const [isExpanded, setIsExpanded] = useState(false);
  const { permissions, loading: permissionsLoading } = usePermissions("lead");

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
    setIsDatePickerOpen(false);
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onApplyFilters();
  };

  const handleClear = () => {
    setLocalFilters({});
    onClearAllFilters();
  };

  const formatDateRange = (range: DateRange) => {
    return `${range.from.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} - ${range.to.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })}`;
  };

  return (
    <div className="relative bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
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
            {permissions.canCreate && !permissionsLoading && (
              <Button
                onClick={onAddStage}
                variant="outline"
                className="border-gray-300 text-gray-700 rounded-md shadow-sm flex items-center px-3 py-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Stage
              </Button>
            )}
            {permissions.canCreate && !permissionsLoading && (
              <Button
                onClick={onAddLead}
                className="bg-gray-800 hover:bg-gray-700 text-white rounded-md shadow-sm flex items-center px-3 py-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Lead
              </Button>
            )}

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
              onClick={onSortLeads}
              className="border border-gray-300 bg-white hover:bg-gray-100 rounded-md"
              title="Sort Leads"
            >
              <SortAsc className="h-4 w-4 text-gray-600" />
            </Button>
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <Button
                variant={viewMode === "kanban" ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewModeChange("kanban")}
                className={`rounded-none ${
                  viewMode === "kanban"
                    ? "bg-gray-900 text-white"
                    : "text-gray-600"
                }`}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewModeChange("grid")}
                className={`rounded-none ${
                  viewMode === "grid"
                    ? "bg-gray-900 text-white"
                    : "text-gray-600"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div
          className={`transition-all duration-500 ${
            isExpanded
              ? "max-h-[1000px] opacity-100 overflow-visible"
              : "max-h-0 opacity-0 overflow-hidden"
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end w-full">
            {/* Search */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 rounded-lg border-gray-300 focus-visible:ring-2 focus-visible:ring-primary/50"
              />
            </div>

            {/* Date Range */}
            <div className="relative w-full">
              <Button
                variant={localFilters.dateRange ? "secondary" : "outline"}
                onClick={() => setIsDatePickerOpen(true)}
                className={`w-full rounded-lg flex items-center justify-between gap-2 ${
                  localFilters.dateRange
                    ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                    : "border-gray-300"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {localFilters.dateRange
                    ? formatDateRange(localFilters.dateRange)
                    : "Date Range"}
                </span>
                {localFilters.dateRange && (
                  <X
                    className="h-4 w-4 hover:text-blue-900"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearDateRange();
                    }}
                  />
                )}
              </Button>

              <DateRangePicker
                isOpen={isDatePickerOpen}
                onClose={() => setIsDatePickerOpen(false)}
                onSelect={handleDateRangeSelect}
                initialRange={localFilters.dateRange}
              />
            </div>

            {/* Priority */}
            <Select
              value={localFilters.priority || "all"}
              onValueChange={(value) =>
                setLocalFilters({
                  ...localFilters,
                  priority:
                    value === "all" ? undefined : (value as LeadPriority),
                })
              }
            >
              <SelectTrigger className="w-full rounded-lg border-gray-300">
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

            {/* Status */}
            <Select
              value={localFilters.status || "all"}
              onValueChange={(value) =>
                setLocalFilters({
                  ...localFilters,
                  status: value === "all" ? undefined : (value as LeadStatus),
                })
              }
            >
              <SelectTrigger className="w-full rounded-lg border-gray-300">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Labels */}
            <Select
              value={localFilters.label || "all"}
              onValueChange={(value) =>
                setLocalFilters({
                  ...localFilters,
                  label: value === "all" ? undefined : value,
                })
              }
            >
              <SelectTrigger className="w-full rounded-lg border-gray-300">
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

            {/* Sources */}
            <Select
              value={localFilters.source || "all"}
              onValueChange={(value) =>
                setLocalFilters({
                  ...localFilters,
                  source: value === "all" ? undefined : (value as LeadSource),
                })
              }
            >
              <SelectTrigger className="w-full rounded-lg border-gray-300">
                <SelectValue placeholder="Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {sources.map((source) => (
                  <SelectItem key={source} value={source}>
                    {source.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Assigned To */}
            <Select
              value={localFilters.assignedTo || "all"}
              onValueChange={(value) =>
                setLocalFilters({
                  ...localFilters,
                  assignedTo: value === "all" ? undefined : value,
                })
              }
              disabled={loadingAssignees}
            >
              <SelectTrigger className="w-full rounded-lg border-gray-300">
                <SelectValue
                  placeholder={loadingAssignees ? "Loading..." : "Assigned To"}
                />
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
            <Button
              onClick={handleApply}
              className="bg-gray-800 hover:bg-gray-700 text-white w-full"
            >
              Apply Filters
            </Button>
            <Button
              variant="outline"
              onClick={handleClear}
              className="border-gray-300 w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -bottom-6 left-1/2 -translate-x-1/2 
               w-12 h-12 rounded-full bg-white flex items-center justify-center border-b-2 border-gray-300 shadow-md transition-colors"
      >
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-700 mt-2" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-700 mt-2" />
        )}
      </button>
    </div>
  );
};