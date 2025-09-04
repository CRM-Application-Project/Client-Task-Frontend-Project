import React from "react";
import {
  Edit,
  Trash2,
  Eye,
  Phone,
  MoreVertical,
  UserPlus,
  Calendar,
  Upload,
  ArrowUpDown,
  RefreshCw,
  MapPin,
  Building2,
  Mail,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AssignDropdown } from "@/app/services/data.service";
import { usePermissions } from "@/hooks/usePermissions";
import Link from "next/link";
import { LeadPriority } from "../../lib/leads";

interface LeadCardProps {
  lead: Lead;
  assignees: AssignDropdown[]; // Add assignees prop
  onEdit?: (lead: Lead) => void;
  onDelete?: (lead: Lead) => void;
  onView?: (lead: Lead) => void;
  onAddFollowUp?: (lead: Lead) => void;
  onChangeAssign?: (lead: Lead) => void;
  onImportLead?: () => void;
  onLeadSorting?: () => void;
  onChangeStatus?: (lead: Lead) => void;
  stage?: {
    leadStageId: string;
    leadStageName: string;
    leadStageDescription?: string;
    leadStagePriority: number;
    finalStage: boolean;
  };
}

export const LeadCard = ({
  lead,
  assignees, // Use assignees from props
  onEdit,
  onDelete,
  onView,
  onAddFollowUp,
  onChangeAssign,
  onImportLead,
  onLeadSorting,
  onChangeStatus,
  stage,
}: LeadCardProps) => {
  const getInitials = (name?: string | null) => {
    if (!name || typeof name !== "string" || name.trim() === "") {
      return "N/A";
    }
    return name
      .trim()
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const { permissions, loading: permissionsLoading } = usePermissions("lead");

  // Priority colors mapping
  const priorityColors: Record<LeadPriority, string> = {
    LOW: "bg-muted text-muted-foreground",
    MEDIUM: "bg-status-todo/20 text-status-todo",
    HIGH: "bg-status-progress/20 text-status-progress",
    URGENT: "bg-destructive/20 text-destructive",
  } as const;

  // Check if current stage is final stage
  const isFinalStage = stage?.finalStage || false;
  const isClosedStage = lead.leadStatus?.toLowerCase().includes('closed') || 
                       lead.leadStatus?.toLowerCase().includes('clos');

  const getAssigneeName = () => {
    if (lead.assignedToName) {
      return lead.assignedToName;
    }

    // Fall back to leadAssignedTo if available
    if (lead.leadAssignedTo) {
      return lead.leadAssignedTo;
    }

    // Finally, try to resolve from assignees
    if (lead.leadAddedBy && assignees.length > 0) {
      const assignee = assignees.find((a) => a.id === lead.leadAddedBy);
      return assignee?.label || lead.leadAddedBy;
    }

    return "Unassigned";
  };

  // Resolve assignee avatar - use leadAddedBy if leadAssignedTo is not available
  const getAssigneeAvatar = () => {
    // First check if we have leadAssignedTo
    if (lead.leadAssignedTo) {
      // If it's a UUID, try to resolve it from assignees
      if (isUUID(lead.leadAssignedTo) && assignees.length > 0) {
        const assignee = assignees.find((a) => a.id === lead.leadAssignedTo);
        return assignee?.label || lead.leadAssignedTo;
      }
      return lead.leadAssignedTo;
    }

    // If leadAssignedTo is not available, use leadAddedBy
    if (lead.leadAddedBy) {
      // If leadAddedBy looks like a UUID, try to resolve it
      if (isUUID(lead.leadAddedBy) && assignees.length > 0) {
        const assignee = assignees.find((a) => a.id === lead.leadAddedBy);
        return assignee?.label || lead.leadAddedBy;
      }
      return lead.leadAddedBy;
    }

    return "";
  };

  // Helper function to check if a string looks like a UUID
  const isUUID = (str: string) => {
    if (!str) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      str
    );
  };

  const assignedName = getAssigneeName();
  const assignedAvatar = getAssigneeAvatar();

  return (
    <Card
      className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-200"
      onClick={() => {
        window.location.href = `/leads/${lead.leadId}`;
      }}
    >
      <div className="space-y-3">
        {/* Title and Priority Row - Similar to TaskCard */}
        <div className="flex items-start justify-between gap-3">
          {/* Lead name with truncation */}
          <div className="flex-1 min-w-0">
            <h3 
              className="font-bold text-gray-900 text-base leading-tight capitalize"
              title={lead.customerName || "Unnamed Lead"}
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                wordBreak: "break-word",
                lineHeight: "1.3",
              }}
            >
              {lead.customerName || "Unnamed Lead"}
            </h3>
          </div>

          {/* Priority Badge - Added to right corner */}
          <Badge
            variant="outline"
            className={`${
              priorityColors[lead.leadPriority || "MEDIUM"]
            } whitespace-nowrap flex-shrink-0`}
          >
            {lead.leadPriority || "MEDIUM"}
          </Badge>
        </div>

        {/* Assigned user avatar */}
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-gray-100 text-gray-600">
              {getInitials(assignedName)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-gray-600 capitalize">
            {assignedName}
          </span>
        </div>

        {/* Details */}
        <div className="space-y-1 text-sm text-gray-500">
          {lead.companyName && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span className="truncate">{lead.companyName}</span>
            </div>
          )}
          {lead.customerEmailAddress && (
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="truncate">{lead.customerEmailAddress}</span>
            </div>
          )}
        </div>

        {/* Action bar - Only show if not final stage */}
        {!isFinalStage && (
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              {permissions.canView && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = `/leads/${lead.leadId}`;
                  }}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  title="View lead"
                >
                  <Eye className="h-4 w-4 text-gray-600" />
                </button>
              )}
              {permissions.canEdit && !isClosedStage &&(
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(lead);
                  }}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  title="Edit lead"
                >
                  <Edit className="h-4 w-4 text-gray-600" />
                </button>
              )}
            </div>

            {/* 3-dots menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <MoreVertical className="h-4 w-4 text-gray-600" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenuItem onClick={() => onAddFollowUp?.(lead)}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Add Follow-up
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChangeAssign?.(lead)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Change Assignment
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChangeStatus?.(lead)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Change Status
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {permissions.canDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete?.(lead)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Lead
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Show message if it's final stage */}
        {isFinalStage && (
          <div className="pt-2 text-xs text-gray-400 text-center">
            Lead completed - actions disabled
          </div>
        )}
      </div>
    </Card>
  );
};