"use client";
import { Search, Settings, Grid, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeadFilters as LeadFiltersType, LeadPriority, LeadStatus, LeadSource } from "../../lib/leads";
import Link from "next/link";

interface LeadFiltersProps {
  filters: LeadFiltersType;
  onFiltersChange: (filters: LeadFiltersType) => void;
  onAddLead: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: 'kanban' | 'grid';
  onViewModeChange: (mode: 'kanban' | 'grid') => void;
}

export const LeadFilters = ({
  filters,
  onFiltersChange,
  onAddLead,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange
}: LeadFiltersProps) => {
  const priorities: LeadPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  const statuses: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'DEMO', 'NEGOTIATIONS', 'CLOSED_WON', 'CLOSED_LOST'];
  const sources: LeadSource[] = ['WEBSITE', 'REFERRAL', 'SOCIAL_MEDIA', 'EMAIL', 'PHONE', 'EVENT', 'OTHER'];

  return (
    <div className="space-y-4 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Leads</h1>
          <p className="text-gray-600">Organize leads and track your team's work efficiently.</p>
        </div>
        
        <div className="flex items-center gap-3">
        
          <Button
            onClick={onAddLead}
            className="bg-black text-white hover:bg-gray-800 rounded-lg px-6"
          >
            + Add Lead
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            className="border-gray-300 hover:bg-gray-50"
          >
            <Settings className="h-4 w-4" />
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

      {/* Filters Bar */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 border-gray-300 rounded-lg"
          />
        </div>

        {/* Priority Filter */}
        <Select
          value={filters.priority || "all"}
          onValueChange={(value) => 
            onFiltersChange({ ...filters, priority: value === "all" ? undefined : value as LeadPriority })
          }
        >
          <SelectTrigger className="w-32 border-gray-300 rounded-lg">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {priorities.map((priority) => (
              <SelectItem key={priority} value={priority}>
                {priority}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={filters.status || "all"}
          onValueChange={(value) => 
            onFiltersChange({ ...filters, status: value === "all" ? undefined : value as LeadStatus })
          }
        >
          <SelectTrigger className="w-32 border-gray-300 rounded-lg">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Source Filter */}
        <Select
          value={filters.source || "all"}
          onValueChange={(value) => 
            onFiltersChange({ ...filters, source: value === "all" ? undefined : value as LeadSource })
          }
        >
          <SelectTrigger className="w-32 border-gray-300 rounded-lg">
            <SelectValue placeholder="Source" />
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
          value={filters.assignedTo || "all"}
          onValueChange={(value) => 
            onFiltersChange({ ...filters, assignedTo: value === "all" ? undefined : value })
          }
        >
          <SelectTrigger className="w-36 border-gray-300 rounded-lg">
            <SelectValue placeholder="Assigned To" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignees</SelectItem>
            <SelectItem value="John Smith">John Smith</SelectItem>
            <SelectItem value="Jane Doe">Jane Doe</SelectItem>
            <SelectItem value="Mike Johnson">Mike Johnson</SelectItem>
            <SelectItem value="Sarah Wilson">Sarah Wilson</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};