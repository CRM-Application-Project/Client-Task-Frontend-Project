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
  graceHours?: number;
  estimatedHours?: number;
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
  graceHours?: number;
  estimatedHours?: number;
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
    graceHours?: number;
    estimatedHours?: number;
    assignee: {
      id: string;
      label: string;
    };
    acceptanceCriteria?: string;
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
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<CreateTaskRequest>({
    subject: "",
    description: "",
    priority: "LOW",
    taskStageId: 0,
    startDate: new Date().toISOString(),
    endDate: "",
    assignee: "",
    acceptanceCriteria: "",
    graceHours: 0,
    estimatedHours: 0,
  });

  const [originalFormData, setOriginalFormData] =
    useState<CreateTaskRequest | null>(null);
  const [dirtyFields, setDirtyFields] = useState<Set<keyof CreateTaskRequest>>(
    new Set()
  );
  const [comment, setComment] = useState<string>("");

  const priorities: Array<CreateTaskRequest["priority"]> = [
    "LOW",
    "MEDIUM",
    "HIGH",
    "URGENT",
  ];

  const hasPreSelectedStage = useMemo(() => {
    return !editingTask && preSelectedStageId && preSelectedStageId > 0;
  }, [editingTask, preSelectedStageId]);

  // Get minimum end date (start date + 1 day)
  const getMinEndDate = useCallback(() => {
    if (!formData.startDate) return getCurrentDateTime();
    
    try {
      const startDate = new Date(formData.startDate);
      const nextDay = new Date(startDate);
      nextDay.setDate(startDate.getDate() + 1);
      
      // Format for datetime-local input: YYYY-MM-DDTHH:MM
      const year = nextDay.getFullYear();
      const month = String(nextDay.getMonth() + 1).padStart(2, "0");
      const day = String(nextDay.getDate()).padStart(2, "0");
      const hours = String(nextDay.getHours()).padStart(2, "0");
      const minutes = String(nextDay.getMinutes()).padStart(2, "0");
      
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (error) {
      console.error("Error calculating min end date:", error);
      return getCurrentDateTime();
    }
  }, [formData.startDate]);

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

    // Clear validation error when field is updated
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

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

  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const stageChanged = useMemo(() => {
    if (!editingTask || !originalFormData) return false;
    return formData.taskStageId !== originalFormData.taskStageId;
  }, [editingTask, formData.taskStageId, originalFormData]);

  useEffect(() => {
    if (!isOpen) {
      setOriginalFormData(null);
      setDirtyFields(new Set());
      setComment("");
      setValidationErrors({});
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
        graceHours: editingTask.graceHours ?? 0,
        estimatedHours: editingTask.estimatedHours ?? 0,
      };
      setFormData(initialData);
      setOriginalFormData(initialData);
      setDirtyFields(new Set());
      setComment("");
    } else {
      const adjustedTime = getAdjustedCurrentTime();
      
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
        graceHours: 0,
        estimatedHours: 0,
      };
      setFormData(newTaskData);
      setOriginalFormData(null);
      setDirtyFields(new Set());
      setComment("");
    }
  }, [isOpen, editingTask, preSelectedStageId, stages]);

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

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.subject?.trim()) {
      errors.subject = "Subject is required";
    }

    if (!formData.description?.trim()) {
      errors.description = "Description is required";
    }

    if (!formData.taskStageId || formData.taskStageId === 0) {
      errors.taskStageId = "Please select a stage";
    }

    if (!formData.assignee?.trim()) {
      errors.assignee = "Please select an assignee";
    }

    // Validate estimated hours - must be greater than 0
    if (!formData.estimatedHours || formData.estimatedHours <= 0) {
      errors.estimatedHours = "Estimated hours must be greater than 0";
    }

    // Validate end date is after start date if provided
    if (formData.endDate && formData.startDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      
      // Add 1 day to start date for comparison
      const minEndDate = new Date(startDate);
      minEndDate.setDate(startDate.getDate() + 1);
      
      if (endDate <= minEndDate) {
        errors.endDate = "End date must be at least 1 day after start date";
      }
    }

    // Comment required only if stage changed in edit mode
    if (editingTask && stageChanged && !comment.trim()) {
      errors.comment = "Comment is required when changing the stage";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      // Show first error in toast
      const firstError = Object.values(validationErrors)[0];
      if (firstError) {
        toast({
          title: "Validation Error",
          description: firstError,
          variant: "destructive",
        });
      }
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

  const handleDateTimeChange = (value: string, field: "startDate" | "endDate") => {
    try {
      if (!value) {
        updateFormField(field, "");
        return;
      }

      const date = new Date(value);
      
      if (isNaN(date.getTime())) {
        console.error("Invalid datetime:", value);
        return;
      }

      const isoString = date.toISOString();
      updateFormField(field, isoString);

      // If start date is changed and end date exists, validate end date
      if (field === "startDate" && formData.endDate) {
        const endDate = new Date(formData.endDate);
        const minEndDate = new Date(date);
        minEndDate.setDate(date.getDate() + 1);
        
        if (endDate <= minEndDate) {
          setValidationErrors(prev => ({
            ...prev,
            endDate: "End date must be at least 1 day after start date"
          }));
        } else if (validationErrors.endDate) {
          setValidationErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.endDate;
            return newErrors;
          });
        }
      }
    } catch (error) {
      console.error("Error handling datetime change:", error);
    }
  };

  const formatDateTimeForInput = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (error) {
      console.error("Error formatting datetime:", error);
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            {editingTask ? "Edit Task" : "Add Task"}
            {!editingTask ? (
              <p className="text-xs text-text-secondary mt-1">
                Create a new task for your team
                {preSelectedStageId && getPreSelectedStageName() && (
                  <span className="text-blue-600 ml-1">
                    {`• Adding to "${getPreSelectedStageName()}" stage`}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-xs text-text-secondary mt-1">
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
              className={`w-full ${validationErrors.subject ? "border-red-500" : ""}`}
            />
            {validationErrors.subject && (
              <p className="text-red-500 text-xs">{validationErrors.subject}</p>
            )}
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
                <SelectTrigger className={validationErrors.priority ? "border-red-500" : ""}>
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
              {validationErrors.priority && (
                <p className="text-red-500 text-xs">{validationErrors.priority}</p>
              )}
            </div>
          
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Stage <span className="text-red-500">*</span>
                {dirtyFields.has("taskStageId") && (
                  <span className="text-blue-600 text-xs ml-1">• Modified</span>
                )}
              </Label>

              {hasPreSelectedStage ? (
                <div className={`flex items-center gap-2 p-2 border rounded-md bg-gray-50 text-gray-700 ${validationErrors.taskStageId ? "border-red-500" : "border-gray-300"}`}>
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
                <Select
                  value={formData.taskStageId?.toString() || ""}
                  onValueChange={(value) => {
                    const numValue = parseInt(value, 10);
                    if (!isNaN(numValue)) {
                      updateFormField("taskStageId", numValue);
                    }
                  }}
                >
                  <SelectTrigger className={validationErrors.taskStageId ? "border-red-500" : ""}>
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
                <div className={`flex items-center gap-2 p-2 border rounded-md bg-gray-50 text-gray-700 ${validationErrors.taskStageId ? "border-red-500" : "border-gray-300"}`}>
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
              {validationErrors.taskStageId && (
                <p className="text-red-500 text-xs">{validationErrors.taskStageId}</p>
              )}
            </div>
          </div>

          {/* Comment field */}
          {editingTask && stageChanged && (
            <div className="space-y-2">
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
                className={`resize-none ${validationErrors.comment ? "border-red-500" : ""}`}
              />
              {validationErrors.comment && (
                <p className="text-red-500 text-xs">{validationErrors.comment}</p>
              )}
            </div>
          )}

          {/* Dates with Time Picker */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Start Date & Time <span className="text-red-500">*</span>
                {dirtyFields.has("startDate") && (
                  <span className="text-blue-600 text-xs ml-1">• Modified</span>
                )}
              </Label>
              <input
                type="datetime-local"
                value={formatDateTimeForInput(formData.startDate)}
                onChange={(e) => handleDateTimeChange(e.target.value, "startDate")}
                className={`w-full h-10 rounded-md border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-gray-400 ${validationErrors.startDate ? "border-red-500" : "border-gray-300"}`}
                min={getCurrentDateTime()}
              />
              {validationErrors.startDate && (
                <p className="text-red-500 text-xs">{validationErrors.startDate}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                End Date & Time (Optional):
                {dirtyFields.has("endDate") && (
                  <span className="text-blue-600 text-xs ml-1">• Modified</span>
                )}
              </Label>
              <input
                type="datetime-local"
                value={formatDateTimeForInput(formData.endDate)}
                onChange={(e) => handleDateTimeChange(e.target.value, "endDate")}
                className={`w-full h-10 rounded-md border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-gray-400 ${validationErrors.endDate ? "border-red-500" : "border-gray-300"}`}
                min={getMinEndDate()}
              />
              {validationErrors.endDate && (
                <p className="text-red-500 text-xs">{validationErrors.endDate}</p>
              )}
            </div>
          </div>

          {/* Grace Hours and Estimated Hours */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Estimated Hours
                <span className="text-red-500 ml-1">*</span>
                {dirtyFields.has("estimatedHours") && (
                  <span className="text-blue-600 text-xs ml-1">• Modified</span>
                )}
              </Label>
              <Input
                type="number"
                min="0.5"
                step="0.5"
                value={formData.estimatedHours || 0}
                onChange={(e) => updateFormField("estimatedHours", parseFloat(e.target.value) || 0)}
                placeholder="Enter estimated hours"
                className={`w-full ${validationErrors.estimatedHours ? "border-red-500" : ""}`}
              />
              {validationErrors.estimatedHours && (
                <p className="text-red-500 text-xs">{validationErrors.estimatedHours}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Grace Hours (Optional)
                {dirtyFields.has("graceHours") && (
                  <span className="text-blue-600 text-xs ml-1">• Modified</span>
                )}
              </Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={formData.graceHours || 0}
                onChange={(e) => updateFormField("graceHours", parseFloat(e.target.value) || 0)}
                placeholder="Enter grace hours"
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
              <SelectTrigger className={validationErrors.assignee ? "border-red-500" : ""}>
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
            {validationErrors.assignee && (
              <p className="text-red-500 text-xs">{validationErrors.assignee}</p>
            )}
          </div>

          {/* Description */}
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
              className={validationErrors.description ? "border-red-500" : ""}
            />
            {validationErrors.description && (
              <p className="text-red-500 text-xs">{validationErrors.description}</p>
            )}
          </div>

          {/* Acceptance Criteria */}
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
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-brand-primary text-text-white hover:bg-brand-primary/90"
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