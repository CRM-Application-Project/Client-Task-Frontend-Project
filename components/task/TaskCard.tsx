"use client";
import { Calendar, User, Tag, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

// Define the Task type to match the one from Task.tsx
type TaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

interface Task {
  id: number;
  subject: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  labels: string[];
  assignedTo: string;
  createdBy: string;
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  taskStageId: number;
  taskStageName: string;
  assignees: Array<{
    id: string;
    label: string;
  }>;
}

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: number) => void;
}

type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export const TaskCard = ({ task, onEdit, onDelete }: TaskCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const priorityColors: Record<TaskPriority, string> = {
    LOW: "bg-muted text-muted-foreground",
    MEDIUM: "bg-status-todo/20 text-status-todo",
    HIGH: "bg-status-progress/20 text-status-progress",
    URGENT: "bg-destructive/20 text-destructive"
  } as const;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete(task.id);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <Card 
        className="p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] bg-gradient-to-br from-card to-card/80 border border-border/50 relative group"
        onClick={() => onEdit?.(task)}
      >
        {/* Delete button - only shows on hover */}
        <button 
          onClick={handleDeleteClick}
          className="absolute top-3 right-2 p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 z-10"
          aria-label="Delete task"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-foreground line-clamp-2 flex-1">
              {task.subject}
            </h3>
            <Badge 
              variant="outline" 
              className={`${priorityColors[task.priority]} whitespace-nowrap transition-transform duration-200 group-hover:-translate-x-6`}
            >
              {task.priority}
            </Badge>
          </div>

          {task.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}

          {task.labels.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <Tag className="h-3 w-3 text-muted-foreground" />
              {task.labels.map((label: string) => (
                <Badge key={label} variant="secondary" className="text-xs">
                  {label}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {task.assignedTo && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{task.assignedTo}</span>
              </div>
            )}

            {task.endDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{new Date(task.endDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {`This action cannot be undone. This will permanently delete the task "${task.subject}".`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};