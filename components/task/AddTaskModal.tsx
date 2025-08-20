"use client";
import { useState, useEffect } from "react";
import { X, Calendar, ChevronDown, Check } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
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
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState<CreateTaskRequest>({
    subject: "",
    description: "",
    priority: "LOW",
    taskStageId: 0,
    startDate: new Date().toISOString(),
    endDate: "",
    assignees: [],
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
        assignees: editingTask.assignees?.map((a) => a.id) || [],
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
        assignees: [],
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

    if (
      !formData.subject ||
      !formData.taskStageId ||
      formData.assignees.length === 0
    ) {
      alert("Please fill all required fields");
      return;
    }

    onSubmit(formData);
    onClose();
  };

  const handleAssigneeChange = (userId: string) => {
    setFormData((prev) => {
      const newAssignees = prev.assignees.includes(userId)
        ? prev.assignees.filter((id) => id !== userId)
        : [...prev.assignees, userId];
      return { ...prev, assignees: newAssignees };
    });
  };

  // Helper function to format date for datetime-local input
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return "";

    const date = new Date(dateString);

    // Convert UTC to local time for display
    const localDate = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000
    );

    return localDate.toISOString().slice(0, 16);
  };

  // Helper function to convert local datetime to UTC ISO string
  const localToUTCISOString = (localDateTime: string): string => {
    if (!localDateTime) return "";

    const date = new Date(localDateTime);

    // The datetime-local input gives us local time, but we need to store as UTC
    // Create a proper ISO string in UTC
    const utcDate = new Date(
      Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
        date.getSeconds()
      )
    );

    return utcDate.toISOString();
  };

  // Get selected user names for display
  const getSelectedUsersText = () => {
    if (formData.assignees.length === 0) return "Select assignees";

    const selectedUsers = users.filter((user) =>
      formData.assignees.includes(user.userId)
    );

    if (selectedUsers.length === 1) {
      return `${selectedUsers[0].firstName} ${selectedUsers[0].lastName}`;
    }

    return `${selectedUsers.length} users selected`;
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
              <div className="relative">
                <Input
                  type="datetime-local"
                  value={formatDateForInput(formData.startDate)}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      startDate: localToUTCISOString(e.target.value),
                    });
                  }}
                  className="w-full"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                End Date (Optional):
              </Label>
              <div className="relative">
                <Input
                  type="datetime-local"
                  value={formatDateForInput(formData.endDate)}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      endDate: localToUTCISOString(e.target.value),
                    });
                  }}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Assignees */}
          <div className="space-y-2 relative">
            <Label className="text-sm font-medium text-foreground">
              Assignees: *
            </Label>

            <div className="relative">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() =>
                  setIsAssigneeDropdownOpen(!isAssigneeDropdownOpen)
                }
              >
                <span className="truncate">{getSelectedUsersText()}</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </button>

              {isAssigneeDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                  <div className="p-2 space-y-1">
                    {users.map((user) => (
                      <label
                        key={user.userId}
                        className="flex items-center px-2 py-1.5 rounded hover:bg-gray-100 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.assignees.includes(user.userId)}
                          onChange={() => handleAssigneeChange(user.userId)}
                          className="hidden"
                        />
                        <div
                          className={`w-4 h-4 flex items-center justify-center border rounded mr-2 ${
                            formData.assignees.includes(user.userId)
                              ? "bg-primary border-primary"
                              : "border-gray-300"
                          }`}
                        >
                          {formData.assignees.includes(user.userId) && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                        <span>
                          {user.firstName} {user.lastName}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Description:
            </Label>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Enter Description"
              rows={4}
              className="resize-none"
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
