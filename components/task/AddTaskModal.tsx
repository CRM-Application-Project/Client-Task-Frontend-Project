"use client";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  X,
  Calendar,
  ChevronDown,
  Check,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Smile,
  Code,
  List,
  ListOrdered,
  Link,
  Image,
  Quote,
  Strikethrough,
  Subscript,
  Superscript,
  Palette,
  Type,
  MoreHorizontal,
} from "lucide-react";
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

import { useToast } from "@/hooks/use-toast";
import { getTaskStagesDropdown, User } from "@/app/services/data.service";
import { TaskStage } from "@/lib/data";
import { RichTextEditor } from "./Richi";

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    task: CreateTaskRequest | Partial<UpdateTaskRequest>,
    isEdit: boolean
  ) => void | Promise<void>;
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
  acceptanceCriteria?: string;
}

interface UpdateTaskRequest {
  subject?: string;
  description?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  taskStageId?: number;
  startDate?: string;
  endDate?: string | null;
  assignee?: string;
  acceptanceCriteria?: string;
  comment?: string;
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
    acceptanceCriteria?: string;
  };
}

// Rich Text Editor Component

// The rest of your AddTaskModal component with edit-comment logic
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
    acceptanceCriteria: "",
  });

  // New: comment state (edit only)
  const [comment, setComment] = useState<string>("");

  const [originalFormData, setOriginalFormData] =
    useState<CreateTaskRequest | null>(null);
  const [dirtyFields, setDirtyFields] = useState<Set<keyof CreateTaskRequest>>(
    new Set()
  );

  const priorities: Array<CreateTaskRequest["priority"]> = [
    "LOW",
    "MEDIUM",
    "HIGH",
    "URGENT",
  ];



  const hasPreSelectedStage = useMemo(() => {
    return !editingTask && preSelectedStageId && preSelectedStageId > 0;
  }, [editingTask, preSelectedStageId]);

  const areValuesEqual = (original: any, current: any): boolean => {
    if (original === current) return true;
    if (original instanceof Date && typeof current === "string") {
      return original.toISOString() === current;
    }
    if (typeof original === "string" && current instanceof Date) {
      return original === current.toISOString();
    }
    const normalizeEmpty = (val: any) =>
      val === null || val === undefined || val === "" ? "" : val;
    return normalizeEmpty(original) === normalizeEmpty(current);
  };

  const updateFormField = (field: keyof CreateTaskRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (originalFormData && editingTask) {
      const originalValue = originalFormData[field];
      const newDirtyFields = new Set(dirtyFields);

      if (areValuesEqual(originalValue, value)) {
        newDirtyFields.delete(field);
      } else {
        newDirtyFields.add(field);
      }
      setDirtyFields(newDirtyFields);
    }
  };

  const getLocalISOString = (date: Date): string => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

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

  // Determine if stage changed (edit mode only)
  const stageChanged = useMemo(() => {
    if (!editingTask || !originalFormData) return false;
    return formData.taskStageId !== originalFormData.taskStageId;
  }, [editingTask, formData.taskStageId, originalFormData]);

 // In AddTaskModal component, update the useEffect that sets initial form data

 useEffect(() => {
  if (!isOpen) {
    setOriginalFormData(null);
    setDirtyFields(new Set());
    setComment("");
    return;
  }

  if (editingTask) {
    const initialData: CreateTaskRequest = {
      subject: editingTask.subject || "",
      description: editingTask.description || "",
      priority: editingTask.priority || "LOW",
      taskStageId: editingTask.taskStageId || 0,
      startDate: editingTask.startDate || new Date().toISOString(),
      endDate: editingTask.endDate || "",
      assignee: editingTask.assignee?.id || "",
      acceptanceCriteria: editingTask.acceptanceCriteria || "",
    };
    setFormData(initialData);
    setOriginalFormData(initialData);
    setDirtyFields(new Set());
    setComment("");
  } else {
    const adjustedTime = getAdjustedCurrentTime();
    
    // Set first stage as default if available, otherwise use preSelectedStageId or 0
    const defaultStageId = stages.length > 0 
      ? stages[0].id 
      : preSelectedStageId || 0;

    const newTaskData: CreateTaskRequest = {
      subject: "",
      description: "",
      priority: "LOW",
      taskStageId: defaultStageId,
      startDate: getLocalISOString(adjustedTime),
      endDate: "",
      assignee: "",
      acceptanceCriteria: "",
    };
    setFormData(newTaskData);
    setOriginalFormData(null);
    setDirtyFields(new Set());
    setComment("");
  }
}, [isOpen, editingTask, preSelectedStageId, stages]); // Added stages to dependency array

  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen) return;
      try {
        setIsLoading(true);
        const stagesRes = await getTaskStagesDropdown();
        if (stagesRes?.isSuccess && stagesRes.data) {
          setStages(stagesRes.data);
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

    // Comment required only if stage changed in edit mode
    if (editingTask && stageChanged && !comment.trim()) {
      toast({
        title: "Validation Error",
        description: "Comment is required when changing the stage.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingTask) {
        if (dirtyFields.size === 0 && !(stageChanged && comment.trim())) {
          toast({
            title: "No Changes",
            description: "No changes were made to the task.",
            variant: "default",
          });
          onClose();
          return;
        }

        const updatePayload: Partial<UpdateTaskRequest> = {};
        dirtyFields.forEach((field) => {
          if (field === "endDate" && formData[field] === "") {
            (updatePayload as any)[field] = null;
          } else {
            (updatePayload as any)[field] = formData[field];
          }
        });

        // include comment if provided (always include when stage changed)
        if (comment.trim()) {
          updatePayload.comment = comment.trim();
        }

        onSubmit(updatePayload, true);
      } else {
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

  const handleDateChange = (value: string, field: "startDate" | "endDate") => {
    try {
      if (!value) {
        updateFormField(field, "");
        return;
      }
      if (field === "startDate") {
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

  const formatDateForInput = (dateString: string) => {
    if (!dateString) return "";
    try {
      let date: Date;
      if (dateString.includes("T")) {
        if (
          !dateString.includes("Z") &&
          !dateString.includes("+") &&
          !dateString.includes("-", 10)
        ) {
          const [datePart, timePart] = dateString.split("T");
          const [year, month, day] = datePart.split("-").map(Number);
          const [hour, minute, second] = timePart.split(":").map(Number);
          date = new Date(year, month - 1, day, hour, minute, second || 0);
        } else {
          date = new Date(dateString);
        }
      } else {
        const [year, month, day] = dateString.split("-").map(Number);
        date = new Date(year, month - 1, day);
      }
      if (isNaN(date.getTime())) return "";
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };

  const getPreSelectedStageName = () => {
    if (preSelectedStageId && stages.length > 0) {
      const selectedStage = stages.find(
        (stage) => stage.id === preSelectedStageId
      );
      return selectedStage?.name;
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                    • {dirtyFields.size} field
                    {dirtyFields.size !== 1 ? "s" : ""} modified
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
              Subject <span className="text-red-500">*</span>
              {dirtyFields.has("subject") && (
                <span className="text-blue-600 text-xs ml-1">• Modified</span>
              )}
            </Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => updateFormField("subject", e.target.value)}
              placeholder="Enter Subject"
              required
              className="w-full"
            />
          </div>

          {/* Row 1: Priority and Stage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Priority <span className="text-red-500">*</span>
                {dirtyFields.has("priority") && (
                  <span className="text-blue-600 text-xs ml-1">• Modified</span>
                )}
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  updateFormField("priority", value as typeof formData.priority)
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
    Stage <span className="text-red-500">*</span>
    {dirtyFields.has("taskStageId") && (
      <span className="text-blue-600 text-xs ml-1">• Modified</span>
    )}
  </Label>

  {hasPreSelectedStage ? (
    <div className="flex items-center gap-2 p-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700">
      <span className="text-sm">
        {stages.find((stage) => stage.id === preSelectedStageId)
          ?.name || "Selected Stage"}
      </span>
      <input
        type="hidden"
        value={preSelectedStageId || ""}
        onChange={(e) =>
          updateFormField("taskStageId", parseInt(e.target.value))
        }
      />
    </div>
  ) : editingTask ? (
    // For editing: allow stage change
    <Select
      value={formData.taskStageId?.toString() || ""}
      onValueChange={(value) => {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue)) {
          updateFormField("taskStageId", numValue);
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
  ) : (
    // For new tasks: show first stage as default and don't allow change
    <div className="flex items-center gap-2 p-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700">
      <span className="text-sm">
        {stages.length > 0 ? stages[0].name : "No stages available"}
      </span>
      <input
        type="hidden"
        value={stages.length > 0 ? stages[0].id : ""}
        onChange={(e) =>
          updateFormField("taskStageId", parseInt(e.target.value))
        }
      />
    </div>
  )}
</div>
          </div>

          {/* Comment field - Only show in edit mode when stage is changed */}
          {editingTask && stageChanged && (
            <div className="space-y-2 ">
              <Label className="text-sm font-medium text-foreground">
                Comment <span className="text-red-500">*</span>
                <span className="text-xs text-gray-600 ml-2">
                  Required because stage was changed
                </span>
              </Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Explain the reason for changing the stage..."
                rows={3}
                className={`resize-none ${
                  !comment.trim() ? "border-red-300 focus:border-red-400" : ""
                }`}
                required
              />
              {!comment.trim() && (
                <p className="text-xs text-gray-600">
                  Comment is required when changing the stage.
                </p>
              )}
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Start Date <span className="text-red-500">*</span>
                {dirtyFields.has("startDate") && (
                  <span className="text-blue-600 text-xs ml-1">• Modified</span>
                )}
              </Label>
              <Input
                type="date"
                value={formatDateForInput(formData.startDate)}
                onChange={(e) => handleDateChange(e.target.value, "startDate")}
                className="w-full"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                End Date (Optional):
                {dirtyFields.has("endDate") && (
                  <span className="text-blue-600 text-xs ml-1">• Modified</span>
                )}
              </Label>
              <Input
                type="date"
                value={formatDateForInput(formData.endDate)}
                onChange={(e) => handleDateChange(e.target.value, "endDate")}
                className="w-full"
              />
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Assignee <span className="text-red-500">*</span>
              {dirtyFields.has("assignee") && (
                <span className="text-blue-600 text-xs ml-1">• Modified</span>
              )}
            </Label>
            <Select
              value={formData.assignee}
              onValueChange={(value) => updateFormField("assignee", value)}
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

          {/* Description - Now with Rich Text Editor with smaller height */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Description <span className="text-red-500">*</span>
              {dirtyFields.has("description") && (
                <span className="text-blue-600 text-xs ml-1">• Modified</span>
              )}
            </Label>
            <RichTextEditor
              value={formData.description}
              onChange={(value) => updateFormField("description", value)}
              placeholder="Enter Description"
              minHeight="120px"
              className=""
            />
          </div>

          {/* Acceptance Criteria - Keep original size */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground text-blue-600">
              Acceptance Criteria
              {dirtyFields.has("acceptanceCriteria") && (
                <span className="text-blue-600 text-xs ml-1">• Modified</span>
              )}
            </Label>
            <RichTextEditor
              value={formData.acceptanceCriteria || ""}
              onChange={(value) => updateFormField("acceptanceCriteria", value)}
              placeholder="Start typing your acceptance criteria..."
              minHeight="200px"
              className=""
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