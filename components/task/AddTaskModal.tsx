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
    isRecursive: editingTask?.isRecursive || false
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
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-3 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {editingTask ? 'Edit Task' : 'Add New Task'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {editingTask ? 'Update the task details' : 'Create a new task for your team'}
            </p>
          </div>
        
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 border border-[#e3e3e3] rounded-sm ">
          {/* Task Details Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Task Details</h3>
            
            {/* Subject */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">Subject *</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                placeholder="Enter task subject"
                required
                className="text-sm border-gray-300 focus:border-gray-500 focus:ring-gray-500"
              />
            </div>

            {/* Priority, Status, Label Row */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-700">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({...formData, priority: value as TaskPriority})}
                >
                  <SelectTrigger className="text-sm border-gray-300 focus:border-gray-500 focus:ring-gray-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map(priority => (
                      <SelectItem key={priority} value={priority} className="text-sm">
                        {priority}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-700">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({...formData, status: value as TaskStatus})}
                >
                  <SelectTrigger className="text-sm border-gray-300 focus:border-gray-500 focus:ring-gray-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map(status => (
                      <SelectItem key={status} value={status} className="text-sm">
                        {status.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-700">Label (Optional)</Label>
                <Select>
                  <SelectTrigger className="text-sm border-gray-300 focus:border-gray-500 focus:ring-gray-500">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug" className="text-sm">Bug</SelectItem>
                    <SelectItem value="feature" className="text-sm">Feature</SelectItem>
                    <SelectItem value="improvement" className="text-sm">Improvement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Recursive Toggle */}
            <div className="flex items-center space-x-2 mt-4">
              <Switch
                id="recursive"
                checked={formData.isRecursive}
                onCheckedChange={(checked) => setFormData({...formData, isRecursive: checked})}
                className="data-[state=checked]:bg-gray-600"
              />
              <Label htmlFor="recursive" className="text-xs font-medium text-gray-700">
                Recursive
              </Label>
            </div>

            {/* Start Date and End Date */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-700">Start Date</Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={formData.startDate ? formData.startDate.toISOString().split('T')[0] : ""}
                    onChange={(e) => setFormData({
                      ...formData, 
                      startDate: e.target.value ? new Date(e.target.value) : null
                    })}
                    placeholder="mm/dd/yyyy"
                    className="text-sm border-gray-300 focus:border-gray-500 focus:ring-gray-500 pr-10"
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-700">End Date</Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={formData.endDate ? formData.endDate.toISOString().split('T')[0] : ""}
                    onChange={(e) => setFormData({
                      ...formData, 
                      endDate: e.target.value ? new Date(e.target.value) : null
                    })}
                    placeholder="mm/dd/yyyy"
                    className="text-sm border-gray-300 focus:border-gray-500 focus:ring-gray-500 pr-10"
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Assign To */}
            <div className="space-y-1.5 mt-4">
              <Label className="text-xs font-medium text-gray-700">Assign To *</Label>
              <Select
                value={formData.assignedTo}
                onValueChange={(value) => setFormData({...formData, assignedTo: value})}
              >
                <SelectTrigger className="text-sm border-gray-300 focus:border-gray-500 focus:ring-gray-500">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="John Doe" className="text-sm">John Doe</SelectItem>
                  <SelectItem value="Jane Smith" className="text-sm">Jane Smith</SelectItem>
                  <SelectItem value="Mike Johnson" className="text-sm">Mike Johnson</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1.5 mt-4">
              <Label className="text-xs font-medium text-gray-700">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Enter task description..."
                rows={3}
                className="resize-none text-sm border-gray-300 focus:border-gray-500 focus:ring-gray-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-sm border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="text-sm bg-gray-800 hover:bg-gray-900 text-white"
            >
              {editingTask ? 'Update Task' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};