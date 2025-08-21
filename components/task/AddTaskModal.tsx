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

export const AddTaskModal = ({
  isOpen,
  onClose,
  onSubmit,
  editingTask,
}: AddTaskModalProps) => {
  const [users, setUsers] = useState<User[]>([]);
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
        assignee: editingTask.assignee.id || "",
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
  }, [editingTask]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, stagesRes] = await Promise.all([
          getUsers(),
          getTaskStagesDropdown(),
        ]);

        if (usersRes.isSuccess) setUsers(usersRes.data);
        if (stagesRes.isSuccess) setStages(stagesRes.data);
      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description:
            error.message || "Failed to load data. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subject || !formData.taskStageId || !formData.assignee || !formData.description) {
      alert("Please fill all required fields");
      return;
    }

    onSubmit(formData);
    onClose();
  };

  // Format date for <input type="date">
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().slice(0, 10); // YYYY-MM-DD only
  };

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
                value={formData.taskStageId.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, taskStageId: parseInt(value) })
                }
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
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    startDate: new Date(e.target.value).toISOString(),
                  })
                }
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
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    endDate: new Date(e.target.value).toISOString(),
                  })
                }
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
                {users.map((user) => (
                  <SelectItem key={user.userId} value={user.userId}>
                    {user.firstName} {user.lastName}
                  </SelectItem>
                ))}
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
            >
              {editingTask ? "Update" : "Submit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
