"use client";
import { TaskStatus } from "@/lib/task";
import { TaskCard } from "./TaskCard";
import { Badge } from "@/components/ui/badge";

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
  assignees: Array<{
    id: string;
    label: string;
  }>;
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
}

// Dynamic color assignment based on stage order/id
// Dynamic color assignment based on stage order/position
// Dynamic color assignment based on stage position in the array
const getStageColors = (stageIndex: number, stageName: string) => {
  // Assign specific colors based on stage position (0-based index)
  const stageColorsByPosition = [
    { color: "bg-slate-600", textColor: "text-white" },      // 1st stage (index 0)
    { color: "bg-blue-600", textColor: "text-white" },       // 2nd stage (index 1)
    { color: "bg-amber-600", textColor: "text-white" },      // 3rd stage (index 2)
    { color: "bg-purple-600", textColor: "text-white" },     // 4th stage (index 3)
    { color: "bg-green-600", textColor: "text-white" },      // 5th stage (index 4) - green
    { color: "bg-indigo-600", textColor: "text-white" },     // 6th stage (index 5)
    { color: "bg-pink-600", textColor: "text-white" },       // 7th stage (index 6)
    { color: "bg-red-600", textColor: "text-white" },        // 8th stage (index 7)
    { color: "bg-teal-600", textColor: "text-white" },       // 9th stage (index 8)
    { color: "bg-orange-600", textColor: "text-white" },     // 10th stage (index 9)
  ];

  // Use the stage index (position in array) to get the color
  const colorIndex = stageIndex % stageColorsByPosition.length;
  
  return stageColorsByPosition[colorIndex];
};

export const TaskColumn = ({ 
  stage, 
  tasks, 
  onEditTask, 
  onDeleteTask, 
  onTaskClick ,
  stageIndex 
}: TaskColumnProps & { stageIndex: number }) => {
  const stageColors = getStageColors(stageIndex, stage.name);
  
  return (
    <div className="flex-1 min-w-[260px] max-w-[320px] bg-gray-100">
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
      
      <div className="space-y-3 min-h-[500px] p-1.5">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
            onTaskClick={() => onTaskClick?.(task.id)}
          />
        ))}
        
        {tasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No tasks</p>
          </div>
        )}
      </div>
    </div>
  );
};