import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { AssignDropdown, getAssignDropdown, deleteLeadStage } from "@/app/services/data.service";
import { LeadCard } from "./LeadCard";
import { LeadStage } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Pencil, MoreVertical, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateLeadStage } from "@/app/services/data.service";
import { useToast } from "@/hooks/use-toast";

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
  onStageDelete?: (stageId: string) => void; // New prop for stage deletion
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
  onStageUpdate,
  onStageDelete,
}: LeadColumnProps) => {
  const [leadsst, setLeads] = useState<Lead[]>([]);
  const [assignees, setAssignees] = useState<AssignDropdown[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentStage, setCurrentStage] = useState<LeadStage>(stage); // Local state for the stage
  const [formData, setFormData] = useState({
    leadStageName: stage.leadStageName,
    leadStageDescription: stage.leadStageDescription || "",
    leadStagePriority: stage.leadStagePriority,
  });
  const [originalData, setOriginalData] = useState({
    leadStageName: stage.leadStageName,
    leadStageDescription: stage.leadStageDescription || "",
    leadStagePriority: stage.leadStagePriority,
  });
  const { toast } = useToast();
  
  // Update local stage when prop changes
  useEffect(() => {
    setCurrentStage(stage);
    setFormData({
      leadStageName: stage.leadStageName,
      leadStageDescription: stage.leadStageDescription || "",
      leadStagePriority: stage.leadStagePriority,
    });
    setOriginalData({
      leadStageName: stage.leadStageName,
      leadStageDescription: stage.leadStageDescription || "",
      leadStagePriority: stage.leadStagePriority,
    });
  }, [stage]);

  // Generate dynamic colors for the stage
  const stageConfig = generateStageColor(currentStage.leadStageName, currentStage.leadStagePriority);

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

  const handleEditStage = () => {
    setFormData({
      leadStageName: currentStage.leadStageName,
      leadStageDescription: currentStage.leadStageDescription || "",
      leadStagePriority: currentStage.leadStagePriority,
    });
    setOriginalData({
      leadStageName: currentStage.leadStageName,
      leadStageDescription: currentStage.leadStageDescription || "",
      leadStagePriority: currentStage.leadStagePriority,
    });
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
        
        // Notify parent component about the deletion
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

  const handleSaveStage = async () => {
    setIsLoading(true);
    try {
      const response = await updateLeadStage({
        leadStageId: currentStage.leadStageId,
        ...formData,
      });

      if (response.isSuccess) {
        // Create updated stage object
        const updatedStage = {
          ...currentStage,
          leadStageName: formData.leadStageName,
          leadStageDescription: formData.leadStageDescription,
          leadStagePriority: formData.leadStagePriority,
        };
        
        // Update local state
        setCurrentStage(updatedStage);
        
        toast({
          title: "Success",
          description: "Stage updated successfully",
        });
        setIsEditModalOpen(false);
        
        // Notify parent component about the update
        if (onStageUpdate) {
          onStageUpdate(updatedStage);
        }
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to update stage",
          variant: "destructive",
        });
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "leadStagePriority" ? parseInt(value) || 0 : value,
    }));
  };

  // Check if form has changes
  const hasChanges = 
    formData.leadStageName !== originalData.leadStageName ||
    formData.leadStageDescription !== originalData.leadStageDescription ||
    formData.leadStagePriority !== originalData.leadStagePriority;

  return (
    <>
      <div
        className="flex-1 min-w-[280px]"
        onDragOver={(e) => onDragOver(e, currentStage.leadStageName)}
        onDrop={(e) => onDrop(e, currentStage.leadStageName)}
      >
        <div className="mb-4">
          <div
            className={`${stageConfig.color} ${stageConfig.textColor} px-4 py-3 rounded-lg flex items-center justify-between shadow-sm`}
          >
            <div className="flex flex-col">
              <h2 className="font-bold text-sm uppercase tracking-wide">
                {currentStage.leadStageName}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="bg-white/20 text-white border-white/30"
              >
                {leads.length}
              </Badge>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full bg-white/20 hover:bg-white/30"
                  >
                    <MoreVertical className="h-3 w-3 text-white" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={handleEditStage}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Stage
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleDeleteStage}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Stage
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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

      {/* Edit Stage Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Stage</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="leadStageName">Stage Name</Label>
              <Input
                id="leadStageName"
                name="leadStageName"
                value={formData.leadStageName}
                onChange={handleInputChange}
                placeholder="Enter stage name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="leadStageDescription">Description</Label>
              <Textarea
                id="leadStageDescription"
                name="leadStageDescription"
                value={formData.leadStageDescription}
                onChange={handleInputChange}
                placeholder="Enter stage description"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="leadStagePriority">Priority</Label>
              <Input
                id="leadStagePriority"
                name="leadStagePriority"
                type="number"
                value={formData.leadStagePriority}
                onChange={handleInputChange}
                placeholder="Enter priority"
                min="1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveStage}
              disabled={!hasChanges || isLoading}
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stage</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the stage "{currentStage.leadStageName}"? 
              This action cannot be undone and all leads in this stage will need to be moved to another stage.
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