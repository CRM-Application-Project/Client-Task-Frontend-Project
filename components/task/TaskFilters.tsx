"use client";
import {
  Search,
  Calendar,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Settings,
  Grid,
  LayoutGrid,
  UploadCloud,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "./DateRangePicker";
import { useState, useEffect } from "react";
import { TaskPriority } from "../../lib/task";
import { TaskStage } from "@/lib/data";
import { User } from "@/app/services/data.service";
import { usePermissions } from "@/hooks/usePermissions";

interface ExtendedTaskFilters {
  priority?: string;
  labels?: string[];
  createdBy?: string;
  assignedTo?: string;
  dateRange?: { from: Date; to: Date };
  stageIds?: string;
}

interface TaskFiltersProps {
  filters: ExtendedTaskFilters;
  onFiltersChange: (filters: ExtendedTaskFilters) => void;
  onAddTask: () => void;
  onAddStage?: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClearAllFilters: () => void;
  onApplyFilters: () => void;
  viewMode: "kanban" | "grid";
  onViewModeChange: (mode: "kanban" | "grid") => void;
  stages?: TaskStage[];
  users?: User[];
  onImportTask?: () => void;
}

export const TaskFilters = ({
  filters,
  onFiltersChange,
  onAddTask,
  onAddStage,
  searchQuery,
  onSearchChange,
  onClearAllFilters,
  onApplyFilters,
  viewMode,
  onViewModeChange,
  stages = [],
  users = [],
  onImportTask,
}: TaskFiltersProps) => {
  const priorities: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);
const { permissions: stagePermissions, loading: stagePermissionsLoading } = usePermissions("task_stage");
const { permissions: taskPermissions, loading: taskPermissionsLoading } = usePermissions("task");
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const clearDateRange = () => {
    const updatedFilters = { ...localFilters, dateRange: undefined };
    setLocalFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const handleDateRangeSelect = (range: { from: Date; to: Date }) => {
    const updatedFilters = { ...localFilters, dateRange: range };
    setLocalFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const handleFilterChange = (key: string, value: any) => {
    const updatedFilters = { ...localFilters, [key]: value };
    setLocalFilters(updatedFilters);
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    onApplyFilters();
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      priority: undefined,
      labels: undefined,
      createdBy: undefined,
      assignedTo: undefined,
      dateRange: undefined,
      stageIds: undefined,
    };
    setLocalFilters(clearedFilters);
    onClearAllFilters();
  };

  const formatDateRange = (range: { from: Date; to: Date }) => {
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
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Tasks</h1>
              <p className="text-gray-600 text-sm">
                {`Organize tasks and track your team's work efficiently.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Add Stage Button */}
           {stagePermissions.canCreate && (
  <>
    {onAddStage && (
      <Button
        onClick={onAddStage}
        variant="outline"
        className="border-gray-300 text-gray-700 rounded-md shadow-sm flex items-center px-3 py-2"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Stage
      </Button>
    )}
  </>
)}

            {/* Add Task Button */}
            {taskPermissions.canCreate && (
  <>
   
       <Button
              onClick={onAddTask}
              className="bg-gray-800 hover:bg-gray-700 text-white rounded-md shadow-sm flex items-center px-3 py-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
    
  </>
)}

            {/* Import Task Button */}
            {onImportTask && (
              <Button
                variant="outline"
                size="icon"
                onClick={onImportTask}
                className="border border-gray-300 bg-white hover:bg-gray-100 rounded-md"
              >
                <UploadCloud className="h-4 w-4 text-gray-600" />
              </Button>
            )}

            {/* View Mode Toggle */}
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
            {/* Search - Moved to the left */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search tasks..."
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
                <span className="flex items-center gap-2 text-[#636363]">
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

            {/* Priority Filter */}
            <Select
              value={localFilters.priority || "all"}
              onValueChange={(value) =>
                handleFilterChange(
                  "priority",
                  value === "all" ? undefined : value
                )
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

            {/* Stage Filter */}
            <Select
              value={localFilters.stageIds || "all"}
              onValueChange={(value) =>
                handleFilterChange(
                  "stageIds",
                  value === "all" ? undefined : value
                )
              }
            >
              <SelectTrigger className="w-full rounded-lg border-gray-300">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id.toString()}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Created By Filter */}
            <Select
              value={localFilters.createdBy || "all"}
              onValueChange={(value) =>
                handleFilterChange(
                  "createdBy",
                  value === "all" ? undefined : value
                )
              }
            >
              <SelectTrigger className="w-full rounded-lg border-gray-300">
                <SelectValue placeholder="Created By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Created By</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.userId} value={user.userId}>
                    {`${user.firstName} ${user.lastName}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Assigned To Filter */}
            <Select
              value={localFilters.assignedTo || "all"}
              onValueChange={(value) =>
                handleFilterChange(
                  "assignedTo",
                  value === "all" ? undefined : value
                )
              }
            >
              <SelectTrigger className="w-full rounded-lg border-gray-300">
                <SelectValue placeholder="Assigned To" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assigned To</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.userId} value={user.userId}>
                    {`${user.firstName} ${user.lastName}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Action Buttons */}
            <Button
              onClick={handleApplyFilters}
              className="bg-gray-800 hover:bg-gray-700 text-white w-full"
            >
              Apply Filters
            </Button>

            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="border-gray-300 w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Expand/Collapse Button */}
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
