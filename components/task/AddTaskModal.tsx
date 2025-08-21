"use client";
import { useState, useEffect } from "react";
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

  // Initialize form data when editingTask changes
  useEffect(() => {
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
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      return date.toISOString().slice(0, 10); // YYYY-MM-DD only
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };

  // Handle date changes safely
  const handleDateChange = (value: string, field: 'startDate' | 'endDate') => {
    try {
      if (!value) {
        setFormData({ ...formData, [field]: "" });
        return;
      }
      
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        console.error("Invalid date:", value);
        return;
      }
      
      setFormData({
        ...formData,
        [field]: date.toISOString(),
      });
    } catch (error) {
      console.error("Error handling date change:", error);
    }
  };

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