import React, { useState, useEffect } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AssignDropdown, getAssignDropdown } from "@/app/services/data.service";
import { usePermissions } from "@/hooks/usePermissions";

interface LeadCardProps {
  lead: Lead;
  onEdit?: (lead: Lead) => void;
  onDelete?: (lead: Lead) => void;
  onView?: (lead: Lead) => void;
  onAddFollowUp?: (lead: Lead) => void;
  onChangeAssign?: (lead: Lead) => void;
  onImportLead?: () => void;
  onLeadSorting?: () => void;
  onChangeStatus?: (lead: Lead) => void;
}

export const LeadCard = ({
  lead,
  onEdit,
  onDelete,
  onView,
  onAddFollowUp,
  onChangeAssign,
  onImportLead,
  onLeadSorting,
  onChangeStatus,
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
  const [assignees, setAssignees] = useState<AssignDropdown[]>([]);
  const [loadingAssignees, setLoadingAssignees] = useState(false);

  // Fetch assignees when component mounts
  useEffect(() => {
    const fetchAssignees = async () => {
      setLoadingAssignees(true);
      try {
        const response = await getAssignDropdown();
        if (response.isSuccess && response.data) {
          setAssignees(response.data);
          console.log("Assignees fetched:", assignees);
        }
      } catch (error) {
        console.error("Failed to fetch assignees:", error);
      } finally {
        setLoadingAssignees(false);
      }
    };

    fetchAssignees();
  }, []);

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
    <Card className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-200">
      <div className="space-y-3">
        {/* Lead name */}
        <h3 className="font-bold text-gray-900 text-base leading-tight">
          {lead.customerName || "Unnamed Lead"}
        </h3>

        {/* Assigned user avatar */}
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-gray-100 text-gray-600">
              {getInitials(assignedName)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-gray-600">{assignedName}</span>
        </div>

        {/* Details section */}
        <div className="space-y-1 text-sm text-gray-500">
          {(lead.company || lead.companyEmailAddress) && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span className="truncate">
                {lead.company || lead.companyEmailAddress}
              </span>
            </div>
          )}
          {lead.customerEmailAddress && (
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="truncate">{lead.customerEmailAddress}</span>
            </div>
          )}
          {lead.customerMobileNumber && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <span className="truncate">{lead.customerMobileNumber}</span>
            </div>
          )}
          {lead.leadAddress && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="truncate">{lead.leadAddress}</span>
            </div>
          )}
        </div>

        {/* Additional info - Lead Label and Reference */}

        {/* Action bar */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {permissions.canView && (
              <button
                onClick={() => onView?.(lead)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                title="View lead"
              >
                <Eye className="h-4 w-4 text-gray-600" />
              </button>
            )}
            {permissions.canEdit && (
              <button
                onClick={() => onEdit?.(lead)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                title="Edit lead"
              >
                <Edit className="h-4 w-4 text-gray-600" />
              </button>
            )}
            {lead.customerMobileNumber && (
              <button
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                title="Call lead"
                onClick={() =>
                  window.open(`tel:${lead.customerMobileNumber}`, "_self")
                }
              >
                <Phone className="h-4 w-4 text-gray-600" />
              </button>
            )}
          </div>

          {/* 3-dots menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                <MoreVertical className="h-4 w-4 text-gray-600" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
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
      </div>
    </Card>
  );
};
