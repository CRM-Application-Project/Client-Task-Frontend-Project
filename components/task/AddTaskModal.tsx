"use client";
import { useState, useEffect, useMemo } from "react";
import { X, Calendar, ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  getTaskStagesDropdown,
  getUsers,
  User,
} from "@/app/services/data.service";
import { TaskStage } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: CreateTaskRequest | Partial<UpdateTaskRequest>, isEdit: boolean) => void;
  editingTask?: GetTaskByIdResponse["data"];
  preSelectedStageId?: number | null;
  users: User[];
}

interface CreateTaskRequest {
  subject: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  taskStageId: number;
  startDate: string;
  endDate: string;
  assignee: string;
}

interface UpdateTaskRequest {
  subject?: string;
  description?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  taskStageId?: number;
  startDate?: string;
  endDate?: string;
  assignee?: string;
}

interface GetTaskByIdResponse {
  data: {
    id: number;
    subject: string;
    description: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    startDate: string;
    endDate: string | null;
    taskStageId: number;
    taskStageName: string;
    createdAt: string;
    updatedAt: string;
    assignee: {
      id: string;
      label: string;
    };
  };
}

export const AddTaskModal = ({
  isOpen,
  onClose,
  onSubmit,
  editingTask,
  preSelectedStageId,
  users,
}: AddTaskModalProps) => {
  const [stages, setStages] = useState<TaskStage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [formData, setFormData] = useState<CreateTaskRequest>({
    subject: "",
    description: "",
    priority: "LOW",
    taskStageId: 0,
    startDate: new Date().toISOString(),
    endDate: "",
    assignee: "",
  });

  // Track original values for comparison
  const [originalFormData, setOriginalFormData] = useState<CreateTaskRequest | null>(null);
  
  // Track which fields have been modified
  const [dirtyFields, setDirtyFields] = useState<Set<keyof CreateTaskRequest>>(new Set());

  const priorities: Array<CreateTaskRequest["priority"]> = [
    "LOW",
    "MEDIUM",
    "HIGH",
    "URGENT",
  ];

  // Helper function to compare values (handles dates properly)
  const areValuesEqual = (original: any, current: any): boolean => {
    if (original === current) return true;
    
    // Handle date comparison
    if (original instanceof Date && typeof current === 'string') {
      return original.toISOString() === current;
    }
    if (typeof original === 'string' && current instanceof Date) {
      return original === current.toISOString();
    }
    
    // Handle null/undefined/empty string equivalence
    const normalizeEmpty = (val: any) => val === null || val === undefined || val === '' ? '' : val;
    return normalizeEmpty(original) === normalizeEmpty(current);
  };

  // Function to update form data and track dirty fields
  const updateFormField = (field: keyof CreateTaskRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (originalFormData && editingTask) {
      const originalValue = originalFormData[field];
      const newDirtyFields = new Set(dirtyFields);
      
      if (areValuesEqual(originalValue, value)) {
        // Value matches original, remove from dirty fields
        newDirtyFields.delete(field);
      } else {
        // Value is different from original, add to dirty fields
        newDirtyFields.add(field);
      }
      
      setDirtyFields(newDirtyFields);
    }
  };

  // Helper function to get local ISO string without timezone conversion
  const getLocalISOString = (date: Date): string => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  // Helper function to add minutes to current time and round up to next 5-minute interval
  const getAdjustedCurrentTime = (): Date => {
    const now = new Date();
    const currentMinutes = now.getMinutes();
    const currentSeconds = now.getSeconds();
    
    if (currentSeconds > 0) {
      now.setMinutes(currentMinutes + 1);
    }
    
    const minutesToAdd = 5 - (now.getMinutes() % 5);
    if (minutesToAdd < 5) {
      now.setMinutes(now.getMinutes() + minutesToAdd);
    } else {
      now.setMinutes(now.getMinutes() + 5);
    }
    
    now.setSeconds(0);
    now.setMilliseconds(0);
    
    return now;
  };

  // MAIN EFFECT: Reset and initialize form when modal opens/closes or when key props change
  useEffect(() => {
    console.log('Main effect - isOpen:', isOpen, 'editingTask:', editingTask?.id, 'preSelectedStageId:', preSelectedStageId);
    
    if (!isOpen) {
      // Reset everything when modal closes
      setOriginalFormData(null);
      setDirtyFields(new Set());
      return;
    }

    // Initialize form data when modal opens
    if (editingTask) {
      // EDIT MODE: Initialize with existing task data
      const initialData = {
        subject: editingTask.subject || "",
        description: editingTask.description || "",
        priority: editingTask.priority || "LOW",
        taskStageId: editingTask.taskStageId || 0,
        startDate: editingTask.startDate || new Date().toISOString(),
        endDate: editingTask.endDate || "",
        assignee: editingTask.assignee?.id || "",
      };
      
      console.log('Setting edit data:', initialData);
      setFormData(initialData);
      setOriginalFormData(initialData);
      setDirtyFields(new Set());
    } else {
      // NEW TASK MODE: Initialize with defaults and pre-selected stage
      const adjustedTime = getAdjustedCurrentTime();
      const newTaskData = {
        subject: "",
        description: "",
        priority: "LOW" as const,
        taskStageId: preSelectedStageId || 0, // This is the key line for pre-selection
        startDate: getLocalISOString(adjustedTime),
        endDate: "",
        assignee: "",
      };
      
      console.log('Setting new task data:', newTaskData);
      setFormData(newTaskData);
      setOriginalFormData(null);
      setDirtyFields(new Set());
    }
  }, [isOpen, editingTask, preSelectedStageId]); // Dependencies: when any of these change, re-initialize

  // Fetch stages when modal opens
  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen) return;
      
      try {
        setIsLoading(true);
        const stagesRes = await getTaskStagesDropdown();

        if (stagesRes?.isSuccess && stagesRes.data) {
          setStages(stagesRes.data);
          console.log('Stages loaded:', stagesRes.data);
        } else {
          console.error("Failed to fetch stages:", stagesRes?.message);
          toast({
            title: "Error",
            description: "Failed to load stages. Please try again later.",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description:
            error?.message || "Failed to load data. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isOpen, toast]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.subject?.trim()) {
      toast({
        title: "Validation Error",
        description: "Subject is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.description?.trim()) {
      toast({
        title: "Validation Error", 
        description: "Description is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.taskStageId || formData.taskStageId === 0) {
      toast({
        title: "Validation Error",
        description: "Please select a stage",
        variant: "destructive",
      });
      return;
    }

    if (!formData.assignee?.trim()) {
      toast({
        title: "Validation Error",
        description: "Please select an assignee",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingTask) {
        // For editing, only send changed fields
        if (dirtyFields.size === 0) {
          toast({
            title: "No Changes",
            description: "No changes were made to the task.",
            variant: "default",
          });
          onClose();
          return;
        }

        const updatePayload: Partial<UpdateTaskRequest> = {};
        
        // Only include fields that have been modified
        dirtyFields.forEach(field => {
          if (field === 'endDate' && formData[field] === '') {
            // Handle empty endDate specially - send null or don't send at all
            updatePayload[field] = null as any;
          } else {
            updatePayload[field] = formData[field] as any;
          }
        });

        console.log('Update payload (only dirty fields):', updatePayload);
        console.log('Dirty fields:', Array.from(dirtyFields));
        
        onSubmit(updatePayload, true);
      } else {
        // For new tasks, send all required fields
        console.log('Submitting new task:', formData);
        onSubmit(formData, false);
      }
      
      onClose();
    } catch (error) {
      console.error("Error submitting task:", error);
      toast({
        title: "Error",
        description: "Failed to save task. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Updated handleDateChange function
  const handleDateChange = (value: string, field: 'startDate' | 'endDate') => {
    try {
      if (!value) {
        updateFormField(field, "");
        return;
      }
      
      if (field === 'startDate') {
        const selectedDate = new Date(value);
        const today = new Date();
        
        const isToday = 
          selectedDate.getDate() === today.getDate() &&
          selectedDate.getMonth() === today.getMonth() &&
          selectedDate.getFullYear() === today.getFullYear();
        
        if (isToday) {
          const adjustedTime = getAdjustedCurrentTime();
          const finalDate = new Date(selectedDate);
          finalDate.setHours(adjustedTime.getHours());
          finalDate.setMinutes(adjustedTime.getMinutes());
          finalDate.setSeconds(0);
          finalDate.setMilliseconds(0);
          
          const localISOTime = getLocalISOString(finalDate);
          updateFormField(field, localISOTime);
        } else {
          selectedDate.setHours(9, 0, 0, 0);
          const localISOTime = getLocalISOString(selectedDate);
          updateFormField(field, localISOTime);
        }
      } else {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          console.error("Invalid date:", value);
          return;
        }
        
        date.setHours(23, 59, 59, 0);
        const localISOTime = getLocalISOString(date);
        updateFormField(field, localISOTime);
      }
    } catch (error) {
      console.error("Error handling date change:", error);
    }
  };

  // Updated formatDateForInput function
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return "";
    try {
      let date: Date;
      
      if (dateString.includes('T')) {
        if (!dateString.includes('Z') && !dateString.includes('+') && !dateString.includes('-', 10)) {
          const [datePart, timePart] = dateString.split('T');
          const [year, month, day] = datePart.split('-').map(Number);
          const [hour, minute, second] = timePart.split(':').map(Number);
          date = new Date(year, month - 1, day, hour, minute, second || 0);
        } else {
          date = new Date(dateString);
        }
      } else {
        const [year, month, day] = dateString.split('-').map(Number);
        date = new Date(year, month - 1, day);
      }
      
      if (isNaN(date.getTime())) return "";
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };

  // Get the name of the pre-selected stage for display
  const getPreSelectedStageName = () => {
    if (preSelectedStageId && stages.length > 0) {
      const selectedStage = stages.find(stage => stage.id === preSelectedStageId);
      return selectedStage?.name;
    }
    return null;
  };

  if (!isOpen) return null;

  console.log('RENDER - formData.taskStageId:', formData.taskStageId, 'preSelectedStageId:', preSelectedStageId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            {editingTask ? "Edit Task" : "Add Task"}
            {!editingTask ? (
              <p className="text-xs text-[#636363] mt-1">
                Create a new task for your team
                {preSelectedStageId && getPreSelectedStageName() && (
                  <span className="text-blue-600 ml-1">
                  {`• Adding to "${getPreSelectedStageName()}" stage`}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-xs text-[#636363] mt-1">
                Edit the task details
                {dirtyFields.size > 0 && (
                  <span className="text-blue-600 ml-1">
                    • {dirtyFields.size} field{dirtyFields.size !== 1 ? 's' : ''} modified
                  </span>
                )}
              </p>
            )}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 border border-gray-200 p-4 rounded-lg"
        >
          {/* Subject */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold mb-2">Task Details</h3>
            <Label
              htmlFor="subject"
              className="text-sm font-medium text-foreground"
            >
              Subject: *
              {dirtyFields.has('subject') && (
                <span className="text-blue-600 text-xs ml-1">• Modified</span>
              )}
            </Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => updateFormField('subject', e.target.value)}
              placeholder="Enter Subject"
              required
              className="w-full"
            />
          </div>

          {/* Row 1: Priority and Stage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Priority: *
                {dirtyFields.has('priority') && (
                  <span className="text-blue-600 text-xs ml-1">• Modified</span>
                )}
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  updateFormField('priority', value as typeof formData.priority)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Stage: *
                
              </Label>
              <Select
                value={formData.taskStageId?.toString() || ""}
                onValueChange={(value) => {
                  const numValue = parseInt(value, 10);
                  if (!isNaN(numValue)) {
                    console.log('Stage selection changed to:', numValue);
                    updateFormField('taskStageId', numValue);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id.toString()}>
                      {stage.name}
                    
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Start Date: *
                {dirtyFields.has('startDate') && (
                  <span className="text-blue-600 text-xs ml-1">• Modified</span>
                )}
              </Label>
              <Input
                type="date"
                value={formatDateForInput(formData.startDate)}
                onChange={(e) => handleDateChange(e.target.value, 'startDate')}
                className="w-full"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                End Date (Optional):
                {dirtyFields.has('endDate') && (
                  <span className="text-blue-600 text-xs ml-1">• Modified</span>
                )}
              </Label>
              <Input
                type="date"
                value={formatDateForInput(formData.endDate)}
                onChange={(e) => handleDateChange(e.target.value, 'endDate')}
                className="w-full"
              />
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Assignee: *
              {dirtyFields.has('assignee') && (
                <span className="text-blue-600 text-xs ml-1">• Modified</span>
              )}
            </Label>
            <Select
              value={formData.assignee}
              onValueChange={(value) => updateFormField('assignee', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                {users && users.length > 0 ? (
                  users.map((user) => (
                    <SelectItem key={user.userId} value={user.userId}>
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="" disabled>
                    No users available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Description: *
              {dirtyFields.has('description') && (
                <span className="text-blue-600 text-xs ml-1">• Modified</span>
              )}
            </Label>
            <Textarea
              value={formData.description}
              onChange={(e) => updateFormField('description', e.target.value)}
              placeholder="Enter Description"
              rows={4}
              className="resize-none"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : editingTask ? "Update" : "Submit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};