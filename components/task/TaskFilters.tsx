"use client";
import { Search, Calendar, Plus, X, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "./DateRangePicker";
import { useState } from "react";
import { TaskFilters as TaskFiltersType, TaskPriority } from "../../lib/task";
import { TaskStage } from "@/lib/data";
import { User } from "@/app/services/data.service";

interface TaskFiltersProps {
  filters: {
    priority?: string;
    labels?: string[];
    createdBy?: string;
    assignedTo?: string;
    dateRange?: { from: Date; to: Date };
    stageIds?: string;
  };
  onFiltersChange: (filters: {
    priority?: string;
    labels?: string[];
    createdBy?: string;
    assignedTo?: string;
    dateRange?: { from: Date; to: Date };
    stageIds?: string;
  }) => void;
  onAddTask: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClearAllFilters: () => void;
  stages?: TaskStage[];
  users?: User[];
}

export const TaskFilters = ({ 
  filters, 
  onFiltersChange, 
  onAddTask, 
  searchQuery, 
  onSearchChange,
  onClearAllFilters,
  stages = [],
  users = []
}: TaskFiltersProps) => {
  const priorities: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const clearDateRange = () => {
    onFiltersChange({ ...filters, dateRange: undefined });
  };

  const handleDateRangeSelect = (range: { from: Date; to: Date }) => {
    onFiltersChange({ ...filters, dateRange: range });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm mb-6 border border-gray-200">
      {/* Top Row */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-4">
        {/* Date Range */}
        {filters.dateRange && (
          <div className="flex items-center bg-white px-3 py-1.5 rounded-md border border-gray-200 text-sm">
            <Calendar className="h-4 w-4 text-gray-500 mr-2" />
            <span className="text-gray-700">
              {filters.dateRange.from.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} - 
              {filters.dateRange.to.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <button 
              onClick={clearDateRange} 
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative w-64 ml-auto mr-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 rounded-lg border-gray-300 focus-visible:ring-2 focus-visible:ring-primary/50"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button 
            onClick={onAddTask} 
            className="bg-gray-900 text-white hover:bg-gray-800 rounded-lg shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setIsDatePickerOpen(true)}
            className="border-gray-300 rounded-lg"
          >
            <Calendar className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={filters.priority || "all"}
          onValueChange={(value) => 
            onFiltersChange({ 
              ...filters, 
              priority: value === "all" ? undefined : value as TaskPriority 
            })
          }
        >
          <SelectTrigger className="w-40 rounded-lg border-gray-300">
            <div className="flex items-center">
              <SelectValue placeholder="All Priority" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            {priorities.map(priority => (
              <SelectItem key={priority} value={priority}>
                {priority}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Stage Filter */}
        <Select
          value={filters.stageIds || "all"}
          onValueChange={(value) => 
            onFiltersChange({ 
              ...filters, 
              stageIds: value === "all" ? undefined : value
            })
          }
        >
          <SelectTrigger className="w-40 rounded-lg border-gray-300">
            <div className="flex items-center">
              <SelectValue placeholder="All Stages" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {stages.map(stage => (
              <SelectItem key={stage.id} value={stage.id.toString()}>
                {stage.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={Array.isArray(filters.labels) ? filters.labels[0] ?? "all" : filters.labels || "all"}
          onValueChange={(value) => 
            onFiltersChange({ 
              ...filters, 
              labels: value === "all" ? undefined : [value] 
            })
          }
        >
          <SelectTrigger className="w-40 rounded-lg border-gray-300">
            <div className="flex items-center">
              <SelectValue placeholder="All Labels" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Labels</SelectItem>
            <SelectItem value="Frontend">Frontend</SelectItem>
            <SelectItem value="Backend">Backend</SelectItem>
            <SelectItem value="Bug">Bug</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.createdBy || "all"}
          onValueChange={(value) => 
            onFiltersChange({ 
              ...filters, 
              createdBy: value === "all" ? undefined : value 
            })
          }
        >
          <SelectTrigger className="w-40 rounded-lg border-gray-300">
            <div className="flex items-center">
              <SelectValue placeholder="All Created By" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Created By</SelectItem>
            {users.map(user => (
              <SelectItem key={user.userId} value={user.userId}>
                {`${user.firstName} ${user.lastName}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.assignedTo || "all"}
          onValueChange={(value) => 
            onFiltersChange({ 
              ...filters, 
              assignedTo: value === "all" ? undefined : value 
            })
          }
        >
          <SelectTrigger className="w-40 rounded-lg border-gray-300">
            <div className="flex items-center">
              <SelectValue placeholder="All Assigned To" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assigned To</SelectItem>
            {users.map(user => (
              <SelectItem key={user.userId} value={user.userId}>
                {`${user.firstName} ${user.lastName}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button 
          onClick={onClearAllFilters}
          className="flex items-center text-sm text-gray-500 hover:text-gray-700 ml-2"
        >
          <X className="h-4 w-4 mr-1" />
          Clear all
        </button>
      </div>

      <DateRangePicker
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        onSelect={handleDateRangeSelect}
        initialRange={filters.dateRange}
      />
    </div>
  );
};