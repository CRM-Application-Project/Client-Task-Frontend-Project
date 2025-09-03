"use client";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { RRule, RRuleSet, rrulestr, Frequency } from 'rrule';
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
  Repeat,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";

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
    reviewer: string; // Add this field

  acceptanceCriteria?: string;
  graceHours?: number;
  estimatedHours?: number;
  recurrence?: RecurrenceRule;
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
    reviewer?: string; // Add this field

  comment?: string;
  graceHours?: number;
  estimatedHours?: number;
  recurrence?: RecurrenceRule;
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
    reviewer: {
      id: string;
      label: string;
    };
    acceptanceCriteria?: string;
    recurrence?: RecurrenceRule;
  };
}

// Recurrence types
interface RecurrenceRule {
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  interval: number;
  endType: "NEVER" | "AFTER" | "ON_DATE";
  endAfter?: number;
  endOnDate?: string;
  byWeekDay?: number[];
  byMonthDay?: number[];
  byMonth?: number[];
  excludeWeekends?: boolean;
  rruleString?: string; // Add this field to store the RRule string
}

export interface StoredUserData {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber: string | null;
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
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const descriptionRef = useRef<HTMLDivElement>(null);
  const [showRecurrence, setShowRecurrence] = useState(false);

  const [formData, setFormData] = useState<CreateTaskRequest>({
    subject: "",
    description: "",
    priority: "LOW",
    taskStageId: 0,
    startDate: new Date().toISOString(),
    endDate: "",
    assignee: "",
     reviewer: "",
    acceptanceCriteria: "",
    graceHours: 0,
    estimatedHours: 0,
    recurrence: undefined,
  });

  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule>({
    frequency: "WEEKLY",
    interval: 1,
    endType: "NEVER",
    excludeWeekends: true,
    byWeekDay: [1, 2, 3, 4, 5], // Default to weekdays (Mon-Fri)
  });
  const getStoredUserData = (): StoredUserData | null => {
  if (typeof window !== 'undefined') {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  }
  return null;
};

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

  const frequencies = [
    { value: "DAILY", label: "Daily" },
    { value: "WEEKLY", label: "Weekly" },
    { value: "MONTHLY", label: "Monthly" },
    { value: "YEARLY", label: "Yearly" },
  ];

const weekDays = [
  { value: 0, label: "Sunday", short: "SU", rrule: RRule.SU },
  { value: 1, label: "Monday", short: "MO", rrule: RRule.MO },
  { value: 2, label: "Tuesday", short: "TU", rrule: RRule.TU },
  { value: 3, label: "Wednesday", short: "WE", rrule: RRule.WE },
  { value: 4, label: "Thursday", short: "TH", rrule: RRule.TH },
  { value: 5, label: "Friday", short: "FR", rrule: RRule.FR },
  { value: 6, label: "Saturday", short: "SA", rrule: RRule.SA },
];

  // Frequency mapping function
  const getFrequencyConstant = (frequency: string): Frequency => {
    switch (frequency) {
      case "DAILY":
        return RRule.DAILY;
      case "WEEKLY":
        return RRule.WEEKLY;
      case "MONTHLY":
        return RRule.MONTHLY;
      case "YEARLY":
        return RRule.YEARLY;
      default:
        return RRule.WEEKLY;
    }
  };

  const convertToRRuleString = (rule: RecurrenceRule, startDate: string): string => {
    //@ts-ignore
    const options: Partial<RRule.Options> = {
      freq: getFrequencyConstant(rule.frequency),
      interval: rule.interval,
    };

    // Set byweekday if provided
    if (rule.byWeekDay && rule.byWeekDay.length > 0) {
      options.byweekday = rule.byWeekDay.map(day => weekDays[day].rrule);
    }

    // Set end condition
    if (rule.endType === "AFTER" && rule.endAfter) {
      options.count = rule.endAfter;
    } else if (rule.endType === "ON_DATE" && rule.endOnDate) {
      options.until = new Date(rule.endOnDate);
    }

    // Handle exclude weekends
    if (rule.excludeWeekends) {
      // For RRule, we need to use a ruleset with exdate for weekends
      const rrule = new RRule(options);
      const ruleSet = new RRuleSet();
      ruleSet.rrule(rrule);
      
      // Add exrule for weekends (Saturday and Sunday)
      const exrule = new RRule({
        freq: RRule.WEEKLY,
        byweekday: [RRule.SA, RRule.SU],
      });
      ruleSet.exrule(exrule);
      
      return ruleSet.toString();
    }

    const rrule = new RRule(options);
    return rrule.toString();
  };

  // Add this function to parse RRule string back to your format
  const parseRRuleString = (rruleString: string): Partial<RecurrenceRule> => {
    try {
      const rule = rrulestr(rruleString);
      const options = rule.options;
      
      const result: Partial<RecurrenceRule> = {
        frequency: getFrequencyName(options.freq),
        interval: options.interval || 1,
      };

      if (options.byweekday) {
        result.byWeekDay = options.byweekday.map((day: any) => {
          if (typeof day === 'number') return day;
          return day.weekday;
        });
      }

      if (options.count) {
        result.endType = "AFTER";
        result.endAfter = options.count;
      } else if (options.until) {
        result.endType = "ON_DATE";
        result.endOnDate = options.until.toISOString();
      } else {
        result.endType = "NEVER";
      }

      return result;
    } catch (error) {
      console.error("Error parsing RRule string:", error);
      return {};
    }
  };

  // Helper function to get frequency name from RRule constant
  const getFrequencyName = (freq: Frequency): RecurrenceRule['frequency'] => {
    switch (freq) {
      case RRule.DAILY:
        return "DAILY";
      case RRule.WEEKLY:
        return "WEEKLY";
      case RRule.MONTHLY:
        return "MONTHLY";
      case RRule.YEARLY:
        return "YEARLY";
      default:
        return "WEEKLY";
    }
  };

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

  // Validate individual field
  const validateField = (field: keyof CreateTaskRequest, value: any): string => {
    // For edit mode, validate if field is dirty OR if it's a required field that's now empty
    const isRequiredField = ["subject", "description", "taskStageId", "assignee", "estimatedHours", "startDate"].includes(field);
    const isEmpty = !value || (typeof value === "string" && !value.trim()) || value === 0;
    
    if (editingTask && !dirtyFields.has(field) && field !== "description") {
      // Only skip validation if it's not a required field or it's not empty
      if (!isRequiredField || !isEmpty) {
        return ""; // Skip validation for unchanged fields in edit mode
      }
    }

    switch (field) {
      case "subject":
        if (!value?.trim()) return "Subject is required";
        break;
      case "description":
        if (!value?.trim()) return "Description is required";
        break;
      case "taskStageId":
        if (!value || value === 0) return "Please select a stage";
        break;
      case "assignee":
        if (!value?.trim()) return "Please select an assignee";
        break;
      case "estimatedHours":
        if (!value || value <= 0) return "Estimated hours must be greater than 0";
        break;
      case "startDate":
        if (!value) return "Start date is required";
        break;
      case "endDate":
        if (value && formData.startDate) {
          const startDate = new Date(formData.startDate);
          const endDate = new Date(value);
          
          // Add 1 day to start date for comparison
          const minEndDate = new Date(startDate);
          minEndDate.setDate(startDate.getDate() + 1);
          
          if (endDate <= minEndDate) {
            return "End date must be at least 1 day after start date";
          }
        }
        break;
      default:
        return "";
    }
    return "";
  };
const getReviewerDisplayName = (reviewerId: string, users: User[]): string => {
  if (!reviewerId || !users || users.length === 0) {
    // Get current user from localStorage as default
    const currentUser = getStoredUserData();
    return currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : "Select reviewer";
  }
  
  const reviewer = users.find(user => user.userId === reviewerId);
  return reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : "Select reviewer";
};
  // Validate comment field
  const validateComment = (): string => {
    if (editingTask && stageChanged && !comment.trim()) {
      return "Comment is required when changing the stage";
    }
    return "";
  };

  // Update form field with validation
  const updateFormField = (field: keyof CreateTaskRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Mark field as touched
    setTouchedFields(prev => new Set(prev).add(field));

    // Always validate the field immediately, regardless of edit mode
    const error = validateField(field, value);
    setValidationErrors(prev => ({
      ...prev,
      [field]: error
    }));

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

  // Handle description change with validation
  const handleDescriptionChange = (value: string) => {
    updateFormField("description", value);
  };

  // Handle comment change with validation
  const handleCommentChange = (value: string) => {
    setComment(value);
    
    // Validate comment if stage changed
    if (stageChanged) {
      const error = validateComment();
      setValidationErrors(prev => ({
        ...prev,
        comment: error
      }));
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

  // Check if all mandatory fields are filled for new tasks
  const isMandatoryFieldsFilled = useMemo(() => {
    if (editingTask) return true; // For edit mode, always allow submission
    
    return (
      formData.subject.trim() !== "" &&
      formData.description.trim() !== "" &&
      formData.taskStageId > 0 &&
      formData.reviewer.trim() !== "" && // Add this line
      formData.assignee.trim() !== "" &&
      (formData.estimatedHours ?? 0) > 0
    );
  }, [editingTask, formData]);

  // Check if form is submittable
  const canSubmit = useMemo(() => {
    if (editingTask) {
      // For edit mode: allow if there are changes or stage changed with comment
      return dirtyFields.size > 0 || (stageChanged && comment.trim() !== "");
    } else {
      // For add mode: only allow if all mandatory fields are filled
      return isMandatoryFieldsFilled;
    }
  }, [editingTask, dirtyFields.size, stageChanged, comment, isMandatoryFieldsFilled]);

  useEffect(() => {
    if (!isOpen) {
      setOriginalFormData(null);
      setDirtyFields(new Set());
      setComment("");
      setValidationErrors({});
      setTouchedFields(new Set());
      setShowRecurrence(false);
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
        reviewer: editingTask.reviewer.label || "",
        assignee: editingTask.assignee?.id || "",
        acceptanceCriteria: editingTask.acceptanceCriteria || "",
        graceHours: editingTask.graceHours ?? 0,
        estimatedHours: editingTask.estimatedHours ?? 0,
        recurrence: editingTask.recurrence,
      };
      setFormData(initialData);
      setOriginalFormData(initialData);
      setDirtyFields(new Set());
      setComment("");
      setTouchedFields(new Set());
      
        if (editingTask.recurrence) {
      // If we have an RRule string, parse it
      if (editingTask.recurrence.rruleString) {
        const parsedRule = parseRRuleString(editingTask.recurrence.rruleString);
        setRecurrenceRule({
          ...editingTask.recurrence,
          ...parsedRule,
        });
      } else {
        setRecurrenceRule(editingTask.recurrence);
      }
      setShowRecurrence(true);
    }
    } else {
      const adjustedTime = getAdjustedCurrentTime();
      
      const defaultStageId = stages.length > 0 
        ? stages[0].id 
        : preSelectedStageId || 0;
           // Get current user from localStorage
    const currentUser = getStoredUserData();
const defaultReviewer = `${currentUser?.firstName ?? ""} ${currentUser?.lastName ?? ""}`.trim();

      const newTaskData: CreateTaskRequest = {
        subject: "",
        description: "",
        priority: "LOW",
        taskStageId: defaultStageId,
        startDate: getLocalISOString(adjustedTime),
        endDate: "",
        assignee: "",
        reviewer: defaultReviewer, 

        acceptanceCriteria: "",
        graceHours: 0,
        estimatedHours: 0,
        recurrence: undefined,
      };
      setFormData(newTaskData);
      setOriginalFormData(null);
      setDirtyFields(new Set());
      setComment("");
      setTouchedFields(new Set());
      setShowRecurrence(false);
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

  // Validate all fields before submission
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (editingTask) {
      // For edit mode, validate all required fields (not just dirty ones)
      const requiredFields: (keyof CreateTaskRequest)[] = [
        "subject", "description", "taskStageId", "assignee", "reviewer", "estimatedHours", "startDate"
      ];
      
      requiredFields.forEach(field => {
        const error = validateField(field, formData[field]);
        if (error) {
          errors[field] = error;
        }
      });
      
      // Also validate dirty fields that aren't required
      dirtyFields.forEach(field => {
        if (!requiredFields.includes(field)) {
          const error = validateField(field, formData[field]);
          if (error) {
            errors[field] = error;
          }
        }
      });
    } else {
      // For add mode, validate all required fields
      Object.keys(formData).forEach(field => {
        if (field === "graceHours" || field === "acceptanceCriteria" || field === "recurrence") {
          return; // Skip optional fields
        }

        const error = validateField(field as keyof CreateTaskRequest, formData[field as keyof CreateTaskRequest]);
        if (error) {
          errors[field] = error;
        }
      });
    }

    // Validate recurrence if enabled
    if (showRecurrence) {
      if (recurrenceRule.endType === "AFTER" && (!recurrenceRule.endAfter || recurrenceRule.endAfter < 1)) {
        errors.recurrence = "Please enter a valid number of occurrences";
      } else if (recurrenceRule.endType === "ON_DATE" && (!recurrenceRule.endOnDate || new Date(recurrenceRule.endOnDate) <= new Date(formData.startDate))) {
        errors.recurrence = "End date must be after the start date";
      }
    }

    // Validate comment if stage changed
    if (editingTask && stageChanged) {
      const commentError = validateComment();
      if (commentError) {
        errors.comment = commentError;
      }
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
      const taskData = { ...formData };
      
    if (showRecurrence) {
      // Generate RRule string
      const rruleString = convertToRRuleString(recurrenceRule, formData.startDate);
      taskData.recurrence = {
        ...recurrenceRule,
        rruleString, // Add the RRule string to the recurrence object
      };
      
      // STORE RECURRENCE RULE IN CONSOLE.LOG
      console.log("RRule String:", rruleString);
    } else {
      taskData.recurrence = undefined;
    }

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

        // Add recurrence if changed
        if (showRecurrence) {
          updatePayload.recurrence = recurrenceRule;
          
          // STORE RECURRENCE RULE IN CONSOLE.LOG
          console.log("Recurrence Rule to be sent to backend:", recurrenceRule);
        } else {
          updatePayload.recurrence = undefined;
        }

        if (comment.trim()) {
          updatePayload.comment = comment.trim();
        }

        onSubmit(updatePayload, true);
      } else {
        // STORE COMPLETE TASK DATA IN CONSOLE.LOG
        console.log("Complete task data to be sent to backend:", taskData);
        onSubmit(taskData, false);
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

  const handleRecurrenceChange = (field: keyof RecurrenceRule, value: any) => {
    setRecurrenceRule(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleWeekDay = (dayValue: number) => {
    const currentDays = recurrenceRule.byWeekDay || [];
    let newDays;
    
    if (currentDays.includes(dayValue)) {
      newDays = currentDays.filter(d => d !== dayValue);
    } else {
      newDays = [...currentDays, dayValue];
    }
    
    // Sort days to maintain order (Mon, Tue, Wed, etc.)
    newDays.sort((a, b) => a - b);
    
    handleRecurrenceChange("byWeekDay", newDays);
  };

  const toggleRecurrence = (checked: boolean) => {
    setShowRecurrence(checked);
    if (!checked) {
      // Reset recurrence rule when turning off
      setRecurrenceRule({
        frequency: "WEEKLY",
        interval: 1,
        endType: "NEVER",
        excludeWeekends: true,
        byWeekDay: [1, 2, 3, 4, 5],
      });
    }
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
              Subject {!editingTask && <span className="text-red-500">*</span>}
              {dirtyFields.has("subject") && (
                <span className="text-blue-600 text-xs ml-1">• Modified</span>
              )}
            </Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => updateFormField("subject", e.target.value)}
              onBlur={() => setTouchedFields(prev => new Set(prev).add("subject"))}
              placeholder="Enter Subject"
              className={`w-full ${validationErrors.subject ? "border-red-500" : ""}`}
            />
            {validationErrors.subject && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.subject}</p>
            )}
          </div>

          {/* Row 1: Priority and Stage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Priority {!editingTask && <span className="text-red-500">*</span>}
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
                <p className="text-red-500 text-xs mt-1">{validationErrors.priority}</p>
              )}
            </div>
          
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Stage {!editingTask && <span className="text-red-500">*</span>}
                {dirtyFields.has("taskStageId") && (
                  <span className="text-blue-600 text-xs ml-1">• Modified</span>
                )}
              </Label>

              {hasPreSelectedStage ? (
                <>
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
                  {validationErrors.taskStageId && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.taskStageId}</p>
                  )}
                </>
              ) : editingTask ? (
                <>
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
                  {validationErrors.taskStageId && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.taskStageId}</p>
                  )}
                </>
              ) : (
                <>
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
                  {validationErrors.taskStageId && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.taskStageId}</p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Recurrence Section */}
          <div className="space-y-4 border rounded-md p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat size={18} />
                <Label className="text-sm font-medium text-foreground">
                  Recurrence
                </Label>
              </div>
               <Switch
    checked={showRecurrence}
    onCheckedChange={toggleRecurrence}
    className="data-[state=checked]:bg-brand-primary"
  />
            </div>

            {showRecurrence && (
              <div className="space-y-4 mt-4 pl-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">
                      Repeat every
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={recurrenceRule.interval}
                        onChange={(e) => handleRecurrenceChange("interval", parseInt(e.target.value) || 1)}
                        className="w-20"
                      />
                      <Select
                        value={recurrenceRule.frequency}
                        onValueChange={(value) => handleRecurrenceChange("frequency", value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {frequencies.map((freq) => (
                            <SelectItem key={freq.value} value={freq.value}>
                              {freq.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">
                      Ends
                    </Label>
                    <Select
                      value={recurrenceRule.endType}
                      onValueChange={(value) => handleRecurrenceChange("endType", value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEVER">Never</SelectItem>
                        <SelectItem value="AFTER">After</SelectItem>
                        <SelectItem value="ON_DATE">On date</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {recurrenceRule.endType === "AFTER" && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">
                      Number of occurrences
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={recurrenceRule.endAfter || 1}
                      onChange={(e) => handleRecurrenceChange("endAfter", parseInt(e.target.value) || 1)}
                      className="w-32"
                    />
                  </div>
                )}

                {recurrenceRule.endType === "ON_DATE" && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">
                      End date
                    </Label>
                    <input
                      type="date"
                      value={recurrenceRule.endOnDate ? new Date(recurrenceRule.endOnDate).toISOString().split('T')[0] : ""}
                      onChange={(e) => handleRecurrenceChange("endOnDate", e.target.value)}
                      min={new Date(formData.startDate).toISOString().split('T')[0]}
                      className="w-full h-10 rounded-md border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-gray-400 border-gray-300"
                    />
                  </div>
                )}

                {recurrenceRule.frequency === "WEEKLY" && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">
                      Repeat on
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {weekDays.map((day) => (
                        <Button
                          key={day.value}
                          type="button"
                          variant={recurrenceRule.byWeekDay?.includes(day.value) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleWeekDay(day.value)}
                          className="h-8 px-2"
                        >
                          {day.short}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Switch
                    id="exclude-weekends"
                    checked={recurrenceRule.excludeWeekends}
                    onCheckedChange={(checked) => handleRecurrenceChange("excludeWeekends", checked)}
                    className="data-[state=checked]:bg-brand-primary"
                  />
                  <Label htmlFor="exclude-weekends" className="text-sm">
                    Exclude weekends
                  </Label>
                </div>

                {validationErrors.recurrence && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.recurrence}</p>
                )}
              </div>
            )}
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
                onChange={(e) => handleCommentChange(e.target.value)}
                onBlur={() => setTouchedFields(prev => new Set(prev).add("comment"))}
                placeholder="Explain the reason for changing the stage..."
                rows={3}
                className={`resize-none ${validationErrors.comment ? "border-red-500" : ""}`}
              />
              {validationErrors.comment && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.comment}</p>
              )}
            </div>
          )}

          {/* Dates with Time Picker */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Start Date & Time {!editingTask && <span className="text-red-500">*</span>}
                {dirtyFields.has("startDate") && (
                  <span className="text-blue-600 text-xs ml-1">• Modified</span>
                )}
              </Label>
              <input
                type="datetime-local"
                value={formatDateTimeForInput(formData.startDate)}
                onChange={(e) => handleDateTimeChange(e.target.value, "startDate")}
                onBlur={() => setTouchedFields(prev => new Set(prev).add("startDate"))}
                className={`w-full h-10 rounded-md border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-gray-400 ${validationErrors.startDate ? "border-red-500" : "border-gray-300"}`}
                min={getCurrentDateTime()}
              />
              {validationErrors.startDate && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.startDate}</p>
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
                onBlur={() => setTouchedFields(prev => new Set(prev).add("endDate"))}
                className={`w-full h-10 rounded-md border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-gray-400 ${validationErrors.endDate ? "border-red-500" : "border-gray-300"}`}
                min={getMinEndDate()}
              />
              {validationErrors.endDate && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.endDate}</p>
              )}
            </div>
          </div>

          {/* Grace Hours and Estimated Hours */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Estimated Hours
                {!editingTask && <span className="text-red-500 ml-1">*</span>}
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
                onBlur={() => setTouchedFields(prev => new Set(prev).add("estimatedHours"))}
                placeholder="Enter estimated hours"
                className={`w-full ${validationErrors.estimatedHours ? "border-red-500" : ""}`}
              />
              {validationErrors.estimatedHours && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.estimatedHours}</p>
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
                onBlur={() => setTouchedFields(prev => new Set(prev).add("graceHours"))}
                placeholder="Enter grace hours"
                className="w-full"
              />
            </div>
          </div>

   {/* Assignee and Reviewer */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div className="space-y-2">
    <Label className="text-sm font-medium text-foreground">
      Assignee {!editingTask && <span className="text-red-500">*</span>}
      {dirtyFields.has("assignee") && (
        <span className="text-blue-600 text-xs ml-1">• Modified</span>
      )}
    </Label>
    <Select
      value={formData.assignee}
      onValueChange={(value) => updateFormField("assignee", value)}
    >
      <SelectTrigger className={validationErrors.assignee ? "border-red-500" : ""}>
        <SelectValue 
          placeholder="Select Assignee"
        />
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
      <p className="text-red-500 text-xs mt-1">{validationErrors.assignee}</p>
    )}
  </div>

  <div className="space-y-2">
    <Label className="text-sm font-medium text-foreground">
      Reviewer {!editingTask && <span className="text-red-500">*</span>}
      {dirtyFields.has("reviewer") && (
        <span className="text-blue-600 text-xs ml-1">• Modified</span>
      )}
    </Label>
    <Select
      value={formData.reviewer}
      onValueChange={(value) => updateFormField("reviewer", value)}
    >
      <SelectTrigger className={validationErrors.reviewer ? "border-red-500" : ""}>
        <SelectValue 
          placeholder={getReviewerDisplayName(formData.reviewer, users)} 
        />
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
    {validationErrors.reviewer && (
      <p className="text-red-500 text-xs mt-1">{validationErrors.reviewer}</p>
    )}
  </div>
</div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Description {!editingTask && <span className="text-red-500">*</span>}
              {dirtyFields.has("description") && (
                <span className="text-blue-600 text-xs ml-1">• Modified</span>
              )}
            </Label>
            <div 
              className={`border rounded-md ${validationErrors.description ? "border-red-500" : "border-gray-300"}`}
              onBlur={() => setTouchedFields(prev => new Set(prev).add("description"))}
            >
              <RichTextEditor
                value={formData.description}
                onChange={handleDescriptionChange}
                placeholder="Enter Description"
                minHeight="120px"
              />
            </div>
            {validationErrors.description && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.description}</p>
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
              className="bg-brand-primary text-text-white hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !canSubmit}
            >
              {isLoading ? "Loading..." : editingTask ? "Update" : "Submit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};