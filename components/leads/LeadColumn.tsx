"use client";
import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { deleteLeadStage } from "@/app/services/data.service";
import { LeadCard } from "./LeadCard";
import { LeadStage } from "@/lib/data";
import { Pencil, MoreVertical, Trash2, Plus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { updateLeadStage } from "@/app/services/data.service";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";

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
  onDragOver: (e: React.DragEvent<HTMLDivElement>, stageName: string) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, stageName: string) => void;
  onStageUpdate?: (updatedStage: LeadStage) => void;
  onStageDelete?: (stageId: string) => void;
  isDragOver?: boolean;
  stageIndex: number;
  onAddLeadForStage?: (stageId: string) => void;
}

// Dynamic color assignment based on stage position
const getStageColors = (stageIndex?: number) => {
  const stageColorsByPosition = [
    { color: "bg-slate-600", textColor: "text-white" },
    { color: "bg-blue-600", textColor: "text-white" },
    { color: "bg-amber-600", textColor: "text-white" },
    { color: "bg-purple-600", textColor: "text-white" },
    { color: "bg-green-600", textColor: "text-white" },
    { color: "bg-indigo-600", textColor: "text-white" },
    { color: "bg-pink-600", textColor: "text-white" },
    { color: "bg-red-600", textColor: "text-white" },
    { color: "bg-teal-600", textColor: "text-white" },
    { color: "bg-orange-600", textColor: "text-white" },
  ];

  // Use stageIndex if provided, otherwise default to 0
  const colorIndex = (stageIndex || 0) % stageColorsByPosition.length;
  return stageColorsByPosition[colorIndex];
};

// Enhanced EditStageModal component with gray styling
interface EditStageModalProps {
  stage: LeadStage;
  isOpen: boolean;
  onClose: () => void;
  onSave: (stageData: {
    name: string;
    description: string;
    orderNumber: number;
  }) => void;
}

const EditStageModal = ({
  stage,
  isOpen,
  onClose,
  onSave,
}: EditStageModalProps) => {
  const [name, setName] = useState(stage.leadStageName);
  const [description, setDescription] = useState(
    stage.leadStageDescription || ""
  );
  const [orderNumber, setOrderNumber] = useState(stage.leadStagePriority || 1);

  useEffect(() => {
    setName(stage.leadStageName);
    setDescription(stage.leadStageDescription || "");
    setOrderNumber(stage.leadStagePriority || 1);
  }, [stage]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && orderNumber > 0) {
      onSave({
        name: name.trim(),
        description: description.trim(),
        orderNumber: orderNumber,
      });
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Edit Stage</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-200 transition-colors"
              type="button"
            >
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit}>
            <div className="space-y-5">
              <div>
                <label
                  htmlFor="stageName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Stage Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="stageName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors text-gray-900 placeholder-gray-400"
                  placeholder="Enter stage name"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="orderNumber"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Order Number <span className="text-red-500">*</span>
                </label>
                <input
                  id="orderNumber"
                  type="number"
                  min="1"
                  value={orderNumber}
                  onChange={(e) =>
                    setOrderNumber(parseInt(e.target.value) || 1)
                  }
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors text-gray-900"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Determines the display order of this stage
                </p>
              </div>

              <div>
                <label
                  htmlFor="stageDescription"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Description
                </label>
                <textarea
                  id="stageDescription"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors text-gray-900 placeholder-gray-400 resize-none"
                  placeholder="Enter stage description (optional)"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2.5 bg-[#636363] text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-600 transition-colors font-medium shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
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
  onStageUpdate,
  onStageDelete,
  isDragOver = false,
  stageIndex = 0,
  onAddLeadForStage,
}: LeadColumnProps) => {
  const [isStageMenuOpen, setIsStageMenuOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentStage, setCurrentStage] = useState<LeadStage>(stage);

  const { toast } = useToast();
  const stageColors = getStageColors(stageIndex);
  const { permissions, loading: permissionsLoading } =
    usePermissions("lead_stage");

  useEffect(() => {
    setCurrentStage(stage);
  }, [stage]);

  const handleEditStage = () => {
    setIsEditModalOpen(true);
  };

  const handleDeleteStage = () => {
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteStage = async () => {
    setIsDeleting(true);
    try {
      const response = await deleteLeadStage(currentStage.leadStageId);

      if (response.isSuccess) {
        toast({
          title: "Success",
          description: "Stage deleted successfully",
        });
        setIsDeleteDialogOpen(false);

        if (onStageDelete) {
          onStageDelete(currentStage.leadStageId);
        }
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to delete stage",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to delete stage:", error);
      toast({
        title: "Error",
        description: "Failed to delete stage",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveStage = async (stageData: {
    name: string;
    description: string;
    orderNumber: number;
  }) => {
    setIsLoading(true);
    try {
      const response = await updateLeadStage({
        leadStageId: currentStage.leadStageId,
        leadStageName: stageData.name,
        leadStageDescription: stageData.description,
        leadStagePriority: stageData.orderNumber,
      });

      if (response.isSuccess) {
        const updatedStage = {
          ...currentStage,
          leadStageName: stageData.name,
          leadStageDescription: stageData.description,
          leadStagePriority: stageData.orderNumber,
        };

        setCurrentStage(updatedStage);

        toast({
          title: "Success",
          description: "Stage updated successfully",
        });
        setIsEditModalOpen(false);

        if (onStageUpdate) {
          onStageUpdate(updatedStage);
        }
      } else {
        throw new Error(response.message || "Failed to update stage");
      }
    } catch (error) {
      console.error("Failed to update stage:", error);
      toast({
        title: "Error",
        description: "Failed to update stage",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStageMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsStageMenuOpen(!isStageMenuOpen);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    onDragOver(e, currentStage.leadStageName);
  };

  return (
    <>
      <div
        className={`flex-shrink-0 min-w-[280px] max-w-[320px] rounded-xl border shadow-sm transition-all duration-200 hover:shadow-md bg-gray-50 border-gray-200 ${
          isDragOver ? "bg-gray-50 border-2 border-gray-300 border-dashed" : ""
        }`}
        onDragOver={handleDragOver}
        onDrop={(e) => onDrop(e, currentStage.leadStageName)}
      >
        {/* Stage Header */}
        <div className="sticky top-0 z-10 bg-gray-50 rounded-t-xl border-b border-gray-200">
          <div
            className={`${stageColors?.color} ${stageColors?.textColor} px-4 py-3 rounded-t-xl flex items-center justify-between shadow-sm transition-all duration-200`}
          >
            <div className="flex items-center gap-2 flex-1">
              <h2 className="font-semibold text-sm uppercase tracking-wide truncate flex-1">
                {currentStage.leadStageName}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <Badge
                variant="secondary"
                className="bg-white/20 text-white border-white/30 flex-shrink-0"
              >
                {leads.length}
              </Badge>

              {/* Add Lead Icon */}
              {/* <button
                onClick={() => onAddLeadForStage?.(currentStage.leadStageId)}
                className="p-1.5 rounded hover:bg-white/20 transition-colors ml-2"
                title={`Add lead to ${currentStage.leadStageName}`}
              >
                <Plus className="w-4 h-4" />
              </button> */}

              {/* Three dots menu for stage operations */}
              <div className="relative">
                <button
                  onClick={handleStageMenuToggle}
                  className="p-1.5 rounded hover:bg-white/20 transition-colors"
                  title="Stage options"
                  type="button"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {/* Dropdown Menu */}
                {isStageMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsStageMenuOpen(false)}
                    />

                    <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      {permissions.canEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsStageMenuOpen(false);
                            handleEditStage();
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                        >
                          <Pencil className="w-4 h-4 flex-shrink-0" />
                          Edit Stage
                        </button>
                      )}
                      <hr className="my-1 border-gray-200" />
                      {permissions.canDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsStageMenuOpen(false);
                            handleDeleteStage();
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 flex-shrink-0" />
                          Delete Stage
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Leads Container */}
        <div
          className={`h-[calc(100vh-280px)] min-h-[550px] p-3 transition-all duration-300 ease-in-out ${
            isDragOver
              ? "bg-gray-50/50 border-2 border-gray-300 border-dashed shadow-inner"
              : "bg-transparent"
          }`}
          style={{
            overflowY: "auto",
            scrollBehavior: "smooth",
            scrollbarWidth: "thin",
            scrollbarColor: "#cbd5e1 #f1f5f9",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {/* Custom Scrollbar Styles */}
          <style jsx>{`
            div::-webkit-scrollbar {
              width: 6px;
            }
            div::-webkit-scrollbar-track {
              background: transparent;
              border-radius: 3px;
            }
            div::-webkit-scrollbar-thumb {
              background: #cbd5e1;
              border-radius: 3px;
              transition: background 0.2s ease;
            }
            div::-webkit-scrollbar-thumb:hover {
              background: #94a3b8;
            }
          `}</style>

          {/* Leads cards */}
          <div className="space-y-3">
            {leads.map((lead, index) => (
              <div
                key={lead.leadId}
                className="transition-all duration-200 ease-in-out transform hover:scale-[1.02]"
                style={{
                  animationDelay: `${index * 50}ms`,
                  willChange: "transform, opacity",
                }}
              >
                <div
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
              </div>
            ))}
          </div>

          {/* Empty state */}
          {leads.length === 0 && (
            <div className="text-center py-2">
              <div className="rounded-xl p-8 transition-all duration-200">
                <p className="text-sm text-gray-500 mb-2">
                  No leads in this stage
                </p>
                {isDragOver && (
                  <p className="text-sm text-gray-600 font-medium animate-pulse">
                    Drop lead here
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Drop indicator when dragging over non-empty column */}
          {isDragOver && leads.length > 0 && (
            <div className="mt-4 text-center py-6 text-gray-600 bg-gray-50 rounded-xl border-2 border-gray-300 border-dashed transition-all duration-200 animate-pulse">
              <div className="flex items-center justify-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
                <p className="text-sm font-medium">Drop lead here</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Stage Modal */}
      <EditStageModal
        stage={currentStage}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveStage}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stage</AlertDialogTitle>
            <AlertDialogDescription>
              {`Are you sure you want to delete the stage "
              ${currentStage.leadStageName}"? This action cannot be undone and
              all leads in this stage will need to be moved to another stage.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteStage}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete Stage"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
