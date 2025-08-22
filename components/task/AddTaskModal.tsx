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
  onSubmit: (task: CreateTaskRequest) => void;
  editingTask?: GetTaskByIdResponse["data"];
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
  users,
}: AddTaskModalProps) => {
  const [stages, setStages] = useState<TaskStage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formInitialized, setFormInitialized] = useState(false);
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

  const priorities: Array<CreateTaskRequest["priority"]> = [
    "LOW",
    "MEDIUM",
    "HIGH",
    "URGENT",
  ];

  // Memoize the editing task ID to prevent unnecessary re-renders
  const editingTaskId = useMemo(() => editingTask?.id, [editingTask?.id]);
  
  // Initialize form data when modal opens or editingTask changes
  useEffect(() => {
    if (!isOpen) {
      setFormInitialized(false);
      return;
    }

    // Prevent re-initialization if already initialized for the same task
    if (formInitialized && editingTaskId === editingTask?.id) {
      return;
    }

    if (editingTask) {
      setFormData({
        subject: editingTask.subject || "",
        description: editingTask.description || "",
        priority: editingTask.priority || "LOW",
        taskStageId: editingTask.taskStageId || 0,
        startDate: editingTask.startDate
          ? new Date(editingTask.startDate).toISOString()
          : new Date().toISOString(),
        endDate: editingTask.endDate
          ? new Date(editingTask.endDate).toISOString()
          : "",
        assignee: editingTask.assignee?.id || "",
        
      });
    } else {
      // Reset form for new task
      setFormData({
        subject: "",
        description: "",
        priority: "LOW",
        taskStageId: 0,
        startDate: new Date().toISOString(),
        endDate: "",
        assignee: "",
      });
    }
  }, [editingTask, isOpen]); // Added isOpen to dependencies

  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen) return; // Don't fetch if modal is closed
      
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
      onSubmit(formData);
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

  // Format date for <input type="date">


  // Handle date changes safely
  // Handle date changes safely
// Replace the existing handleDateChange and related functions in your AddTaskModal component

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
  
  // If we're past the current minute (has seconds), add 1 minute
  if (currentSeconds > 0) {
    now.setMinutes(currentMinutes + 1);
  }
  
  // Round up to next 5-minute interval
  const minutesToAdd = 5 - (now.getMinutes() % 5);
  if (minutesToAdd < 5) {
    now.setMinutes(now.getMinutes() + minutesToAdd);
  } else {
    // If already on 5-minute mark, add 5 more minutes
    now.setMinutes(now.getMinutes() + 5);
  }
  
  // Reset seconds and milliseconds
  now.setSeconds(0);
  now.setMilliseconds(0);
  
  return now;
};

// Updated handleDateChange function
const handleDateChange = (value: string, field: 'startDate' | 'endDate') => {
  try {
    if (!value) {
      setFormData({ ...formData, [field]: "" });
      return;
    }
    
    if (field === 'startDate') {
      const selectedDate = new Date(value);
      const today = new Date();
      
      // Check if selected date is today (compare year, month, day only)
      const isToday = 
        selectedDate.getDate() === today.getDate() &&
        selectedDate.getMonth() === today.getMonth() &&
        selectedDate.getFullYear() === today.getFullYear();
      
      if (isToday) {
        // For today's date, use adjusted current time (next 5-minute interval)
        const adjustedTime = getAdjustedCurrentTime();
        
        // Combine the selected date with the adjusted time
        const finalDate = new Date(selectedDate);
        finalDate.setHours(adjustedTime.getHours());
        finalDate.setMinutes(adjustedTime.getMinutes());
        finalDate.setSeconds(0);
        finalDate.setMilliseconds(0);
        
        // Convert to local ISO string (no timezone conversion)
        const localISOTime = getLocalISOString(finalDate);
        setFormData({
          ...formData,
          [field]: localISOTime,
        });
      } else {
        // For future dates, set time to 9:00 AM in local time
        selectedDate.setHours(9, 0, 0, 0);
        const localISOTime = getLocalISOString(selectedDate);
        setFormData({
          ...formData,
          [field]: localISOTime,
        });
      }
    } else {
      // For end date, set to end of day (23:59:59) in local time
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        console.error("Invalid date:", value);
        return;
      }
      
      date.setHours(23, 59, 59, 0); // Changed milliseconds to 0 for cleaner time
      const localISOTime = getLocalISOString(date);
      
      setFormData({
        ...formData,
        [field]: localISOTime,
      });
    }
  } catch (error) {
    console.error("Error handling date change:", error);
  }
};

// Updated formatDateForInput function to handle local time correctly
const formatDateForInput = (dateString: string) => {
  if (!dateString) return "";
  try {
    let date: Date;
    
    if (dateString.includes('T')) {
      // If it's a local ISO string (no timezone), treat as local time
      if (!dateString.includes('Z') && !dateString.includes('+') && !dateString.includes('-', 10)) {
        // This is a local ISO string, parse it as local time
        const [datePart, timePart] = dateString.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute, second] = timePart.split(':').map(Number);
        date = new Date(year, month - 1, day, hour, minute, second || 0);
      } else {
        // This has timezone info, parse normally
        date = new Date(dateString);
      }
    } else {
      // If it's just a date string, create date in local timezone
      const [year, month, day] = dateString.split('-').map(Number);
      date = new Date(year, month - 1, day);
    }
    
    if (isNaN(date.getTime())) return "";
    
    // Return date in YYYY-MM-DD format for the input
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};

// Updated initialization in useEffect (replace the existing formData initialization)
useEffect(() => {
  if (!isOpen) {
    setFormInitialized(false);
    return;
  }

  // Prevent re-initialization if already initialized for the same task
  if (formInitialized && editingTaskId === editingTask?.id) {
    return;
  }

  if (editingTask) {
    setFormData({
      subject: editingTask.subject || "",
      description: editingTask.description || "",
      priority: editingTask.priority || "LOW",
      taskStageId: editingTask.taskStageId || 0,
      startDate: editingTask.startDate || getLocalISOString(getAdjustedCurrentTime()),
      endDate: editingTask.endDate || "",
      assignee: editingTask.assignee?.id || "",
    });
  } else {
    // Reset form for new task with adjusted current time
    const adjustedTime = getAdjustedCurrentTime();
    setFormData({
      subject: "",
      description: "",
      priority: "LOW",
      taskStageId: 0,
      startDate: getLocalISOString(adjustedTime),
      endDate: "",
      assignee: "",
    });
  }
  
  setFormInitialized(true);
}, [editingTask, isOpen, editingTaskId]);

// Example usage in console to test the time adjustment:
console.log('Current time:', new Date().toLocaleTimeString());
console.log('Adjusted time:', getAdjustedCurrentTime().toLocaleTimeString());
console.log('Local ISO string:', getLocalISOString(getAdjustedCurrentTime()));

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            {editingTask ? "Edit Task" : "Add Task"}
            {!editingTask ? (
              <p className="text-xs text-[#636363] mt-1">
                Create a new task for your team
              </p>
            ) : (
              <p className="text-xs text-[#636363] mt-1">
                Edit the task details
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
            </Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
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
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    priority: value as typeof formData.priority,
                  })
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
                    setFormData({ ...formData, taskStageId: numValue });
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
              </Label>
              <Input
                type="date"
                value={formatDateForInput(formData.endDate)}
                onChange={(e) => handleDateChange(e.target.value, 'endDate')}
                className="w-full"
              />
            </div>
          </div>

          {/* Assignee (Single Select) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Assignee: *
            </Label>
            <Select
              value={formData.assignee}
              onValueChange={(value) => setFormData({ ...formData, assignee: value })}
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
            </Label>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
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