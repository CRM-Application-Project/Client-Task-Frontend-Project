import { useState, useEffect } from "react";
import { LeadStatus } from "../../lib/leads";
import { Badge } from "@/components/ui/badge";
import { AssignDropdown, getAssignDropdown } from "@/app/services/data.service";
import { LeadCard } from "./LeadCard";

interface LeadColumnProps {
  status: LeadStatus;
  leads: Lead[];
  onEditLead?: (lead: Lead) => void;
  onDeleteLead?: (lead: Lead) => void;
  onViewLead?: (lead: Lead) => void;
  onAddFollowUp?: (lead: Lead) => void;
  onChangeAssign?: (lead: Lead) => void;
  onImportLead?: () => void;
  onLeadSorting?: () => void;
  onChangeStatus?: (lead: Lead) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, lead: Lead) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>, status: LeadStatus) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, status: LeadStatus) => void;
}

const statusConfig = {
  NEW: {
    title: "New Lead",
    color: "bg-gray-500", // Gray / Light Blue
    textColor: "text-white",
  },
  CONTACTED: {
    title: "Contacted",
    color: "bg-blue-500", // Blue
    textColor: "text-white",
  },
  QUALIFIED: {
    title: "Qualified",
    color: "bg-green-500", // Green
    textColor: "text-white",
  },
  PROPOSAL: {
    title: "Proposal Sent",
    color: "bg-orange-500", // Orange
    textColor: "text-white",
  },
  DEMO: {
    title: "Demo",
    color: "bg-orange-400", // Orange variant for consistency
    textColor: "text-white",
  },
  NEGOTIATIONS: {
    title: "Negotiation",
    color: "bg-yellow-500", // Yellow / Amber
    textColor: "text-white",
  },
  CLOSED_WON: {
    title: "Closed - Won",
    color: "bg-teal-600", // Dark Green / Teal
    textColor: "text-white",
  },
  CLOSED_LOST: {
    title: "Closed - Lost",
    color: "bg-red-500", // Red
    textColor: "text-white",
  },
  ON_HOLD: {
    title: "On Hold / Nurturing",
    color: "bg-purple-500", // Purple / Violet
    textColor: "text-white",
  },
};

export const LeadColumn = ({
  status,
  leads,
  onEditLead,
  onDeleteLead,
  onViewLead,
  onAddFollowUp,
  onChangeAssign,
  onImportLead,
  onLeadSorting,
  onChangeStatus,
  onDragStart,
  onDragOver,
  onDrop,
}: LeadColumnProps) => {
  const config = statusConfig[status];
  const [leadsst, setLeads] = useState<Lead[]>([]);
  const [assignees, setAssignees] = useState<AssignDropdown[]>([]);
  const refreshAssignees = async () => {
    try {
      const response = await getAssignDropdown();
      if (response.isSuccess && response.data) {
        setAssignees(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch assignees:", error);
    }
  };
  const handleNewLeadCreated = async (apiLeadData: any) => {
    // Update leads list
    setLeads((prevLeads) => [apiLeadData, ...prevLeads]);

    // Refresh assignees to ensure we have the latest data
    await refreshAssignees();
  };
  return (
    <div
      className="flex-1 min-w-[280px]"
      onDragOver={(e) => onDragOver(e, status)}
      onDrop={(e) => onDrop(e, status)}
    >
      <div className="mb-4">
        <div
          className={`${config.color} ${config.textColor} px-4 py-3 rounded-lg flex items-center justify-between shadow-sm`}
        >
          <h2 className="font-bold text-sm uppercase tracking-wide">
            {config.title}
          </h2>
          <Badge
            variant="secondary"
            className="bg-white/20 text-white border-white/30"
          >
            {leads.length}
          </Badge>
        </div>
      </div>

      <div
        className={`space-y-3 min-h-[500px] p-4 bg-gray-100 rounded-lg shadow-sm`}
      >
        {leads.map((lead, index) => (
          <div
            key={lead.leadId}
            draggable
            onDragStart={(e) => onDragStart(e, lead)}
            className="cursor-move"
          >
            <LeadCard
              lead={lead}
              onEdit={onEditLead}
              onDelete={onDeleteLead}
              onView={onViewLead}
              onAddFollowUp={onAddFollowUp}
              onChangeAssign={onChangeAssign}
              onImportLead={onImportLead}
              onLeadSorting={onLeadSorting}
              onChangeStatus={onChangeStatus}
            />
          </div>
        ))}

        {leads.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No leads</p>
          </div>
        )}
      </div>
    </div>
  );
};
