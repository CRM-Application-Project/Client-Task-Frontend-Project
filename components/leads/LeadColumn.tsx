"use client";
import { Droppable, Draggable } from "react-beautiful-dnd";
import { Lead, LeadStatus } from "../../lib/leads";
import { Badge } from "@/components/ui/badge";
import { LeadCard } from "./LeadCard";

interface LeadColumnProps {
  status: LeadStatus;
  leads: Lead[];
  onEditLead?: (lead: Lead) => void;
  onDeleteLead?: (lead: Lead) => void;
  onViewLead?: (lead: Lead) => void;
}

const statusConfig = {
  NEW: {
    title: "New",
    color: "bg-sky-500", // #0ea5e9
    textColor: "text-white"
  },
  CONTACTED: {
    title: "Contacted",
    color: "bg-indigo-500", // #6366f1
    textColor: "text-white"
  },
  QUALIFIED: {
    title: "Qualified",
    color: "bg-green-500", // #22c55e
    textColor: "text-white"
  },
  PROPOSAL: {
    title: "Proposal",
    color: "bg-teal-500", // #14b8a6
    textColor: "text-white"
  },
  DEMO: {
    title: "Demo",
    color: "bg-yellow-500", // #eab308
    textColor: "text-white"
  },
  NEGOTIATIONS: {
    title: "Negotiations",
    color: "bg-orange-500", // #f97316
    textColor: "text-white"
  },
  CLOSED_WON: {
    title: "Closed - Won",
    color: "bg-emerald-600", // #059669
    textColor: "text-white"
  },
  CLOSED_LOST: {
    title: "Closed - Lost",
    color: "bg-red-500", // #ef4444
    textColor: "text-white"
  }
};

export const LeadColumn = ({ status, leads, onEditLead, onDeleteLead, onViewLead }: LeadColumnProps) => {
  const config = statusConfig[status];
  
  return (
    <div className="flex-1 min-w-[280px]">
      <div className="mb-4">
        <div className={`${config.color} ${config.textColor} px-4 py-3 rounded-lg flex items-center justify-between shadow-sm`}>
          <h2 className="font-bold text-sm uppercase tracking-wide">
            {config.title}
          </h2>
          <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
            {leads.length}
          </Badge>
        </div>
      </div>
      
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-3 min-h-[500px] p-4 bg-gray-50 rounded-lg shadow-sm ${
              snapshot.isDraggingOver ? 'bg-gray-100' : ''
            }`}
          >
            {leads.map((lead, index) => (
              <Draggable key={lead.id} draggableId={lead.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={snapshot.isDragging ? 'opacity-50' : ''}
                  >
                    <LeadCard
                      lead={lead}
                      onEdit={onEditLead}
                      onDelete={onDeleteLead}
                      onView={onViewLead}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            
            {leads.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No leads</p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
};