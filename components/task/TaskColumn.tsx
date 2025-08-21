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
      className="flex-shrink-0 min-w-[280px] max-w-[320px] bg-gray-50 rounded-xl border border-gray-200 shadow-sm transition-all duration-200 hover:shadow-md"
      data-stage-id={stage.id}
      data-stage-name={stage.name}
      style={{
        // Ensure smooth transitions and prevent layout shifts
        willChange: 'transform, box-shadow',
        transform: 'translateZ(0)', // Enable hardware acceleration
      }}
    >
      {/* Stage Header */}
      <div className="sticky top-0 z-10 bg-gray-50 rounded-t-xl border-b border-gray-200">
        <div className={`${stageColors.color} ${stageColors.textColor} px-4 py-3 rounded-t-xl flex items-center justify-between shadow-sm transition-all duration-200`}>
          <h2 className="font-semibold text-sm uppercase tracking-wide truncate">
            {stage.name}
          </h2>
          <Badge variant="secondary" className="bg-white/20 text-white border-white/30 flex-shrink-0 ml-2">
            {tasks.length}
          </Badge>
        </div>
      </div>
      
      {/* Tasks Container with Enhanced Scrolling */}
      <div 
        className={`h-[calc(100vh-280px)] min-h-[400px] p-3 transition-all duration-300 ease-in-out ${
          isDraggedOver 
            ? 'bg-blue-50/50 border-2 border-blue-300 border-dashed shadow-inner' 
            : 'bg-transparent'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDragEnter={handleDragEnter}
        onDrop={handleDrop}
        style={{
          // Smooth scrolling properties
          overflowY: 'auto',
          scrollBehavior: 'smooth',
          scrollbarWidth: 'thin',
          scrollbarColor: '#cbd5e1 #f1f5f9',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Custom Scrollbar Styles */}
        <style jsx>{`
          div::-webkit-scrollbar {
            width: 6px;
          }
          div::-webkit-scrollbar-track {
            background: transparent;
            border-radius: 3px;
          }
          div::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 3px;
            transition: background 0.2s ease;
          }
          div::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}</style>

        {/* Loading indicator */}
        {isUpdating && (
          <div className="flex items-center justify-center py-6 mb-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3 text-blue-700">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium">Moving task...</span>
            </div>
          </div>
        )}
        
        {/* Task cards with enhanced spacing and animations */}
        <div className="space-y-3">
          {tasks.map((task, index) => (
            <div
              key={task.id}
              className="transition-all duration-200 ease-in-out transform hover:scale-[1.02]"
              style={{
                // Stagger animation delay for smooth loading
                animationDelay: `${index * 50}ms`,
                willChange: 'transform, opacity',
              }}
            >
              <TaskCard
                task={task}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                onTaskClick={() => onTaskClick?.(task.id)}
                draggable={!isUpdating}
                isDragging={draggedTaskId === task.id}
                onDragStart={handleDragStart}
              />
            </div>
          ))}
        </div>
        
        {/* Empty state */}
        {tasks.length === 0 && !isUpdating && (
          <div className="text-center py-2">
            <div className=" rounded-xl p-8  transition-all duration-200 hover:border-gray-400">
             
              <p className="text-sm text-gray-500 mb-2">No tasks in this stage</p>
              {isDraggedOver && (
                <p className="text-sm text-blue-600 font-medium animate-pulse">
                  Drop task here
                </p>
              )}
            </div>
          </div>
        )}

        {/* Drop indicator when dragging over non-empty column */}
        {isDraggedOver && tasks.length > 0 && (
          <div className="mt-4 text-center py-6 text-blue-600 bg-blue-50 rounded-xl border-2 border-blue-300 border-dashed transition-all duration-200 animate-pulse">
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              <p className="text-sm font-medium">Drop task here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};