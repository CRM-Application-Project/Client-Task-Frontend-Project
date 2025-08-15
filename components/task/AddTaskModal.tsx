"use client";
import { useState } from "react";
import { X, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Task, TaskPriority, TaskStatus } from "@/lib/task";

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  editingTask?: Task;
}

export const AddTaskModal = ({ isOpen, onClose, onSubmit, editingTask }: AddTaskModalProps) => {
  const [formData, setFormData] = useState({
    subject: editingTask?.subject || "",
    description: editingTask?.description || "",
    priority: editingTask?.priority || "LOW" as TaskPriority,
    status: editingTask?.status || "BACKLOG" as TaskStatus,
    labels: editingTask?.labels || [],
    assignedTo: editingTask?.assignedTo || "",
    createdBy: editingTask?.createdBy || "Current User",
    startDate: editingTask?.startDate || null,
    endDate: editingTask?.endDate || null,
    isRecursive: false
  });

  const priorities: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  const statuses: TaskStatus[] = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const taskData = {
      subject: formData.subject,
      description: formData.description || undefined,
      priority: formData.priority,
      status: formData.status,
      labels: formData.labels,
      assignedTo: formData.assignedTo || undefined,
      createdBy: formData.createdBy,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined
    };

    onSubmit(taskData);
    onClose();
    
    // Reset form
    setFormData({
      subject: "",
      description: "",
      priority: "LOW",
      status: "BACKLOG",
      labels: [],
      assignedTo: "",
      createdBy: "Current User",
      startDate: null,
      endDate: null,
      isRecursive: false
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            {editingTask ? 'Edit Task' : 'Add Task'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-sm font-medium text-foreground">
              Subject: *
            </Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({...formData, subject: e.target.value})}
              placeholder="Enter Subject"
              required
              className="w-full"
            />
          </div>

          {/* Row 1: Priority, Status, Label */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Priority:</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({...formData, priority: value as TaskPriority})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map(priority => (
                    <SelectItem key={priority} value={priority}>
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Status:</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({...formData, status: value as TaskStatus})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(status => (
                    <SelectItem key={status} value={status}>
                      {status.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Label (Optional):</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="feature">Feature</SelectItem>
                  <SelectItem value="improvement">Improvement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Recursive and Dates */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="recursive"
                checked={formData.isRecursive}
                onCheckedChange={(checked) => setFormData({...formData, isRecursive: checked})}
              />
              <Label htmlFor="recursive" className="text-sm font-medium text-foreground">
                Recursive
              </Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Start Date:</Label>
                <div className="relative">
                  <Input
                    type="datetime-local"
                    value={formData.startDate ? formData.startDate.toISOString().slice(0, 16) : ""}
                    onChange={(e) => setFormData({
                      ...formData, 
                      startDate: e.target.value ? new Date(e.target.value) : null
                    })}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">End Date:</Label>
                <div className="relative">
                  <Input
                    type="datetime-local"
                    value={formData.endDate ? formData.endDate.toISOString().slice(0, 16) : ""}
                    onChange={(e) => setFormData({
                      ...formData, 
                      endDate: e.target.value ? new Date(e.target.value) : null
                    })}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Assign To */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Assign To: *</Label>
            <Select
              value={formData.assignedTo}
              onValueChange={(value) => setFormData({...formData, assignedTo: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="John Doe">John Doe</SelectItem>
                <SelectItem value="Jane Smith">Jane Smith</SelectItem>
                <SelectItem value="Mike Johnson">Mike Johnson</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Description:</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Enter Description"
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {editingTask ? 'Update' : 'Submit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};