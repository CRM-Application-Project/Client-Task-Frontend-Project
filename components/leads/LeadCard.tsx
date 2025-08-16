"use client";
import { Edit, Trash2, Eye, Phone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Lead } from "../../lib/leads";

interface LeadCardProps {
  lead: Lead;
  onEdit?: (lead: Lead) => void;
  onDelete?: (lead: Lead) => void;
  onView?: (lead: Lead) => void;
}

export const LeadCard = ({ lead, onEdit, onDelete, onView }: LeadCardProps) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

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
            <AvatarImage src={lead.assignedToAvatar} alt={lead.assignedTo} />
            <AvatarFallback className="text-xs bg-gray-100 text-gray-600">
              {getInitials(lead.assignedTo)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-gray-600">{lead.assignedTo}</span>
        </div>

        {/* Details section */}
        <div className="space-y-1 text-sm text-gray-500">
          <div>{lead.company}</div>
          <div>{lead.email}</div>
          <div>{lead.phone}</div>
          <div>{lead.location}</div>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2 pt-2">
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
          <button
            onClick={() => onDelete?.(lead)}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-red-100 flex items-center justify-center transition-colors"
            title="Delete lead"
          >
            <Trash2 className="h-4 w-4 text-gray-600 hover:text-red-600" />
          </button>
        </div>
      </div>
    </Card>
  );
};