import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { AssignDropdown, getAssignDropdown } from "@/app/services/data.service";
import { LeadCard } from "./LeadCard";
import { LeadStage } from "@/lib/data";

interface LeadColumnProps {
  stage: LeadStage;
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
  onDragOver: (e: React.DragEvent<HTMLDivElement>, stageName: string) => void; // Changed parameter type
  onDrop: (e: React.DragEvent<HTMLDivElement>, stageName: string) => void; // Changed parameter type
}

// Dynamic color generation based on stage priority or name
const generateStageColor = (stageName: string, priority: number): { color: string; textColor: string } => {
  // Define a color palette
  const colors = [
    { bg: "bg-slate-500", text: "text-white" },      // Gray
    { bg: "bg-blue-500", text: "text-white" },       // Blue
    { bg: "bg-green-500", text: "text-white" },      // Green
    { bg: "bg-yellow-500", text: "text-white" },     // Yellow
    { bg: "bg-orange-500", text: "text-white" },     // Orange
    { bg: "bg-red-500", text: "text-white" },        // Red
    { bg: "bg-purple-500", text: "text-white" },     // Purple
    { bg: "bg-indigo-500", text: "text-white" },     // Indigo
    { bg: "bg-pink-500", text: "text-white" },       // Pink
    { bg: "bg-teal-500", text: "text-white" },       // Teal
  ];

  // Use priority to determine color, fallback to name-based hash if needed
  const colorIndex = (priority - 1) % colors.length;
  const selectedColor = colors[colorIndex] || colors[0];

  return {
    color: selectedColor.bg,
    textColor: selectedColor.text,
  };
};

export const LeadColumn = ({
  stage,
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
  const [leadsst, setLeads] = useState<Lead[]>([]);
  const [assignees, setAssignees] = useState<AssignDropdown[]>([]);
  
  // Generate dynamic colors for the stage
  const stageConfig = generateStageColor(stage.leadStageName, stage.leadStagePriority);

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
      onDragOver={(e) => onDragOver(e, stage.leadStageName)}
      onDrop={(e) => onDrop(e, stage.leadStageName)}
    >
      <div className="mb-4">
        <div
          className={`${stageConfig.color} ${stageConfig.textColor} px-4 py-3 rounded-lg flex items-center justify-between shadow-sm`}
        >
          <div className="flex flex-col">
            <h2 className="font-bold text-sm uppercase tracking-wide">
              {stage.leadStageName}
            </h2>
            
          </div>
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
            <p className="text-sm">No leads in this stage</p>
            <p className="text-xs mt-1 opacity-70">
              Drag leads here or create new ones
            </p>
          </div>
        )}
      </div>
    </div>
  );
};