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
import { Lead } from "../../lib/leads";
import { AssignDropdown, getAssignDropdown } from "@/app/services/data.service";

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
        }
      } catch (error) {
        console.error("Failed to fetch assignees:", error);
      } finally {
        setLoadingAssignees(false);
      }
    };

    fetchAssignees();
  }, []);

  // Resolve assignee name
  const getAssigneeName = () => {
    // If assignedTo looks like a UUID (ID), try to resolve it
    if (isUUID(lead.assignedTo) && assignees.length > 0) {
      const assignee = assignees.find((a) => a.id === lead.assignedTo);
      return assignee?.label || lead.assignedTo;
    }
    return lead.assignedTo;
  };

  // Resolve assignee avatar
  const getAssigneeAvatar = () => {
    if (isUUID(lead.assignedTo) && assignees.length > 0) {
      const assignee = assignees.find((a) => a.id === lead.assignedTo);
      // Replace 'avatar' with the correct property, e.g., 'label', or fallback to empty string
      return assignee?.label || "";
    }
    return lead.assignedToAvatar || "";
  };

  // Helper function to check if a string looks like a UUID
  const isUUID = (str: string) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      str
    );
  };

  const getInitials = (name: string) => {
    // Handle case where name might be an ID
    if (isUUID(name)) {
      return "NA"; // Or some other fallback
    }
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const assignedName = getAssigneeName();
  const assignedAvatar = getAssigneeAvatar();

  return (
    <Card className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-200">
      <div className="space-y-3">
        {/* Lead name */}
        <h3 className="font-bold text-gray-900 text-base leading-tight">
          {lead.name}
        </h3>

        {/* Assigned user avatar */}
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={assignedAvatar} alt={assignedName} />
            <AvatarFallback className="text-xs bg-gray-100 text-gray-600">
              {getInitials(assignedName)}
            </AvatarFallback>
          </Avatar>
          {loadingAssignees ? (
            <span className="text-sm text-gray-400">Loading...</span>
          ) : (
            <span className="text-sm text-gray-600">{assignedName}</span>
          )}
        </div>

        {/* Details section */}
        <div className="space-y-1 text-sm text-gray-500">
          {lead.company && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              {lead.company}
            </div>
          )}
          {lead.email && (
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              {lead.email}
            </div>
          )}
          {lead.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" />
              {lead.phone}
            </div>
          )}
          {lead.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              {lead.location}
            </div>
          )}
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onView?.(lead)}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              title="View lead"
            >
              <Eye className="h-4 w-4 text-gray-600" />
            </button>
            <button
              onClick={() => onEdit?.(lead)}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              title="Edit lead"
            >
              <Edit className="h-4 w-4 text-gray-600" />
            </button>
            <button
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              title="Call lead"
            >
              <Phone className="h-4 w-4 text-gray-600" />
            </button>
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
              <DropdownMenuItem onClick={() => onImportLead?.()}>
                <Upload className="h-4 w-4 mr-2" />
                Import Leads
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onLeadSorting?.()}>
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Lead Sorting
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete?.(lead)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Lead
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
};
