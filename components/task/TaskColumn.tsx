"use client";
import { TaskStatus } from "@/lib/task";
import { TaskCard } from "./TaskCard";
import { Badge } from "@/components/ui/badge";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { updateTask } from "@/app/services/data.service";

// Define the Task type to match the one from Task.tsx
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

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
  assignee: {
    id: string;
    label: string;
  };
}

interface TaskStage {
  id: number;
  name: string;
}

interface TaskColumnProps {
  stage: TaskStage;
  tasks: Task[];
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: number) => void;
  onTaskClick?: (taskId: number) => void;
  stageIndex: number;
  onTaskUpdate?: () => void;
}

// Dynamic color assignment based on stage position in the array
const getStageColors = (stageIndex: number, stageName: string) => {
  const stageColorsByPosition = [
    { color: "bg-slate-600", textColor: "text-white" },
    { color: "bg-blue-600", textColor: "text-white" },
    { color: "bg-amber-600", textColor: "text-white" },
    { color: "bg-purple-600", textColor: "text-white" },
    { color: "bg-green-600", textColor: "text-white" },
    { color: "bg-indigo-600", textColor: "text-white" },
    { color: "bg-pink-600", textColor: "text-white" },
    { color: "bg-red-600", textColor: "text-white" },
    { color: "bg-teal-600", textColor: "text-white" },
    { color: "bg-orange-600", textColor: "text-white" },
  ];

  const colorIndex = stageIndex % stageColorsByPosition.length;
  return stageColorsByPosition[colorIndex];
};

export const TaskColumn = ({ 
  stage, 
  tasks, 
  onEditTask, 
  onDeleteTask, 
  onTaskClick,
  stageIndex,
  onTaskUpdate
}: TaskColumnProps) => {
  const [isDraggedOver, setIsDraggedOver] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const { toast } = useToast();
  const stageColors = getStageColors(stageIndex, stage.name);
  const dragCounterRef = useRef(0);

  const handleDragStart = () => {
    // Reset drag over state when dragging starts from this column
    setIsDraggedOver(false);
    dragCounterRef.current = 0;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    
    // Check if we're dragging from external source (not from this column)
    const dragData = e.dataTransfer.types.includes('application/json');
    if (dragData) {
      setIsDraggedOver(true);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    
    // Only show drag over state if dragging from external source
    try {
      const dragDataString = e.dataTransfer.getData("application/json");
      if (dragDataString) {
        const dragData = JSON.parse(dragDataString);
        // Only show drag over effect if dragging from a different stage
        if (dragData.sourceStageId !== stage.id) {
          setIsDraggedOver(true);
        }
      }
    } catch (error) {
      // If we can't parse drag data, assume it's external
      setIsDraggedOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    
    // Only reset drag over state when completely leaving the column
    if (dragCounterRef.current <= 0) {
      setIsDraggedOver(false);
      dragCounterRef.current = 0;
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggedOver(false);
    dragCounterRef.current = 0;

    try {
      const dragDataString = e.dataTransfer.getData("application/json");
      if (!dragDataString) {
        console.error("No drag data found");
        return;
      }

      const dragData = JSON.parse(dragDataString);
      const { taskId, sourceStageId, task } = dragData;

      // Don't do anything if dropped on the same stage
      if (sourceStageId === stage.id) {
        return;
      }

      if (!task) {
        console.error("No task data found in drag data");
        toast({
          title: "Error",
          description: "Unable to move task. Task data not found.",
          variant: "destructive",
        });
        return;
      }

      setIsUpdating(true);
      setDraggedTaskId(taskId);

      // Prepare update data
      const updateData = {
        subject: task.subject,
        description: task.description,
        priority: task.priority,
        taskStageId: stage.id, // Move to new stage
        startDate: new Date(task.startDate).toISOString(),
        endDate: task.endDate ? new Date(task.endDate).toISOString() : "",
        assignee: task.assignee.id
      };

      // Call the update API
      const response = await updateTask(taskId, updateData);

      if (response.isSuccess) {
        toast({
          title: "Task Moved Successfully",
          description: `"${task.subject}" has been moved to ${stage.name}`,
          variant: "default",
        });

        // Refresh the task board immediately
        if (onTaskUpdate) {
          onTaskUpdate();
        }
      } else {
        throw new Error(response.message || "Failed to update task");
      }

    } catch (error) {
      console.error("Error moving task:", error);
      toast({
        title: "Error Moving Task",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
      setDraggedTaskId(null);
    }
  };

  return (
    <div 
      className="flex-1 min-w-[260px] max-w-[320px] bg-gray-100 rounded-lg pb-32"
      data-stage-id={stage.id}
      data-stage-name={stage.name}
    >
      <div className="mb-4">
        <div className={`${stageColors.color} ${stageColors.textColor} px-4 py-3 rounded-lg flex items-center justify-between shadow-sm`}>
          <h2 className="font-semibold text-sm uppercase tracking-wide">
            {stage.name}
          </h2>
          <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
            {tasks.length}
          </Badge>
        </div>
      </div>
      
      <div 
        className={`space-y-3 h-[500px] p-1 rounded-lg transition-all duration-200 overflow-y-auto ${
          isDraggedOver 
            ? 'bg-gray-50 border-2 border-gray-300 border-dashed shadow-inner' 
            : 'bg-transparent'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDragEnter={handleDragEnter}
        onDrop={handleDrop}
      >
        {/* Loading indicator */}
        {isUpdating && (
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center gap-2 text-blue-600">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">Moving task...</span>
            </div>
          </div>
        )}
        
        {/* Task cards */}
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
            onTaskClick={() => onTaskClick?.(task.id)}
            draggable={!isUpdating}
            isDragging={draggedTaskId === task.id}
            onDragStart={handleDragStart}
          />
        ))}
        
        {/* Empty state */}
        {tasks.length === 0 && !isUpdating && (
          <div className="text-center py-8 text-muted-foreground">
            <div className="rounded-lg p-6">
              <p className="text-sm">No tasks in this stage</p>
              {isDraggedOver && (
                <p className="text-xs text-blue-600 mt-2 font-medium">Drop task here</p>
              )}
            </div>
          </div>
        )}

        {/* Drop indicator when dragging over non-empty column */}
        {isDraggedOver && tasks.length > 0 && (
          <div className="text-center py-4 text-blue-600 bg-gray-100 rounded-lg border-2 border-blue-300 border-dashed">
            <p className="text-sm font-medium">Drop task here</p>
          </div>
        )}
      </div>
    </div>
  );
};