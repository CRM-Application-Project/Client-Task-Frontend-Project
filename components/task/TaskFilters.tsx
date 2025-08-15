"use client";
import { Search, Calendar, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TaskFilters as TaskFiltersType, TaskPriority } from "../../lib/task";
import { DateRangePicker } from "./DateRangePicker";
import { useState } from "react";

interface TaskFiltersProps {
  filters: TaskFiltersType;
  onFiltersChange: (filters: TaskFiltersType) => void;
  onAddTask: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const TaskFilters = ({ 
  filters, 
  onFiltersChange, 
  onAddTask, 
  searchQuery, 
  onSearchChange 
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
    <>
      <div className="bg-card p-6 rounded-lg shadow-sm border border-border/50 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
              <Select
                value={filters.priority || "all"}
                onValueChange={(value) => 
                  onFiltersChange({ 
                    ...filters, 
                    priority: value === "all" ? undefined : value as TaskPriority 
                  })
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Priority" />
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

              <Select
                value={filters.createdBy || "all"}
                onValueChange={(value) => 
                  onFiltersChange({ 
                    ...filters, 
                    createdBy: value === "all" ? undefined : value 
                  })
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Created By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Created By</SelectItem>
                  <SelectItem value="John Doe">John Doe</SelectItem>
                  <SelectItem value="Jane Smith">Jane Smith</SelectItem>
                  <SelectItem value="Mike Johnson">Mike Johnson</SelectItem>
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
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Assign To" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assign To</SelectItem>
                  <SelectItem value="John Doe">John Doe</SelectItem>
                  <SelectItem value="Jane Smith">Jane Smith</SelectItem>
                  <SelectItem value="Mike Johnson">Mike Johnson</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Range and Add Button */}
          <div className="flex items-center gap-3">
            {filters.dateRange && (
              <Badge variant="secondary" className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                {filters.dateRange.from.toLocaleDateString()} - {filters.dateRange.to.toLocaleDateString()}
                <button onClick={clearDateRange} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            <Button 
              variant="outline" 
              onClick={() => setIsDatePickerOpen(true)}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Date Range
            </Button>
            
            <Button onClick={onAddTask} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>
        </div>
      </div>

      <DateRangePicker
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        onSelect={handleDateRangeSelect}
        initialRange={filters.dateRange}
      />
    </>
  );
};